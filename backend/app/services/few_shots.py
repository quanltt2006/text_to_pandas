"""Few-shot example store for text-to-pandas.

Examples are (natural question -> pandas code) pairs. At query time the user
question is embedded and compared against the example questions (cosine
similarity); the top-k examples are added to the prompt as few-shot
demonstrations. Falls back to keyword overlap if the embedder is unavailable.
"""
from typing import Dict, List, Optional
from loguru import logger

from app.core.config import settings
from app.services.embedder import embed_and_normalize, cosine_scores


class FewShotStore:
    """Curated question/code pairs covering the most common analysis intents."""

    EXAMPLES: List[Dict[str, str]] = [
        {
            "question": "What is the average price per category?",
            "code": (
                "result = df.groupby('category')['price'].mean().reset_index()\n"
                "print(result)"
            ),
        },
        {
            "question": "Show the top 10 products by total revenue",
            "code": (
                "result = (\n"
                "    df.assign(revenue=df['price'] * df['quantity'])\n"
                "    .groupby('name')['revenue'].sum()\n"
                "    .nlargest(10)\n"
                "    .reset_index()\n"
                ")\n"
                "print(result)"
            ),
        },
        {
            "question": "How many rows have null values in the email column?",
            "code": (
                "null_count = df['email'].isnull().sum()\n"
                "result = pd.DataFrame({'column': ['email'], 'null_rows': [null_count]})\n"
                "print(result)"
            ),
        },
        {
            "question": "How many orders were placed in 2024?",
            "code": (
                "count_2024 = (pd.to_datetime(df['date']).dt.year == 2024).sum()\n"
                "result = pd.DataFrame({'year': [2024], 'order_count': [count_2024]})\n"
                "print(result)"
            ),
        },
        {
            "question": "Compare total revenue across cities",
            "code": (
                "result = (\n"
                "    df.assign(revenue=df['price'] * df['quantity'])\n"
                "    .groupby('city')['revenue']\n"
                "    .agg(['sum', 'mean', 'count'])\n"
                "    .sort_values('sum', ascending=False)\n"
                "    .reset_index()\n"
                ")\n"
                "print(result)"
            ),
        },
        {
            "question": "What is the distribution of product categories?",
            "code": (
                "dist = df['category'].value_counts().reset_index()\n"
                "dist.columns = ['category', 'count']\n"
                "dist['percentage'] = (dist['count'] / df['category'].notna().sum() * 100).round(2)\n"
                "result = dist\n"
                "print(result)"
            ),
        },
        {
            "question": "Find duplicate records in the dataset",
            "code": (
                "dups = df[df.duplicated(keep=False)]\n"
                "result = pd.DataFrame({'duplicate_rows': [len(dups)]})\n"
                "print(result)"
            ),
        },
        {
            "question": "What is the median, min and max of the score column?",
            "code": (
                "result = df['score'].agg(['median', 'min', 'max']).reset_index()\n"
                "result.columns = ['metric', 'value']\n"
                "print(result)"
            ),
        },
        {
            "question": "How many records does category Electronics have?",
            "code": (
                "count = (df['category'] == 'Electronics').sum()\n"
                "result = pd.DataFrame({'category': ['Electronics'], 'count': [count]})\n"
                "print(result)"
            ),
        },
        {
            "question": "Show rows where rating is greater than 4",
            "code": (
                "result = df[df['rating'] > 4].head(20)\n"
                "print(result)"
            ),
        },
    ]

    def __init__(self):
        self._vectors = None
        self._init_index()

    def _init_index(self):
        """Pre-compute normalized vectors for all example questions once."""
        questions = [ex["question"] for ex in self.EXAMPLES]
        vectors = embed_and_normalize(questions)
        if vectors is None:
            logger.info("FewShotStore: semantic index unavailable, using keyword fallback")
            return
        self._vectors = vectors
        logger.info(f"FewShotStore: indexed {len(self.EXAMPLES)} examples semantically")

    def retrieve(self, question: str, k: Optional[int] = None) -> List[Dict[str, str]]:
        """Return the top-k most relevant question/code examples."""
        k = k or settings.FEW_SHOT_TOP_K
        question = (question or "").strip()
        if not question:
            return []

        if self._vectors is not None:
            q_vec = embed_and_normalize([question])
            if q_vec is not None:
                scores = cosine_scores(q_vec, self._vectors).flatten()
                top_idx = scores.argsort()[-k:][::-1]
                return [dict(self.EXAMPLES[i]) for i in top_idx]

        # Keyword fallback: score by token overlap on the question
        scored = []
        q_lower = question.lower()
        for ex in self.EXAMPLES:
            score = sum(1 for w in ex["question"].lower().split() if w in q_lower)
            scored.append((score, ex))
        scored.sort(key=lambda t: t[0], reverse=True)
        return [dict(ex) for score, ex in scored[:k] if score > 0]


__all__ = ["FewShotStore"]