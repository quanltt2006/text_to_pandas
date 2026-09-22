"""Shared embedding helper.

Provides a single lazily-initialized, cached embedding function
(Chroma's default all-MiniLM-L6-v2, fully offline) so that the router,
the few-shot store and the value-linker reuse the same embedder
instead of loading the model per request.
"""
from typing import List, Optional
import numpy as np
from loguru import logger

_EMBEDDER = None


def get_embedder():
    """Return the cached embedder, or None if unavailable."""
    global _EMBEDDER
    if _EMBEDDER is None:
        try:
            from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
            _EMBEDDER = DefaultEmbeddingFunction()
            logger.info("Embedder loaded (Chroma default, all-MiniLM-L6-v2)")
        except Exception as e:
            logger.warning(f"Embedder unavailable, semantic retrieval will be skipped: {e}")
            _EMBEDDER = False
    return _EMBEDDER if _EMBEDDER is not False else None


def embed_texts(texts: List[str]) -> Optional[np.ndarray]:
    """Embed a list of texts into a float32 matrix, or None on failure."""
    emb = get_embedder()
    if emb is None or not texts:
        return None
    try:
        return np.asarray(emb(texts), dtype=np.float32)
    except Exception as e:
        logger.warning(f"Embedding failed: {e}")
        return None


def _normalize(vectors: np.ndarray) -> np.ndarray:
    arr = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


def cosine_scores(query, candidates) -> np.ndarray:
    """Cosine similarity between query vector(s) and candidate vectors.

    Returns (n_candidates, n_queries). A 1-D query is treated as one row.
    """
    q = np.asarray(query, dtype=np.float32)
    if q.ndim == 1:
        q = q.reshape(1, -1)
    c = np.asarray(candidates, dtype=np.float32)
    q = _normalize(q)
    c = _normalize(c)
    return c @ q.T


def embed_and_normalize(texts: List[str]) -> Optional[np.ndarray]:
    """Embed and L2-normalize a list of texts in one call (row = one text)."""
    vectors = embed_texts(texts)
    if vectors is None or len(vectors) == 0:
        return None
    return _normalize(vectors)