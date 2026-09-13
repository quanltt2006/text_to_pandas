import os
from typing import Any

from ..core.config import settings

class LLMError(Exception):
    """Custom exception cho các lỗi liên quan tới LLM"""
    pass

def get_llm(provider: str = "groq", **kwargs) -> Any:
    """
    Hàm khởi tạo LLM instance dựa trên cấu hình.
    Hỗ trợ Groq, OpenAI...
    """
    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    
    if provider == "groq":
        try:
            from langchain_groq import ChatGroq
            return ChatGroq(
                model_name=kwargs.get("model", "openai/gpt-oss-120b"),
                groq_api_key=api_key
            )
        except ImportError:
            raise LLMError("Chưa cài đặt langchain-groq. Hãy chạy: pip install langchain-groq")
        except Exception as e:
            raise LLMError(f"Không thể khởi tạo Groq LLM: {str(e)}")
            
    elif provider == "openai":
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=kwargs.get("model", "gpt-4o-mini"),
                api_key=os.getenv("OPENAI_API_KEY")
            )
        except Exception as e:
            raise LLMError(f"Không thể khởi tạo OpenAI LLM: {str(e)}")
            
    else:
        raise LLMError(f"Provider '{provider}' không được hỗ trợ.")