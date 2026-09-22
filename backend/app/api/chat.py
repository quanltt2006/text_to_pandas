"""Chat API endpoints - main Q&A interface.

Flow per question: embed -> retrieve columns/examples -> value-link ->
build prompt -> generate pandas -> execute + self-fix.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger
import uuid

from app.db.session import get_session, DatasetModel, ChatHistoryModel, ValueIndexModel
from app.services.csv_loader import CSVLoader
from app.services.router import QuestionRouter
from app.services.text_to_pandas import TextToPandas
from app.services.embedding_store import EmbeddingStore
from app.core.config import settings
from app.models.schemas import ChatRequest, ChatResponse, ChatMessage, DatasetProfile

router = APIRouter()

# Initialize services (singletons)
question_router = QuestionRouter()
text_to_pandas = TextToPandas()
embedding_store = EmbeddingStore()


# --------------------------------------------------------------------------- #
# RAG response helpers
# --------------------------------------------------------------------------- #

def _build_rag_response(question: str, contexts: list, profile: DatasetProfile) -> str:
    """Build a RAG response from retrieved contexts."""
    if not contexts:
        return _rag_from_profile(question, profile)

    response_lines = ["📚 **Retrieved context from the column index:**\n"]
    for ctx in contexts:
        meta = ctx.get('metadata', {}) or {}
        doc = ctx.get('document', '')
        if meta.get('type') == 'dataset':
            response_lines.append(f"📊 **Dataset overview:**\n{doc}")
        elif meta.get('type') == 'column':
            col_name = meta.get('column_name', '')
            response_lines.append(f"📋 **Column `{col_name}`:**\n{doc}")
    response_lines.append("\n💡 *Context was retrieved from the embedded schema index. "
                          "You can add per-column context for more accurate answers.*")
    return "\n".join(response_lines)


def _rag_from_profile(question: str, profile: DatasetProfile) -> str:
    """Static RAG fallback for datasets without an embedding index."""
    q = question.lower()

    # Specific column mentioned
    mentioned = [c for c in profile.columns if c.name.lower() in q]
    if mentioned:
        col = mentioned[0]
        lines = [f"📋 **Column `{col.name}`**\n"]
        lines.append(f"- **Type:** {col.dtype.value}")
        lines.append(f"- **Unique values:** {col.unique_count}")
        lines.append(f"- **Missing:** {col.null_percent}%")
        if col.sample_values:
            lines.append(f"- **Sample values:** {', '.join(col.sample_values[:5])}")
        if col.dtype.value == "number" and col.mean is not None:
            lines.append(f"- **Range:** {col.min} → {col.max}")
            lines.append(f"- **Mean:** {col.mean} • **Median:** {col.median}")
        return "\n".join(lines)

    # Generic overview
    return (
        f"📊 **Dataset overview: {profile.file_name}**\n\n"
        f"This dataset contains **{profile.row_count:,} records** across **{profile.column_count} columns**.\n\n"
        f"**Key structure:**\n"
        + "\n".join(
            f"- `{c.name}` ({c.dtype.value}): {c.unique_count} unique, {c.null_percent}% missing"
            for c in profile.columns[:30]
        )
        + "\n\n💡 *Ask about a specific column to get its details.*"
    )


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.post("/chat/{dataset_id}", response_model=ChatResponse)
async def chat(
    dataset_id: str,
    request: ChatRequest,
    db: AsyncSession = Depends(get_session)
):
    """Main chat endpoint - routes to RAG or Text-to-Pandas."""
    logger.info(f"Chat request for dataset {dataset_id}: {request.question[:50]}...")

    result = await db.execute(select(DatasetModel).where(DatasetModel.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    profile = DatasetProfile(**dataset.profile_json)

    # Load the value index (categorical value maps for value linking)
    idx_result = await db.execute(
        select(ValueIndexModel).where(ValueIndexModel.dataset_id == dataset_id)
    )
    value_index_model = idx_result.scalar_one_or_none()
    value_index = value_index_model.data if value_index_model else {}

    # Route question (semantic embedding + LLM disambiguation)
    route_type = question_router.route(request.question)
    logger.info(f"Routed to: {route_type}")

    message_id = str(uuid.uuid4())
    embedded = embedding_store.has_embeddings(dataset_id)

    if route_type == "rag":
        if embedded:
            contexts = embedding_store.query(dataset_id, request.question, n_results=3)
            content = _build_rag_response(request.question, contexts, profile)
        else:
            content = _rag_from_profile(request.question, profile)

        response_msg = ChatMessage(
            id=message_id,
            role="assistant",
            content=content,
            route_type="rag",
        )

    elif route_type == "code-gen":
        # Text-to-Pandas pipeline
        loader = CSVLoader(dataset.file_path)
        df = loader.load_pandas()

        outcome = text_to_pandas.ask(
            question=request.question,
            dataset_id=dataset_id,
            profile=profile,
            df=df,
            value_index=value_index,
        )

        if outcome["success"]:
            content = f"✅ **Text-to-Pandas Agent**\n\n{outcome['explanation']}\n\n"

            result_data = outcome.get("result")
            if result_data:
                if result_data.get("type") == "dataframe":
                    headers = result_data.get("headers", [])
                    rows = result_data.get("rows", [])
                    content += "📊 **Result preview:**\n"
                    content += f"\n```\n{headers}\n"
                    for row in rows[:10]:
                        content += f"{row}\n"
                    content += "```"
                elif result_data.get("type") == "series":
                    content += "📊 **Result:**\n"
                    content += "\n".join(f"`{k}`: {v}" for k, v in list(result_data.get("data", {}).items())[:15])
                elif result_data.get("type") == "dict":
                    content += "📊 **Result:**\n"
                    content += "\n".join(f"`{k}`: {v}" for k, v in list(result_data.get("data", {}).items())[:15])
                elif result_data.get("type") == "list":
                    content += f"**Result:** {result_data.get('data')}"
                elif result_data.get("type") == "number":
                    num = result_data.get("data")
                    content += f"\n**Result:** `{num:,.4f}`" if isinstance(num, float) else f"\n**Result:** `{num}`"
                elif result_data.get("type") == "string":
                    content += f"\n**Result:** {result_data.get('data')}"

            if outcome.get("output"):
                content += f"\n\n**Output:**\n```\n{outcome['output'][:500]}\n```"

            # Pipeline trace note (retrieved columns / linked values)
            trace = []
            pipe = outcome.get("pipeline", {})
            if pipe.get("retrieved_columns"):
                trace.append(f"retrieved {len(pipe['retrieved_columns'])} columns")
            if pipe.get("linked_values"):
                trace.append(f"linked {len(pipe['linked_values'])} values")
            if trace:
                content += f"\n\n🧠 *Pipeline: {', '.join(trace)}*"
            if outcome.get("fixes"):
                content += f"\n🔧 *Self-corrected {outcome['fixes']} time(s) after a failed run.*"
        else:
            content = (
                f"❌ **Code execution failed:**\n\n```\n{str(outcome.get('error'))[:1000]}\n```\n\n"
                "Try rephrasing your question."
            )

        response_msg = ChatMessage(
            id=message_id,
            role="assistant",
            content=content,
            code=outcome["code"],
            table_data=outcome.get("result") if outcome.get("success") else None,
            route_type="code-gen",
        )

    else:
        content = (
            "🤔 I understand your question. You can:\n\n"
            "1. **Ask about a column** → e.g. \"What does the `rating` column mean?\"\n"
            "2. **Request an analysis** → e.g. \"Compute the average of `price`\", \"Top 10 items\"\n"
            "3. **Compare / group** → e.g. \"Compare revenue across cities\"\n"
            "4. **Dataset overview** → e.g. \"What is this dataset about?\"\n\n"
            "Try one of the above!"
        )
        response_msg = ChatMessage(
            id=message_id,
            role="assistant",
            content=content,
            route_type="general",
        )

    # Persist chat history
    user_msg = ChatHistoryModel(
        id=str(uuid.uuid4()),
        dataset_id=dataset_id,
        role="user",
        content=request.question,
        route_type=route_type,
    )
    db.add(user_msg)

    assistant_msg = ChatHistoryModel(
        id=message_id,
        dataset_id=dataset_id,
        role="assistant",
        content=response_msg.content,
        code=response_msg.code,
        result_json=response_msg.table_data,
        route_type=route_type,
    )
    db.add(assistant_msg)
    await db.commit()

    return ChatResponse(message=response_msg, dataset_id=dataset_id)


@router.get("/chat/{dataset_id}/history", response_model=list[ChatMessage])
async def get_chat_history(dataset_id: str, db: AsyncSession = Depends(get_session)):
    """Get chat history for a dataset"""
    result = await db.execute(
        select(ChatHistoryModel)
        .where(ChatHistoryModel.dataset_id == dataset_id)
        .order_by(ChatHistoryModel.created_at.asc())
    )
    messages = result.scalars().all()

    return [
        ChatMessage(
            id=m.id,
            role=m.role,
            content=m.content,
            code=m.code,
            table_data=m.result_json,
            route_type=m.route_type,
            timestamp=m.created_at,
        )
        for m in messages
    ]