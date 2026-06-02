import os
from fastapi import APIRouter, Depends, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.library.schemas import StemVisibilityUpdateDTO
from src.infrastructure.db.uow import UnitOfWork
from src.modules.library.repositories import LibraryRepository
from src.core.exceptions import NotFoundError, AccessDeniedError
from src.modules.processing.models import Stem
from sqlalchemy import select
from src.infrastructure.s3.presigned import generate_get_url

router = APIRouter(prefix="/stems", tags=["Library"])

@router.put("/{stem_id}/visibility", status_code=status.HTTP_200_OK)
async def update_stem_visibility(
    stem_id: str, 
    data: StemVisibilityUpdateDTO, 
    current_user: User = Depends(get_current_user)
):
    async with UnitOfWork() as uow:
        repo = LibraryRepository(uow.session)
        user_stem = await repo.get_user_stem_by_id(stem_id)
        
        if not user_stem:
            raise NotFoundError("Stem not found")
        if str(user_stem.user_id) != str(current_user.id):
            raise AccessDeniedError("Access denied")
            
        user_stem.visibility = data.visibility
        await uow.commit()
    return {"status": "updated"}

@router.get("/{stem_id}/download")
async def download_stem(stem_id: str, current_user: User = Depends(get_current_user)):
    async with UnitOfWork() as uow:
        lib_repo = LibraryRepository(uow.session)
        user_stem = await lib_repo.get_user_stem_by_id(stem_id)
        
        if not user_stem:
            raise NotFoundError("Stem not found")
        
        has_access = False
        
        if str(user_stem.user_id) == str(current_user.id):
            has_access = True
        elif user_stem.visibility.value == "public":
            has_access = True
        elif user_stem.track_id:
            from src.modules.library.models import Track, UserSavedTrack
            stmt_track = select(Track).where(Track.id == user_stem.track_id)
            track_obj = (await uow.session.execute(stmt_track)).scalar_one_or_none()
            if track_obj:
                if str(track_obj.user_id) == str(current_user.id):
                    has_access = True
                elif track_obj.visibility.value == "private":
                    has_access = False
                elif track_obj.visibility.value == "public":
                    has_access = True
                else:
                    stmt_saved = select(UserSavedTrack).where(
                        UserSavedTrack.user_id == current_user.id,
                        UserSavedTrack.track_id == track_obj.id
                    )
                    is_saved = (await uow.session.execute(stmt_saved)).scalar_one_or_none() is not None
                    if is_saved:
                        has_access = True

        if not has_access:
            raise AccessDeniedError("Access denied")

        stmt = select(Stem).where(Stem.id == user_stem.stem_id)
        result = await uow.session.execute(stmt)
        physical_stem = result.scalar_one_or_none()
        
        if not physical_stem:
            raise NotFoundError("Physical stem missing")

        user_stem.downloads_count += 1
        await uow.commit()

        ext = os.path.splitext(physical_stem.s3_key_mp3)[1]
        
        from src.modules.library.models import Track
        stmt_t = select(Track).where(Track.id == user_stem.track_id)
        track_obj = (await uow.session.execute(stmt_t)).scalar_one_or_none()
        track_title = track_obj.title if track_obj else "Stem"

        custom_filename = f"{track_title} - {physical_stem.stem_class}{ext}"

        url = await generate_get_url("audio-platform-uploads", physical_stem.s3_key_mp3, custom_filename=custom_filename)
        # url = await generate_get_url("audio-platform-uploads", physical_stem.s3_key_flac)
        return {"download_url": url}