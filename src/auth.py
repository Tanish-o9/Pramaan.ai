import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, Response

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "presence-ai-default-ultra-secure-jwt-secret-key-32chars")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")

def create_access_token(payload: dict) -> str:
    data = payload.copy()
    now = datetime.now(timezone.utc)
    data.update({
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    })
    return jwt.encode(data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(payload: dict) -> str:
    data = payload.copy()
    now = datetime.now(timezone.utc)
    data.update({
        "iat": now,
        "exp": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh"
    })
    return jwt.encode(data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired", headers={"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token", headers={"WWW-Authenticate": "Bearer"})

def set_auth_cookies(response: Response, user_id: int, role: str, extra: dict = None):
    payload = {"sub": f"{role}:{user_id}", "user_id": user_id, "role": role}
    if extra:
        payload.update(extra)

    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    # Access token cookie (15 mins)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/"
    )

    # Refresh token cookie (7 days)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/"
    )

    return access_token, refresh_token

def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax", secure=COOKIE_SECURE)
    response.delete_cookie(key="refresh_token", path="/", httponly=True, samesite="lax", secure=COOKIE_SECURE)

def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to Authorization header if provided
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required", headers={"WWW-Authenticate": "Bearer"})

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type", headers={"WWW-Authenticate": "Bearer"})

    return payload

def require_role(allowed_roles: list[str]):
    def dependency(user: dict = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient permissions")
        return user
    return dependency

require_teacher = require_role(["teacher"])
require_student = require_role(["student"])
require_any_user = require_role(["teacher", "student"])

