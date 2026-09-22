"""Prompt builder for the text-to-pandas pipeline.

Turns the dataset schema, retrieved few-shot examples and the value-linked
question into a single well-structured prompt sent to the code-gen LLM.
"""
from typing import Dict, List, Optional
from loguru import logger

from app.core.config import settings
from app.models.schemas import DatasetProfile

class PromptBuilder:
    """Builds schema context and code-gen prompts."""

    def build_schema(
        self,
        profile: DatasetProfile,
        relevant_columns: Optional[List[str]] = None,
    ) -> str:
        """Render a compact schema block ordered by relevance."""
        cols = list(profile.columns)
        if relevant_columns:
            cols.sort(key=lambda c: 0 if c.name in relevant_columns else 1)

        inline = cols[: settings.SCHEMA_MAX_INLINE_COLUMNS]
        lines = []
        for c in inline:
            col_info = f"- `{c.name}` ({c.dtype.value})"
            if c.dtype.value == "number" and c.mean is not None:
                col_info += f" [range {c.min}-{c.max}, mean {c.mean}]"
            col_info += f" | samples: {', '.join(str(s) for s in c.sample_values[:3])}"
            lines.append(col_info)

        if len(cols) > len(inline):
            shown = ", ".join(c.name for c in inline[:10])
            lines.append(f"... and {len(cols) - len(inline)} more columns. Shown: {shown}")

        return "\n".join(lines)

    def build_few_shot_block(self, examples: List[Dict[str, str]]) -> str:
        """Render few-shot question/code demonstrations."""
        if not examples:
            return ""
        blocks = []
        for ex in examples:
            blocks.append(
                'Example question: "{q}"\n'
                "```python\n{code}\n```".format(q=ex["question"], code=ex["code"])
            )
        return "\n\n".join(blocks)

    @staticmethod
    def build_linked_block(linked: Optional[List[Dict[str, str]]]) -> str:
        """Render the value-linking annotation as instructions for the LLM."""
        if not linked:
            return ""
        lines = ["Value linking hints (verified against the actual data):"]
        for m in linked:
            val = str(m["value"]).replace("'", "\\'")
            lines.append(f'- Column "{m["column"]}" contains the literal value "{val}" '
                         f'(matched by {m["method"]} match in the question).')
        lines.append("Use these literal values in filters so no rows are missed.")
        return "\n".join(lines)

    def build_user_prompt(
        self,
        question: str,
        schema: str,
        examples: List[Dict[str, str]],
        linked: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Assemble the full user prompt for code generation."""
        parts = [
            f"Dataset: {schema}",
        ]

        if linked:
            parts.append(self.build_linked_block(linked))

        few_shot = self.build_few_shot_block(examples)
        if few_shot:
            parts.append("Follow the style of these examples when it fits:\n" + few_shot)

        parts.append(f"Question: {question}")
        parts.append("Generate pandas code to answer this question. "
                     "Assign the final result to a variable named `result`.")
        return "\n\n".join(parts)