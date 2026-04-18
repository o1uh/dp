import enum

class TaskStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    canceled = "canceled"

class FileProcessingStatus(str, enum.Enum):
    awaiting_upload = "awaiting_upload"
    uploaded = "uploaded"
    processing = "processing"
    ready = "ready"
    error = "error"

class VisibilityStatus(str, enum.Enum):
    private = "private"
    public = "public"
    unlisted = "unlisted"

class ActivityType(str, enum.Enum):
    new_release = "new_release"
    new_stem = "new_stem"
    new_project = "new_project"

class SubscriptionStatus(str, enum.Enum):
    active = "active"
    canceled = "canceled"
    past_due = "past_due"
    trialing = "trialing"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"