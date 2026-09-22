# Smart CSV Analyst - Backend

FastAPI backend with RAG + Text-to-Pandas Agent.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Environment Variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

Required:
- `GROQ_API_KEY` (or `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`)
- `DATABASE_URL` (default: local SQLite)

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Docs: http://localhost:8000/docs (Swagger UI)

## Architecture

Upload-time indexing:

```
Upload CSV → Read schema (df.dtypes, df.head(), df.nunique())
    ├─ > 30 columns → embed column metadata into ChromaDB (for retrieval)
    ├─ low-cardinality categorical columns → build value index (for value linking)
    └─ otherwise → keep schema inline in the code-gen prompt
```

Question-time pipeline:

```
User question
  → embed question
  → (wide datasets) retrieve relevant columns
  → retrieve few-shot question/code examples
  → detect entities → match to real data values (exact / fuzzy)
  → build prompt: schema + examples + value-linked question
  → LLM generates pandas code
  → sandbox execution + validate
  → on error → self-fix with the LLM (up to MAX_FIX_ATTEMPTS times)
```

## Features

- Upload & validate CSV (≤ 50MB MVP)
- Auto-profiling: dtype, null %, unique, statistics
- LLM schema inference (column meaning suggestions)
- User context editing (column descriptions)
- Conditional embedding index (only for wide datasets)
- Value linking (entities in the question matched to actual data values)
- Few-shot code generation from a curated English example bank
- Text-to-Pandas agent with self-correcting execution
- Sandbox execution safety
- Semantic question routing (RAG vs Code-gen)

## API Endpoints

- `POST /api/upload` — upload a CSV
- `GET /api/profile/{dataset_id}` — get profiling
- `PUT /api/context/{dataset_id}` — update column contexts
- `POST /api/chat/{dataset_id}` — ask a question
- `GET /api/datasets` — list datasets

## Tech Stack

- **Framework**: FastAPI
- **Data**: Pandas (small), DuckDB (large - future)
- **LLM**: Groq / OpenAI / Anthropic (configurable)
- **Vector DB**: ChromaDB (local)
- **Sandbox**: Restricted Python execution (pattern-based)
- **DB**: SQLite / PostgreSQL