from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    author: Mapped[str] = mapped_column(String(100), default="未知作者")
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    md5: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    current_page: Mapped[int] = mapped_column(Integer, default=0)
    total_pages: Mapped[int] = mapped_column(Integer, default=0)
    cover_url: Mapped[Optional[str]] = mapped_column(String(500), default="", nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    owner = relationship("User", back_populates="books")
