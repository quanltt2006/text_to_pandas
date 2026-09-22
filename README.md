# Text-to-Pandas

Ask questions in natural language, get pandas code + executed results for your CSV.

## Architecture

Upload-time indexing:
- Read schema (`df.dtypes`, `df.head()`, `df.nunique()`)
- `> 30 columns` → embed column metadata into ChromaDB for later retrieval
- Low-cardinality categorical columns → build a value index for value linking

Question-time pipeline:
- Embed the question
- Retrieve relevant columns (wide datasets) + few-shot examples
- Detect entities → link to the actual values in the data (exact / fuzzy match)
- Build the prompt: schema + examples + value-linked question
- LLM generates pandas code
- Sandbox execution + validation with self-correction on error

Everything in this project is English-only (UI, prompts, sample data).

## Backend

See `backend/README.md` for setup and run instructions.

## Frontend

```bash
npm install
npm run dev
```

## License

Private project.