"""Router Service - semantic question routing using embeddings + small LLM

Pipeline:
1. Embed the user question and compare (cosine similarity) against prototype
   questions for each route (code-gen / rag / general). Fast, no LLM needed.
2. If the best match is confident (above threshold + clear margin), return it.
3. Otherwise ask a small LLM to disambiguate between the candidate routes.
4. Keyword patterns are kept ONLY as a last-resort fallback when neither the
   embedder nor the LLM is available.
"""
from typing import Literal, List, Dict, Optional
from loguru import logger

from app.core.config import settings
from app.services.embedder import embed_and_normalize, cosine_scores

RoutingType = Literal["rag", "code-gen", "general"]

# Absolute minimum similarity to trust the embedding decision
SIM_THRESHOLD = 0.28
# Minimum gap between best and second-best route to trust the embedding decision
MARGIN_THRESHOLD = 0.02


class QuestionRouter:
    """Route questions to RAG or Code-gen based on semantic similarity + LLM."""

    ROUTE_PROTOTYPES: Dict[RoutingType, List[str]] = {
        "code-gen": [
            "How many rows are mislabeled in the dataset?",
            "How many rows are missing data?",
            "Count the number of orders per month",
            "Calculate the total revenue this year",
            "Compute the average of the age column",
            "Find the maximum value in the price column",
            "Top 10 customers by total spend",
            "What percentage of orders are completed?",
            "Filter the rows that have null values",
            "Compare revenue across groups",
            "Compute the median of the score column",
            "Group by product type and then count",
            "Calculate the standard deviation of the salary column",
            "Count the records that were classified incorrectly",
            "Find the duplicate records",
            "Show rows where rating is greater than 4",
            "Sum the quantity column by category",
        ],
        "rag": [
            "What does this column mean?",
            "Explain the meaning of the default column",
            "What is this dataset about?",
            "What is the birth date column used for?",
            "Describe the predicted field",
            "Why does the dataset have this column?",
            "Tell me about the is_staff column",
            "What is the payment_type column?",
            "Where does the data come from?",
            "Describe the dataset schema",
        ],
        "general": [
            "Hello",
            "What can you do?",
            "Thank you",
            "Good morning",
            "Introduce yourself",
            "Help me please",
            "Goodbye",
        ],
    }

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.client = None
        self.model = None
        self._proto_vectors: Optional[dict] = None
        self._init_llm()
        self._init_embedder()

    # ---------- Embedding side ----------

    def _init_embedder(self):
        """Pre-compute normalized prototype vectors from the embedder."""
        try:
            self._proto_vectors = {}
            for route, texts in self.ROUTE_PROTOTYPES.items():
                vectors = embed_and_normalize(texts)
                if vectors is None:
                    raise RuntimeError("embedder returned no vectors")
                self._proto_vectors[route] = vectors
            logger.info("QuestionRouter: embedding prototypes loaded")
        except Exception as e:
            logger.warning(f"QuestionRouter: embedder init failed, patterns will be used: {e}")
            self._proto_vectors = None

    def _score_routes(self, q_vec) -> Dict[RoutingType, float]:
        """Max cosine similarity of the question to each route's prototypes."""
        scores = {}
        for route, protos in self._proto_vectors.items():
            scores[route] = float(cosine_scores(q_vec, protos).max())
        return scores

    def route_with_embeddings(self, question: str) -> RoutingType:
        """Route using embedding similarity only."""
        q_vec = embed_and_normalize([question])
        if q_vec is None or self._proto_vectors is None:
            return self.route_with_patterns(question)

        scores = self._score_routes(q_vec[0])
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        best_route, best_score = ranked[0]
        second_score = ranked[1][1]

        if best_score >= SIM_THRESHOLD and (best_score - second_score) >= MARGIN_THRESHOLD:
            logger.info(
                f"QuestionRouter: embedding -> {best_route} "
                f"(score={best_score:.3f}, margin={best_score - second_score:.3f})"
            )
            return best_route

        logger.info(f"QuestionRouter: ambiguous {scores}, asking LLM")
        return self.route_with_llm(question, default=best_route)

    # ---------- LLM side ----------

    def _init_llm(self):
        """Initialize the small LLM client (groq / openai / anthropic)."""
        try:
            if self.provider == "groq":
                from groq import Groq
                self.client = Groq(api_key=settings.GROQ_API_KEY)
                self.model = settings.GROQ_ROUTER_MODEL
            elif self.provider == "openai":
                from openai import OpenAI
                self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
                self.model = settings.OPENAI_MODEL
            elif self.provider == "anthropic":
                import anthropic
                self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                self.model = settings.ANTHROPIC_MODEL
        except Exception as e:
            logger.warning(f"QuestionRouter: LLM client init failed: {e}")
            self.client = None

    def route_with_llm(self, question: str, default: Optional[RoutingType] = None) -> RoutingType:
        """Ask a small LLM to classify the question into one of the three routes.

        If the LLM is unavailable or returns an unusable answer, fall back to
        ``default`` when provided, else to the pattern matcher.
        """
        logger.info(f"QuestionRouter: routing with LLM: {question[:50]}...")

        prompt = """Classify this user question into exactly one category:

- "code-gen": questions that need a data computation (statistics, count, filter, group, sum, top/bottom, ratio, predictions comparison...)
- "rag": questions about the meaning, description, or context of the dataset or its columns
- "general": greetings, chit-chat, capability questions, anything unrelated to analyzing the data

Question: {question}

Reply with ONLY the category name: code-gen, rag, or general.""".format(question=question)

        try:
            if self.client is None:
                raise RuntimeError("LLM client is not configured")
            if self.provider in ("groq", "openai"):
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=15,
                )
                result = (response.choices[0].message.content or "").strip().lower()
            else:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=15,
                    messages=[{"role": "user", "content": prompt}],
                )
                result = (response.content[0].text or "").strip().lower()

            if "code-gen" in result:
                return "code-gen"
            if "rag" in result:
                return "rag"
            if "general" in result:
                return "general"

            logger.warning(f"QuestionRouter: LLM returned unusable answer: {result!r}")
            return default or self.route_with_patterns(question)

        except Exception as e:
            logger.error(f"QuestionRouter: LLM routing failed: {e}")
            return default or self.route_with_patterns(question)

    # ---------- Legacy pattern fallback ----------

    CODE_GEN_PATTERNS = [
        'average', 'avg', 'mean', 'sum', 'total', 'count',
        'max', 'min', 'top', 'bottom', 'largest', 'smallest',
        'distribution', 'group', 'groupby', 'filter', 'compare',
        'percentage', 'percent', 'ratio', 'how many', 'how much',
        'calculate', 'compute', 'statistics', 'median', 'std',
        'null', 'missing', 'duplicate', 'duplicates', 'sort', 'rank',
        'orders by', 'show rows', 'filter rows',
    ]

    RAG_PATTERNS = [
        'meaning', 'means', 'explain', 'describe', 'what is', 'what does',
        'why', 'about', 'context', 'description', 'information about',
        'dataset', 'column', 'field', 'schema', 'represents', 'purpose',
        'source', 'origin',
    ]

    def route_with_patterns(self, question: str) -> RoutingType:
        """Last-resort keyword routing (only when embedder and LLM are unavailable)."""
        q = question.lower()
        has_code_gen = any(p in q for p in self.CODE_GEN_PATTERNS)
        has_rag = any(p in q for p in self.RAG_PATTERNS)
        if has_code_gen and not has_rag:
            return "code-gen"
        if has_rag and not has_code_gen:
            return "rag"
        if has_code_gen and has_rag:
            return "code-gen"
        return "general"

    # ---------- Public API ----------

    def route(self, question: str, use_llm: bool = False) -> RoutingType:
        """Route question with semantic embedding + LLM disambiguation."""
        question = (question or "").strip()
        if not question:
            return "general"
        if use_llm:
            return self.route_with_llm(question)
        if self._proto_vectors is not None:
            return self.route_with_embeddings(question)
        if self.client is not None:
            return self.route_with_llm(question)
        return self.route_with_patterns(question)