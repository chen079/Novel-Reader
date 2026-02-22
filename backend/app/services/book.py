import os
import hashlib
import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, UploadFile

from ..models.book import Book
from ..config import UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_EXTENSIONS


async def upload_book(file: UploadFile, user_id: int, db: AsyncSession, user_email: str = "") -> Book:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="只支持 .txt 或 .md 文件")

    content_bytes = await file.read()
    if len(content_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件太大，请上传小于 10MB 的文件")

    md5 = hashlib.md5(content_bytes).hexdigest()

    # Check if user already has this file
    result = await db.execute(
        select(Book).where(Book.user_id == user_id, Book.md5 == md5)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Try multiple encodings
    content = None
    for encoding in ["utf-8", "gbk", "gb2312", "big5", "latin-1"]:
        try:
            content = content_bytes.decode(encoding)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    if content is None:
        raise HTTPException(status_code=400, detail="无法识别文件编码")

    # Check if another user already uploaded the same file (cross-user dedup)
    cross_result = await db.execute(
        select(Book).where(Book.md5 == md5).limit(1)
    )
    cross_existing = cross_result.scalar_one_or_none()

    if cross_existing:
        # Reuse the existing file path
        safe_filename = cross_existing.file_path
    else:
        # Save file in email-based subdirectory
        email_dir = user_email or str(user_id)
        user_upload_dir = os.path.join(UPLOAD_DIR, email_dir)
        os.makedirs(user_upload_dir, exist_ok=True)

        safe_filename = os.path.join(email_dir, f"{md5}{ext}")
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content_bytes)

    title = os.path.splitext(file.filename or "未命名")[0]

    book = Book(
        user_id=user_id,
        title=title,
        author="未知作者",
        file_path=safe_filename,
        md5=md5,
    )
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book
