from fastapi import status

class AppException(Exception):
    def __init__(self, status_code: int, error_code: str, message: str):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message

class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, "NOT_FOUND", message)

class QuotaExceededError(AppException):
    def __init__(self, message: str = "Quota exceeded"):
        super().__init__(status.HTTP_403_FORBIDDEN, "QUOTA_EXCEEDED", message)

class AccessDeniedError(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(status.HTTP_403_FORBIDDEN, "ACCESS_DENIED", message)

class BusinessRuleError(AppException):
    def __init__(self, message: str):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, "BUSINESS_RULE_ERROR", message)