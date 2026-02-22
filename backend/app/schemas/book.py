from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    md5: str
    favorite: bool
    current_page: int
    total_pages: int
    cover_url: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class BookContentResponse(BaseModel):
    id: int
    title: str
    author: str
    content: str
    current_page: int
    total_pages: int


class BookProgressUpdate(BaseModel):
    current_page: int
    total_pages: Optional[int] = None


class BookFavoriteUpdate(BaseModel):
    favorite: bool


class BookMetadataUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    cover_url: Optional[str] = None


class BookmarkCreate(BaseModel):
    page: int
    note: Optional[str] = ""


class BookmarkUpdate(BaseModel):
    note: str


class BookmarkResponse(BaseModel):
    id: int
    book_id: int
    user_id: int
    page: int
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}
