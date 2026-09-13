"""Router Service - Semantic question routing using embeddings + small LLM

Pipeline:
1. Embed the user question and compare (cosine similarity) against a set of
   prototype questions for each route (code-gen / rag / general). This is fast
   and needs no LLM call.
2. If the best match is confident (above threshold + clear margin), return it.
3. Otherwise ask a small LLM to disambiguate between the candidate routes.
4. Hardcoded patterns are kept ONLY as a last-resort fallback when neither the
   embedder nor the LLM is available.
"""
from typing import Literal, List, Dict, Optional
from loguru import logger

from app.core.config import settings

RoutingType = Literal["rag", "code-gen", "general"]

# Absolute minimum similarity to trust the embedding decision
SIM_THRESHOLD = 0.28
# Minimum gap between best and second-best route to trust the embedding decision
MARGIN_THRESHOLD = 0.02


class QuestionRouter:
    """Route questions to RAG or Code-gen based on semantic similarity + LLM"""

    ROUTE_PROTOTYPES: Dict[RoutingType, List[str]] = {
        "code-gen": [
            "Bao nhiêu mẫu bị dự đoán sai?",
            "Có bao nhiêu dòng thiếu dữ liệu?",
            "Đếm số lượng đơn hàng theo tháng",
            "Tính tổng doanh thu năm nay",
            "Tính trung bình cột tuổi",
            "Tìm giá trị lớn nhất trong cột giá",
            "Top 10 khách hàng chi tiêu nhiều nhất",
            "Xem tỷ lệ phần trăm đơn hàng hoàn thành",
            "Lọc các bản ghi có giá trị null",
            "So sánh doanh thu giữa các nhóm",
            "Tính trung vị của cột điểm",
            "Nhóm theo loại sản phẩm rồi đếm",
            "Tính độ lệch chuẩn của cột lương",
            "Đếm số bản ghi bị phân loại sai",
            "Tìm các bản ghi trùng lặp",
        ],
        "rag": [
            "Cột này có ý nghĩa gì?",
            "Giải thích ý nghĩa cột default",
            "Dataset này nói về gì?",
            "Cột ngày sinh dùng để làm gì?",
            "Mô tả field predicted",
            "Tại sao dataset lại có cột này?",
            "Thông tin về cột is_staff",
            "Cột payment_type là gì?",
            "Nguồn gốc dữ liệu từ đâu?",
        ],
        "general": [
            "Xin chào",
            "Bạn có thể làm gì?",
            "Cảm ơn bạn",
            "Chào buổi sáng",
            "Hãy giới thiệu về bản thân bạn",
            "Trợ giúp tôi",
        ],
    }

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.client = None
        self.model = None
        self._embed = None
        self._proto_vectors: Optional[dict] = None
        self._init_llm()
        self._init_embedder()

    # ---------- Embedding side ----------

    def _init_embedder(self):
        """Initialize the local (offline) embedding function."""
        try:
            from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
            self._embed = DefaultEmbeddingFunction()
            # Pre-compute normalized prototype vectors once
            self._proto_vectors = {}
            for route, texts in self.ROUTE_PROTOTYPES.items():
                self._proto_vectors[route] = self._normalize(self._embed(texts))
            logger.info("QuestionRouter: embedding models loaded")
        except Exception as e:
            logger.warning(f"QuestionRouter: embedder init failed, patterns will be used: {e}")
            self._embed = None
            self._proto_vectors = None

    @staticmethod
    def _normalize(embeddings: List[list]) -> "object":
        import numpy as np
        arr = np.asarray(embeddings, dtype=np.float32)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return arr / norms

    def _embed_question(self, question: str) -> Optional["object"]:
        if self._embed is None:
            return None
        try:
            return self._normalize(self._embed([question]))[0]
        except Exception as e:
            logger.warning(f"QuestionRouter: failed to embed question: {e}")
            return None

    def _score_routes(self, q_vec) -> Dict[RoutingType, float]:
        """Max cosine similarity of the question to each route's prototypes."""
        scores = {}
        for route, protos in self._proto_vectors.items():
            scores[route] = float((protos @ q_vec).max())
        return scores

    def route_with_embeddings(self, question: str) -> RoutingType:
        """Route using embedding similarity only."""
        q_vec = self._embed_question(question)
        if q_vec is None:
            return self.route_with_patterns(question)

        scores = self._score_routes(q_vec)
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        best_route, best_score = ranked[0]
        second_score = ranked[1][1]

        if best_score >= SIM_THRESHOLD and (best_score - second_score) >= MARGIN_THRESHOLD:
            logger.info(f"QuestionRouter: embedding -> {best_route} (score={best_score:.3f}, margin={best_score - second_score:.3f})")
            return best_route

        logger.info(
            f"QuestionRouter: ambiguous {scores}, asking LLM"
        )
        return self.route_with_llm(question, default=best_route)

    # ---------- LLM side ----------

    def _init_llm(self):
        """Initialize small LLM client (groq / openai / anthropic)."""
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

        If the LLM is unavailable or returns an unusable (e.g. empty) answer,
        fall back to ``default`` when provided, else to the pattern matcher.
        """
        logger.info(f"QuestionRouter: routing with LLM: {question[:50]}...")

        prompt = f"""Classify this user question into exactly one category:

- "code-gen": questions that need a data computation (statistics, count, filter, group, sum, top/bottom, ratio, predictions comparison...)
- "rag": questions about the meaning, description, or context of the dataset or its columns
- "general": greetings, chit-chat, capability questions, anything unrelated to analyzing the data

Question: {question}

Reply with ONLY the category name: code-gen, rag, or general."""

        try:
            if self.client is None:
                raise RuntimeError("LLM client chưa được cấu hình")
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
        'trung bình', 'mean', 'average', 'tổng', 'sum', 'đếm', 'count',
        'lớn nhất', 'max', 'nhỏ nhất', 'min', 'top', 'bottom',
        'phân bố', 'distribution', 'nhóm', 'group', 'lọc', 'filter',
        'so sánh', 'compare', 'tỷ lệ', 'percentage', 'ratio',
        'bao nhiêu', 'how many', 'how much', 'tính', 'calculate', 'compute',
        'thống kê', 'statistics', 'dự đoán', 'sai', 'trùng', 'thiếu',
    ]

    RAG_PATTERNS = [
        'ý nghĩa', 'nghĩa là', 'có nghĩa', 'giải thích', 'explain',
        'mô tả', 'describe', 'là gì', 'what is', 'tại sao', 'why',
        'context', 'bối cảnh', 'thông tin về', 'information about',
        'dataset này', 'dữ liệu này', 'nói về', 'about',
        'column', 'cột', 'field', 'trường',
    ]

    def route_with_patterns(self, question: str) -> RoutingType:
        """Last-resort keyword routing (only when embedder and LLM are unavailable)."""
        q = question.lower()
        has_code_gen = any(p in q for p in self.CODE_GEN_PATTERNS)
        has_rag = any(p in q for p in self.RAG_PATTERNS)
        if has_code_gen:
            return "code-gen"
        if has_rag:
            return "rag"
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