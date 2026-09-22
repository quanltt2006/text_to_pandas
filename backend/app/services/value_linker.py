"""Value linking for code generation.

Two pieces:
1. ValueIndexBuilder - built once at upload time. For every low-cardinality
   categorical column it stores the actual values present in the data so we
   can later link free-text entities back to real values.
2. ValueLinker - detects entity mentions in the user question and matches
   them against the indexed values (exact substring match first, then fuzzy
   token matching). The matched (column, value) pairs are injected into the
   prompt so the LLM writes filters with literal values that actually exist.
"""
import difflib
import re
from typing import Dict, List, Optional, Set
from loguru import logger

from app.core.config import settings
from app.models.schemas import DatasetProfile, DtypeEnum


class ValueIndexBuilder:
    """Build the categorical value index at upload time."""

    _INDEXABLE = {DtypeEnum.STRING, DtypeEnum.BOOLEAN, DtypeEnum.DATE}

    def __init__(self, max_unique: Optional[int] = None, max_values: Optional[int] = None):
        self.max_unique = max_unique or settings.VALUE_INDEX_MAX_UNIQUE
        self.max_values = max_values or settings.VALUE_INDEX_MAX_VALUES

    def build(self, df, profile: DatasetProfile) -> Dict[str, List[str]]:
        """Return {column_name: [actual string values, ...]} for indexable columns."""
        index: Dict[str, List[str]] = {}
        for col in profile.columns:
            if col.dtype not in self._INDEXABLE:
                continue
            if col.unique_count > self.max_unique:
                continue
            try:
                values = (
                    df[col.name]
                    .dropna()
                    .astype(str)
                    .map(str.strip)
                    .unique()
                    .tolist()
                )
            except Exception as e:
                logger.warning(f"Value index skipped column {col.name}: {e}")
                continue
            index[col.name] = values[: self.max_values]

        indexed = sum(len(v) for v in index.values())
        logger.info(f"Value index built: {len(index)} columns, {indexed} values")
        return index


class ValueLinker:
    """Match free-text entities in a question to actual data values."""

    # Skip value strings shorter than this to avoid spurious matches (e.g. "A")
    MIN_EXACT_LEN = 2
    MIN_FUZZY_LEN = 3
    # difflib cutoff for fuzzy token matching
    FUZZY_CUTOFF = 0.78
    # Cap on total matches returned per question
    MAX_MATCHES = 6

    def link(self, question: str, value_index: Dict[str, List[str]]) -> List[Dict[str, str]]:
        """Return a list of matched entities: [{column, value, method}]."""
        q = question.lower()
        matches: List[Dict[str, str]] = []
        seen: Set[tuple] = set()

        # 1. Exact substring matches
        for col, values in value_index.items():
            for v in values:
                nv = str(v).strip().lower()
                if len(nv) < self.MIN_EXACT_LEN or nv not in q:
                    continue
                key = (col, nv)
                if key not in seen:
                    seen.add(key)
                    matches.append({"column": col, "value": str(v), "method": "exact"})

        # 2. Fuzzy token matches (handles typos / loose phrasing)
        tokens = self._tokenize(q)
        for col, values in value_index.items():
            for v in values:
                nv = str(v).strip().lower()
                if len(nv) < self.MIN_FUZZY_LEN:
                    continue
                if (col, nv) in seen:
                    continue
                if difflib.get_close_matches(nv, tokens, n=1, cutoff=self.FUZZY_CUTOFF):
                    seen.add((col, nv))
                    matches.append({"column": col, "value": str(v), "method": "fuzzy"})

        matches = matches[: self.MAX_MATCHES]
        if matches:
            logger.info(f"Value linking matched {len(matches)} entities: {matches}")
        return matches

    def _tokenize(self, question: str) -> List[str]:
        # Keep word phrases of length >= 3 so fuzzy matching works on meaningful tokens
        words = re.findall(r"[A-Za-z0-9_]+", question)
        return [w for w in words if len(w) >= self.MIN_FUZZY_LEN]

    @staticmethod
    def annotate(question: str, matches: List[Dict[str, str]]) -> str:
        """Build a compact annotation block for the prompt from matched values."""
        if not matches:
            return ""
        lines = ["Values detected in the question (use these literals in filters):"]
        for m in matches:
            safe = str(m["value"]).replace("'", "\\'")
            lines.append(f"- column='{m['column']}' should match value '{safe}' [{m['method']}]")
        return "\n".join(lines)