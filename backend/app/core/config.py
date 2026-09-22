"""Application configuration"""
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # LLM
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_ROUTER_MODEL: str = "qwen/qwen3.8-27b"
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/smart_csv.db"
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./data/chroma"

    # RAG / retrieval strategy
    # Only embed columns into the vector store when the dataset is wider than this
    EMBED_COLUMN_THRESHOLD: int = 30
    # Number of similar columns retrieved for a question (large datasets only)
    COLUMN_RETRIEVAL_TOP_K: int = 10
    # Max unique values a categorical column may have to be value-indexed
    VALUE_INDEX_MAX_UNIQUE: int = 500
    # Max values stored per indexed column (cap to keep the index small)
    VALUE_INDEX_MAX_VALUES: int = 200

    # Few-shot / self-fix
    FEW_SHOT_TOP_K: int = 3
    # Schema columns to inline directly into the code-gen prompt (below the embed threshold)
    SCHEMA_MAX_INLINE_COLUMNS: int = 30
    # Max retries to self-correct generated pandas code after a failed execution
    MAX_FIX_ATTEMPTS: int = 2

    # File Upload
    MAX_FILE_SIZE_MB: int = 50
    UPLOAD_DIR: str = "./data/uploads"
    
    # Sandbox
    SANDBOX_TIMEOUT_SECONDS: int = 30
    SANDBOX_MAX_MEMORY_MB: int = 256
    
    # Security
    SECRET_KEY: str = "change-this-to-a-random-secret-key"
    API_KEY_HEADER: str = "X-API-Key"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs("./data", exist_ok=True)
