from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from src.common.base_model import BaseModel

class Role(BaseModel):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

class Permission(BaseModel):
    __tablename__ = "permissions"

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

class RolePermission(BaseModel):
    __tablename__ = "role_permissions"

    role_id: Mapped[str] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[str] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)