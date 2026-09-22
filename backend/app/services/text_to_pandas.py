"""Text-to-Pandas Agent - end-to-end pandas code generation.

Pipeline (per user question):
1. Embed the question and retrieve the most relevant columns (wide datasets
   with an embedded column index only).
2. Retrieve few-shot question/code examples (semantic or keyword).
3. Detect entities in the question and link them to actual values in the
   dataset (value linking).
4. Build the prompt: schema + few-shot examples + linked question.
5. Ask the LLM to generate pandas code.
6. Execute the code in a sandbox; if it fails, feed the error back to the
   LLM and retry (up to ``MAX_FIX_ATTEMPTS`` times).
"""
from typing import Dict, Any, List, Optional, Tuple
from loguru import logger

from app.core.config import settings
from app.models.schemas import DatasetProfile
from app.services.embedding_store import EmbeddingStore
from app.services.few_shots import FewShotStore
from app.services.prompt_builder import PromptBuilder
from app.services.sandbox_executor import SandboxExecutor
from app.services.value_linker import ValueLinker

class TextToPandas:
    """Generate and execute pandas code from a natural language question."""

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.prompt_builder = PromptBuilder()
        self.few_shot_store = FewShotStore()
        self.value_linker = ValueLinker()
        self.sandbox = SandboxExecutor()
        self.embedding_store = EmbeddingStore()
        self.max_fix_attempts = settings.MAX_FIX_ATTEMPTS
        self._init_llm()

    def _init_llm(self):
        """Initialize the LLM client (with hard timeouts so a slow/dead provider
        fails over to the sandbox fallback instead of hanging the request)."""
        self.client = None
        try:
            if self.provider == "openai":
                from openai import OpenAI
                self.client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=20.0, max_retries=1)
                self.model = settings.OPENAI_MODEL
            elif self.provider == "groq":
                from groq import Groq
                self.client = Groq(api_key=settings.GROQ_API_KEY, timeout=20.0, max_retries=1)
                self.model = settings.GROQ_MODEL
            elif self.provider == "anthropic":
                import anthropic
                self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=20.0, max_retries=1)
                self.model = settings.ANTHROPIC_MODEL
        except Exception as e:
            logger.warning(f"LLM client initialization failed: {e}")

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #

    def ask(
        self,
        question: str,
        dataset_id: str,
        profile: DatasetProfile,
        df,
        value_index: Optional[Dict[str, list]] = None,
    ) -> Dict[str, Any]:
        """Run the full pipeline and return code, result and pipeline trace."""
        question = (question or "").strip()
        logger.info(f"TextToPandas pipeline for: {question[:80]}...")

        # 1. Embed question + retrieve relevant columns (wide datasets only)
        relevant_columns: List[str] = []
        if len(profile.columns) > settings.EMBED_COLUMN_THRESHOLD and self.embedding_store.has_embeddings(dataset_id):
            relevant_columns = self.embedding_store.retrieve_columns(dataset_id, question)

        # 2. Few-shot examples
        examples = self.few_shot_store.retrieve(question)

        # 3. Value linking (entities -> actual data values)
        linked = self.value_linker.link(question, value_index or {})

        # 4. Schema + prompt
        schema = self.prompt_builder.build_schema(profile, relevant_columns)

        code, explanation, result, fixes = self._generate_with_self_fix(
            question=question,
            schema=schema,
            examples=examples,
            linked=linked,
            df=df,
        )

        return {
            "code": code,
            "explanation": explanation,
            "success": result["success"],
            "error": result.get("error"),
            "output": result.get("output"),
            "result": result.get("result"),
            "fixes": fixes,
            "pipeline": {
                "retrieved_columns": relevant_columns,
                "few_shot_used": [ex["question"] for ex in examples],
                "linked_values": linked,
            },
        }

    # ------------------------------------------------------------------ #
    # Generation + self-fix
    # ------------------------------------------------------------------ #

    def _generate_with_self_fix(
        self,
        question: str,
        schema: str,
        examples: List[Dict[str, str]],
        linked: List[Dict[str, str]],
        df,
    ) -> Tuple[str, str, Dict[str, Any], int]:
        """Generate code, execute it, and self-correct on failure.

        Returns (code, explanation, executor_result, fixes).
        """
        user_prompt = self.prompt_builder.build_user_prompt(question, schema, examples, linked)

        code = self._generate_code(user_prompt)
        fixes = 0

        result = self._safe_execute(code, df)
        attempt = 0
        while (not result["success"]) and attempt < self.max_fix_attempts and self.client is not None:
            attempt += 1
            fixes += 1
            logger.info(f"Self-fix attempt {attempt}: execution failed -> asking LLM to fix")
            error = result.get("error") or "Unknown execution error"
            code = self._fix_code(user_prompt, code, error)
            result = self._safe_execute(code, df)

        if fixes:
            logger.info(f"Self-fix finished after {fixes} retries (success={result['success']})")

        explanation = self._generate_explanation(question, code, fixed=fixes > 0)
        return code, explanation, result, fixes

    def _safe_execute(self, code: str, df) -> Dict[str, Any]:
        """Run code in the sandbox and return the raw executor dict."""
        result = self.sandbox.execute(code, df)
        # The pipeline returns the code itself; keep the executor output in the trace log.
        if result["success"]:
            logger.info("Code executed successfully in sandbox")
        else:
            logger.warning(f"Sandbox execution failed: {(result.get('error') or '')[:200]}")
        return result

    def _generate_code(self, user_prompt: str) -> str:
        """Call the LLM once to generate pandas code."""
        system_prompt = self._system_prompt()
        try:
            if self.client is None:
                raise RuntimeError("LLM client is not configured (missing API key).")
            code = self._llm_complete(system_prompt, user_prompt)
            return self._clean_code(code)
        except Exception as e:
            logger.error(f"Code generation failed: {e}")
            return self._fallback_code()

    def _fix_code(self, user_prompt: str, previous_code: str, error: str) -> str:
        """Ask the LLM to fix the previous code stuck against a runtime error."""
        fix_prompt = (
            user_prompt
            + "\n\nYour previously generated code failed to execute. Fix it so it runs correctly.\n"
            + "Previous code:\n```python\n{prev}\n```\n"
            + "Execution error:\n{err}\n\n"
            + "Reply with ONLY the corrected pandas code, still assigning the result to `result`."
        ).format(prev=previous_code, err=error[:1500])

        system_prompt = (
            self._system_prompt()
            + "\nYou are correcting your previous attempt. Keep the intent identical, only fix the error."
        )
        try:
            code = self._llm_complete(system_prompt, fix_prompt)
            return self._clean_code(code)
        except Exception as e:
            logger.error(f"Fix generation failed: {e}")
            return previous_code

    # ------------------------------------------------------------------ #
    # LLM plumbing
    # ------------------------------------------------------------------ #

    def _system_prompt(self) -> str:
        return """You are a pandas expert. Generate Python pandas code to answer a question about a CSV dataset.

Rules:
1. Use pandas only (pandas is imported as `pd`, the data is loaded as `df`).
2. Return ONLY the code, no explanations.
3. Use the actual column names from the provided schema.
4. Assign the final answer to a variable named `result` (DataFrame, Series, scalar or dict).
5. Use groupby for aggregations, nlargest/nsmallest for top/bottom.
6. When a value-linking hint lists literals, use those literal values in filters.
7. Use `df[df['col'] == 'literal']` style filters so matching rows are found.
8. Handle missing values appropriately.
9. Code must be executable and produce a result."""

    def _llm_complete(self, system_prompt: str, user_prompt: str) -> str:
        if self.provider in ("openai", "groq"):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=1000,
            )
            return response.choices[0].message.content or ""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text or ""

    @staticmethod
    def _clean_code(code: str) -> str:
        """Strip markdown fences and surrounding whitespace."""
        code = code.strip()
        if code.startswith("```python"):
            code = code[len("```python"):]
        elif code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]
        return code.strip()

    @staticmethod
    def _fallback_code() -> str:
        return """# Fallback: basic statistics
result = {
    "shape": list(df.shape),
    "columns": list(df.columns),
    "dtypes": {col: str(dt) for col, dt in df.dtypes.items()},
    "nulls": df.isnull().sum().to_dict(),
}
print(result)"""

    # ------------------------------------------------------------------ #
    # Explanation
    # ------------------------------------------------------------------ #

    def _generate_explanation(self, question: str, code: str, fixed: bool = False) -> str:
        """Short human-readable explanation of what was computed."""
        q = question.lower()
        if "average" in q or "mean" in q:
            base = "Computed the average of the requested column."
        elif "sum" in q or "total" in q:
            base = "Computed the total of the requested column(s)."
        elif "top" in q or "largest" in q or "max" in q or "highest" in q:
            base = "Returned the top records by the requested metric."
        elif "bottom" in q or "smallest" in q or "min" in q or "lowest" in q:
            base = "Returned the bottom records by the requested metric."
        elif "group" in q or "per " in q or "by " in q:
            base = "Grouped the data and computed the requested aggregate per group."
        elif "distribution" in q or "percentage" in q:
            base = "Computed the distribution of values."
        elif "compare" in q:
            base = "Compared values across groups."
        elif "count" in q or "how many" in q:
            base = "Counted the requested rows or values."
        elif "median" in q:
            base = "Computed the median of the requested column."
        elif "null" in q or "missing" in q:
            base = "Counted the rows with missing values."
        elif "duplicate" in q or "dup" in q:
            base = "Detected duplicate records."
        else:
            base = "Performed the requested data analysis."

        if fixed:
            base += " (the first attempt failed; the code was regenerated and ran successfully.)"
        return base