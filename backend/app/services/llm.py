import os
from typing import Any

from ..core.config import settings

class LLMError(Exception):
    """Custom exception raised for LLM-related failures."""
    pass

def get_llm(provider: str = "groq", **kwargs) -> Any:
    """
    Initialize an LLM instance based on the configuration.
    Supports Groq, OpenAI...
    """
    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")

    if provider == "groq":
        try:
            from langchain_groq import ChatGroq
            return ChatGroq(
                model_name=kwargs.get("model", "openai/gpt-oss-120b"),
                groq_api_key=api_key,
                timeout=20.0,
                max_retries=1,
            )
        except ImportError:
            raise LLMError("langchain-groq is not installed. Run: pip install langchain-groq")
        except Exception as e:
            raise LLMError(f"Could not initialize Groq LLM: {str(e)}")

    elif provider == "openai":
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=kwargs.get("model", "gpt-4o-mini"),
                api_key=os.getenv("OPENAI_API_KEY"),
                timeout=20.0,
                max_retries=1,
            )
        except Exception as e:
            raise LLMError(f"Could not initialize OpenAI LLM: {str(e)}")

    else:
        raise LLMError(f"Provider '{provider}' is not supported.")