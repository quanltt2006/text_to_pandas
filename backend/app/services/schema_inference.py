import json
import re

from ..core.config import settings
from ..models.schemas import DatasetProfile
from .llm import LLMError

SYSTEM = """You are a data expert. Task: based on the sample statistics of a CSV file,
infer the topic of the dataset and the meaning of each column.

Return ONLY a JSON object shaped like:
{
  "dataset_description": "short description of what the dataset is about",
  "columns": {
    "<column name>": {"description": "column meaning", "category": "id|numeric|time|category|text|other"}
  }
}

Notes:
- This is an INFERENCE from sample data, used to guide the user.
- Do not invent facts that cannot be inferred.
"""

_USER_TEMPLATE = """The uploaded CSV file has {row_count} rows, {col_count} columns, and is {size_mb:.1f}MB.
Profiling status (based on {row_count} rows):

Below is the requested JSON (marked with "{{json}}") containing per-column statistics
(dtype, number of unique values, 5 sample values):
{json_request}

Analyze it and return the JSON describing the dataset + each column per the structure above.
"""


def _complete(system_prompt: str, user_prompt: str) -> str:
    """Call the LLM and return the text response."""
    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=1000,
    )
    return response.choices[0].message.content or ""


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise LLMError("LLM did not return valid JSON.")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise LLMError(f"JSON from LLM is malformed: {exc}") from exc


def build_inference(profile: DatasetProfile) -> dict:
    json_request = {
        col.name: {
            "dtype": col.dtype,
            "unique": col.unique_count,
            "sample": col.sample_values[:5],
        }
        for col in profile.columns
    }
    user = _USER_TEMPLATE.format(
        row_count=profile.row_count,
        col_count=profile.column_count,
        size_mb=profile.file_size_bytes / 1024 / 1024,
        json_request=json.dumps(json_request, ensure_ascii=False),
    )
    raw = _complete(SYSTEM, user)
    parsed = _extract_json(raw)

    columns = parsed.get("columns", {})
    for col in profile.columns:
        if col.name not in columns:
            columns[col.name] = {
                "description": "Unable to infer.",
                "category": "other",
            }

    return {
        "dataset_description": parsed.get("dataset_description", ""),
        "disclaimer": "The description above is inferred from sample data; please confirm before relying on it.",
        "columns": columns,
    }