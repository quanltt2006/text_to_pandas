"""Upload API endpoints"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from loguru import logger
import uuid
import os
import json

from app.core.config import settings
from app.db.session import get_session, DatasetModel, ValueIndexModel
from app.services.csv_loader import CSVLoader, format_file_size
from app.services.profiler import Profiler
from app.services.schema_inference import build_inference
from app.services.embedding_store import EmbeddingStore
from app.services.value_linker import ValueIndexBuilder
from app.models.schemas import UploadResponse, DatasetProfile

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session)
):
    """Upload and process a CSV file."""
    logger.info(f"Uploading file: {file.filename}")

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate file size
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {format_file_size(file_size)}. Max: {settings.MAX_FILE_SIZE_MB}MB"
        )

    # Save file
    dataset_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{dataset_id}.csv")

    with open(file_path, 'wb') as f:
        f.write(content)

    logger.info(f"File saved: {file_path}")

    try:
        # Load and validate CSV
        loader = CSVLoader(file_path)
        loader.validate()

        # Load the data once for profiling + value indexing
        df = loader.load_pandas()

        # Profile dataset (schema: dtypes, head samples, nunique)
        profiler = Profiler(loader)
        profile = profiler.profile_dataset(dataset_id, file_path, df=df)

        # Infer dataset description with LLM
        try:
            inference = build_inference(profile)
            description = inference.get("dataset_description", "")
            profile.inferred_description = description
        except Exception as e:
            logger.warning(f"LLM inference failed: {e}")
            profile.inferred_description = (
                f"Dataset contains {profile.row_count:,} records across {profile.column_count} columns."
            )

        # Store in database
        db_dataset = DatasetModel(
            id=dataset_id,
            file_name=profile.file_name,
            file_path=profile.file_path,
            row_count=profile.row_count,
            column_count=profile.column_count,
            file_size=profile.file_size,
            file_size_bytes=profile.file_size_bytes,
            profile_json=json.loads(profile.model_dump_json()),
            inferred_description=profile.inferred_description
        )
        db.add(db_dataset)

        # Build + persist the categorical value index (for value linking later)
        value_index = ValueIndexBuilder().build(df, profile)
        if value_index:
            db.add(ValueIndexModel(
                id=str(uuid.uuid4()),
                dataset_id=dataset_id,
                data=value_index,
            ))

        await db.commit()

        # Embed columns only for wide datasets (retrieval stays cheap for small ones)
        if profile.column_count > settings.EMBED_COLUMN_THRESHOLD:
            try:
                embedding_store = EmbeddingStore()
                embedding_store.embed_schema(profile)
            except Exception as e:
                logger.warning(f"Embedding failed: {e}")
        else:
            logger.info(
                f"Dataset has {profile.column_count} columns (<= {settings.EMBED_COLUMN_THRESHOLD}); "
                "schema stays inline, no embedding index created"
            )

        logger.info(f"Dataset uploaded and processed: {dataset_id}")

        return UploadResponse(
            dataset_id=dataset_id,
            profile=profile,
            message=f"CSV uploaded successfully. {profile.row_count:,} rows, {profile.column_count} columns. "
                    f"Indexed {len(value_index)} categorical columns for value linking."
        )

    except Exception as e:
        # Cleanup on error
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error(f"Upload failed: {e}")
        try:
            await db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))