import os
import time
from typing import Optional
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict

# shortcut: HMAC-SHA256 with shared secret used for local offline development; production deployment requires RS256/ECDSA with local IdP public key
DEFAULT_SECRET = "phenora-local-dev-secret-offline-airgap"
JWT_SECRET = os.getenv("PHENORA_JWT_SECRET", DEFAULT_SECRET)
JWT_ALGORITHM = os.getenv("PHENORA_JWT_ALGORITHM", "HS256")
EXPECTED_ISSUER = os.getenv("PHENORA_JWT_ISSUER", "phenora-local-idp")
EXPECTED_AUDIENCE = os.getenv("PHENORA_JWT_AUDIENCE", "phenora-backend")

security = HTTPBearer(auto_error=False)


class AuthenticatedPrincipal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actor_id: str
    role: str
    issuer: str
    audience: str
    issued_at: int
    expires_at: int


def verify_token(token: str) -> AuthenticatedPrincipal:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=EXPECTED_ISSUER,
            audience=EXPECTED_AUDIENCE,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
        return AuthenticatedPrincipal(
            actor_id=payload["sub"],
            role=payload.get("role", "clinician"),
            issuer=payload["iss"],
            audience=payload["aud"],
            issued_at=payload.get("iat", int(time.time())),
            expires_at=payload["exp"],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthenticated", "message": "Token has expired"},
            headers={"Cache-Control": "no-store"},
        )
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthenticated", "message": "Invalid authentication token"},
            headers={"Cache-Control": "no-store"},
        )


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> AuthenticatedPrincipal:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthenticated", "message": "Missing bearer authentication token"},
            headers={"Cache-Control": "no-store"},
        )
    return verify_token(credentials.credentials)


def create_token(
    actor_id: str = "dev-operator-01",
    role: str = "clinician",
    expires_in_seconds: int = 3600,
    secret: str = JWT_SECRET,
) -> str:
    now = int(time.time())
    payload = {
        "sub": actor_id,
        "role": role,
        "iss": EXPECTED_ISSUER,
        "aud": EXPECTED_AUDIENCE,
        "iat": now,
        "exp": now + expires_in_seconds,
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)
