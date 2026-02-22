import os
import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.book import Book
from ..models.bookmark import Bookmark
from ..models.user import User
from ..schemas.book import BookResponse, BookContentResponse, BookProgressUpdate, BookFavoriteUpdate, BookMetadataUpdate, BookmarkCreate, BookmarkUpdate, BookmarkResponse
from ..services.book import upload_book
from ..utils.security import get_current_user
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/api/books", tags=["books"])


@router.post("/upload", response_model=BookResponse)
async def upload(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = await upload_book(file, current_user.id, db, user_email=current_user.email)
    return book


@router.get("", response_model=list[BookResponse])
async def list_books(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.user_id == current_user.id).order_by(Book.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{book_id}/content", response_model=BookContentResponse)
async def get_content(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")

    file_path = os.path.join(UPLOAD_DIR, book.file_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    content = None
    async with aiofiles.open(file_path, "rb") as f:
        raw = await f.read()
    for encoding in ["utf-8", "gbk", "gb2312", "big5", "latin-1"]:
        try:
            content = raw.decode(encoding)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    if content is None:
        raise HTTPException(status_code=500, detail="无法读取文件内容")

    return BookContentResponse(
        id=book.id,
        title=book.title,
        author=book.author,
        content=content,
        current_page=book.current_page,
        total_pages=book.total_pages,
    )


@router.put("/{book_id}/progress", response_model=BookResponse)
async def update_progress(
    book_id: int,
    data: BookProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")

    book.current_page = data.current_page
    if data.total_pages is not None:
        book.total_pages = data.total_pages
    await db.commit()
    await db.refresh(book)
    return book


@router.put("/{book_id}/favorite", response_model=BookResponse)
async def toggle_favorite(
    book_id: int,
    data: BookFavoriteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")

    book.favorite = data.favorite
    await db.commit()
    await db.refresh(book)
    return book


@router.put("/{book_id}/metadata", response_model=BookResponse)
async def update_metadata(
    book_id: int,
    data: BookMetadataUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")

    if data.title is not None:
        book.title = data.title
    if data.author is not None:
        book.author = data.author
    if data.cover_url is not None:
        book.cover_url = data.cover_url
    await db.commit()
    await db.refresh(book)
    return book


@router.delete("/{book_id}")
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")

    # Delete file
    file_path = os.path.join(UPLOAD_DIR, book.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(book)
    await db.commit()
    return {"message": "删除成功"}


@router.post("/{book_id}/bookmarks", response_model=BookmarkResponse)
async def create_bookmark(
    book_id: int,
    data: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")

    bookmark = Bookmark(
        book_id=book_id,
        user_id=current_user.id,
        page=data.page,
        note=data.note or "",
    )
    db.add(bookmark)
    await db.commit()
    await db.refresh(bookmark)
    return bookmark


@router.get("/{book_id}/bookmarks", response_model=list[BookmarkResponse])
async def list_bookmarks(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bookmark)
        .where(Bookmark.book_id == book_id, Bookmark.user_id == current_user.id)
        .order_by(Bookmark.page.asc())
    )
    return result.scalars().all()


@router.put("/bookmarks/{bookmark_id}", response_model=BookmarkResponse)
async def update_bookmark(
    bookmark_id: int,
    data: BookmarkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bookmark).where(Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id)
    )
    bookmark = result.scalar_one_or_none()
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")

    bookmark.note = data.note
    await db.commit()
    await db.refresh(bookmark)
    return bookmark


@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bookmark).where(Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id)
    )
    bookmark = result.scalar_one_or_none()
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")

    await db.delete(bookmark)
    await db.commit()
    return {"message": "书签已删除"}
