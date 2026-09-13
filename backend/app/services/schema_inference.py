import json
import re

from ..core.config import settings
from ..models.schemas import DatasetProfile
from .llm import LLMError

SYSTEM = """Bạn là chuyên gia dữ liệu. Nhiệm vụ: dựa vào thống kê mẫu của một file CSV,
suy đoán chủ đề của dataset và ý nghĩa của từng cột.

Trả về DUY NHẤT một JSON object dạng:
{
  "dataset_description": "mô tả ngắn dataset nói về gì",
  "columns": {
    "<tên cột>": {"description": "ý nghĩa cột", "category": "id|numeric|time|category|text|other"}
  }
}

Lưu ý:
- Đây là SUY ĐOÁN từ dữ liệu mẫu, dùng để gợi ý cho người dùng.
- Không bịa ra thông tin không suy luận được.
- Tên cột có thể là tiếng Việt không dấu hoặc tiếng Anh.
"""

_USER_TEMPLATE = """File CSV được tải lên có {row_count} dòng, {col_count} cột, kích thước {size_mb:.1f}MB.
Trạng thái profile (dựa trên {row_count} dòng):

Dưới đây là JSON yêu cầu (đánh dấu "{{json}}") chứa thống kê từng cột
(dtype, số giá trị unique, 5 giá trị mẫu):
{json_request}

Hãy phân tích và trả về JSON mô tả dataset + từng cột theo cấu trúc yêu cầu ở trên.
"""


def _complete(system_prompt: str, user_prompt: str) -> str:
    """Gọi LLM và trả về text phản hồi"""
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
        raise LLMError("LLM không trả về JSON hợp lệ.")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise LLMError(f"JSON từ LLM bị lỗi: {exc}") from exc


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
                "description": "Chưa suy đoán được.",
                "category": "other",
            }

    return {
        "dataset_description": parsed.get("dataset_description", ""),
        "disclaimer": "Mô tả trên là SUY ĐOÁN từ dữ liệu mẫu, vui lòng xác nhận trước khi dùng.",
        "columns": columns,
    }