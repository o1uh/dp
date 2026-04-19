import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, BigInteger, Integer, Float, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from src.common.base_model import BaseModel
from src.common.enums import PaymentStatus, SubscriptionStatus

class Tariff(BaseModel):
    __tablename__ = "tariffs"

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    price_monthly: Mapped[float] = mapped_column(Numeric, default=0.0, nullable=False)
    quota_storage_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    max_track_duration_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    has_api_access: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Payment(BaseModel):
    __tablename__ = "payments"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tariff_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tariffs.id", ondelete="SET NULL"))
    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending)
    external_payment_id: Mapped[str | None] = mapped_column(String, unique=True)

class UsageLog(BaseModel):
    __tablename__ = "usage_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("processing_tasks.id", ondelete="SET NULL"))
    duration_sec_used: Mapped[float] = mapped_column(Float, default=0.0)
    storage_bytes_used: Mapped[int] = mapped_column(BigInteger, default=0)

class UserQuotaCurrent(BaseModel):
    __tablename__ = "user_quotas_current"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    period_start: Mapped[datetime] = mapped_column(nullable=False)
    period_end: Mapped[datetime] = mapped_column(nullable=False)
    storage_used_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    duration_used_sec: Mapped[float] = mapped_column(Float, default=0.0)

class UserSubscription(BaseModel):
    __tablename__ = "user_subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tariff_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tariffs.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(Enum(SubscriptionStatus), default=SubscriptionStatus.trialing)
    current_period_start: Mapped[datetime] = mapped_column(nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(nullable=False)