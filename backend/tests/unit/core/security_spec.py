import pytest
from datetime import datetime, timedelta
import jwt
from src.core.security import hash_password, verify_password, create_access_token, decode_token
from src.core.config import settings

def test_password_hashing():
    password = "strongpassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_jwt_validation():
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    role_id = "987e6543-e21b-34d5-c678-426614174000"
    
    token = create_access_token(user_id, role_id)
    payload = decode_token(token)
    
    assert payload["sub"] == user_id
    assert payload["role_id"] == role_id
    assert "exp" in payload

def test_jwt_expired():
    expire = datetime.utcnow() - timedelta(minutes=1)
    payload = {"sub": "123", "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    
    with pytest.raises(ValueError, match="Token has expired"):
        decode_token(token)