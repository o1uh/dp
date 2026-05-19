import pytest
import uuid
from unittest.mock import patch, AsyncMock
from src.core.exceptions import AccessDeniedError, BusinessRuleError
from src.modules.studio.services.state import save_session_state
from src.modules.studio.schemas import SessionSaveRequest, StudioTrackDTO
from src.common.enums import VisibilityStatus
from src.modules.library.models import UserStem

@pytest.mark.asyncio
async def test_validate_graph_access_denied():
    user_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    other_user_id = uuid.uuid4()
    
    data = SessionSaveRequest(
        project_name="Test",
        global_settings={},
        tracks=[
            StudioTrackDTO(
                track_index=0, volume=1.0, pan=0.0, is_muted=False, is_solo=False, 
                start_offset_ms=0, trim_start_ms=0, stem_id=str(uuid.uuid4())
            )
        ]
    )

    mock_stem = UserStem(
        id=uuid.UUID(data.tracks[0].stem_id),
        user_id=other_user_id,
        visibility=VisibilityStatus.private
    )

    with patch("src.modules.studio.services.state.UnitOfWork", autospec=True) as MockUoW:
        mock_uow_instance = MockUoW.return_value.__aenter__.return_value
        
        with patch("src.modules.studio.services.state.LibraryRepository", autospec=True) as MockLibRepo:
            mock_lib_repo = MockLibRepo.return_value
            mock_lib_repo.get_user_stem_by_id = AsyncMock(return_value=mock_stem)
            
            with pytest.raises(AccessDeniedError) as exc:
                await save_session_state(user_id, session_id, data)
            
            assert "Access denied to stem" in str(exc.value)

@pytest.mark.asyncio
async def test_validate_graph_business_rule_missing_ids():
    user_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    
    data = SessionSaveRequest(
        project_name="Test",
        global_settings={},
        tracks=[
            StudioTrackDTO(
                track_index=0, volume=1.0, pan=0.0, is_muted=False, is_solo=False, 
                start_offset_ms=0, trim_start_ms=0, stem_id=None, file_id=None
            )
        ]
    )

    with patch("src.modules.studio.services.state.UnitOfWork"), \
         patch("src.modules.studio.services.state.StudioRepository") as MockStudioRepo:
        
        mock_studio_repo = MockStudioRepo.return_value
        mock_studio_repo.get_session_by_id = AsyncMock(return_value=None)
        
        with pytest.raises(BusinessRuleError) as exc:
            await save_session_state(user_id, session_id, data)
            
        assert "Track must have either stem_id or file_id" in str(exc.value)