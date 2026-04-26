from fastapi import APIRouter, Depends, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.users.schemas import UserProfileResponse, ProfileUpdateRequest, ChangePasswordRequest
from src.modules.users.services.profile import update_user_profile, change_user_password, soft_delete_user
from src.modules.rbac.repositories import RoleRepository
from src.infrastructure.db.session import async_session_maker

router = APIRouter(prefix="/me", tags=["Profile"])

@router.get("", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    role_name = None
    if current_user.role_id:
        async with async_session_maker() as session:
            repo = RoleRepository(session)
            role = await repo.get_by_id(str(current_user.role_id))
            if role:
                role_name = role.name

    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        profile_specialization=current_user.profile_specialization,
        role_name=role_name
    )

@router.put("", status_code=status.HTTP_200_OK)
async def update_profile(data: ProfileUpdateRequest, current_user: User = Depends(get_current_user)):
    await update_user_profile(str(current_user.id), data)
    return {"message": "Profile updated successfully"}

@router.put("/password", status_code=status.HTTP_200_OK)
async def change_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    await change_user_password(str(current_user.id), data)
    return {"message": "Password changed successfully"}

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(current_user: User = Depends(get_current_user)):
    await soft_delete_user(str(current_user.id))