from typing import Optional
from pydantic import BaseModel, EmailStr

class UserCreateRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    profile_specialization: Optional[str] = None
    role_name: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    bio: Optional[str] = None
    profile_specialization: Optional[str] = None
    avatar_url: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str