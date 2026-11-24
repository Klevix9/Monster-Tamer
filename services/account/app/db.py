import uuid

from sqlalchemy import Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True)
    password_hash: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    avatar: Mapped[str] = mapped_column(String, default="default")
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    # Unix timestamp: SQLite drops timezones from DateTime columns.
    locked_until: Mapped[int | None] = mapped_column(Integer, nullable=True)


def make_engine(path: str):
    return create_engine(f"sqlite:///{path}")