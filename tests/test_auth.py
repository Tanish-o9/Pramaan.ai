import pytest
from datetime import timedelta
from fastapi import HTTPException
from src.auth import (
    create_access_token, create_refresh_token, decode_token,
    require_role
)
from src.database.db import hash_pass, check_pass, is_default_pin

def test_password_hashing():
    pwd = "secretpassword123"
    hashed = hash_pass(pwd)
    assert hashed != pwd
    assert check_pass(pwd, hashed) is True
    assert check_pass("wrongpassword", hashed) is False

def test_default_pin_detection():
    # 1. None/empty stored pin is considered default 1234
    assert is_default_pin(None) is True
    assert is_default_pin("") is True

    # 2. Hashed 1234 is default
    hashed_default = hash_pass("1234")
    assert is_default_pin(hashed_default) is True

    # 3. Custom pin is NOT default
    hashed_custom = hash_pass("9876")
    assert is_default_pin(hashed_custom) is False

def test_jwt_access_and_refresh_tokens():
    payload = {"sub": "student:42", "user_id": 42, "role": "student"}
    access = create_access_token(payload)
    refresh = create_refresh_token(payload)

    assert isinstance(access, str)
    assert isinstance(refresh, str)

    decoded_access = decode_token(access)
    assert decoded_access["user_id"] == 42
    assert decoded_access["role"] == "student"
    assert decoded_access["type"] == "access"

    decoded_refresh = decode_token(refresh)
    assert decoded_refresh["user_id"] == 42
    assert decoded_refresh["type"] == "refresh"

def test_role_authorization_dependency():
    teacher_dep = require_role(["teacher"])
    student_dep = require_role(["student"])

    teacher_user = {"user_id": 1, "role": "teacher"}
    student_user = {"user_id": 2, "role": "student"}

    # Allowed
    assert teacher_dep(teacher_user) == teacher_user
    assert student_dep(student_user) == student_user

    # Forbidden
    with pytest.raises(HTTPException) as exc:
        teacher_dep(student_user)
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc2:
        student_dep(teacher_user)
    assert exc2.value.status_code == 403

