from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from .config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate: add cover_url column if missing
        try:
            await conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE books ADD COLUMN cover_url VARCHAR(500) DEFAULT ''"
                )
            )
        except Exception:
            pass  # Column already exists
