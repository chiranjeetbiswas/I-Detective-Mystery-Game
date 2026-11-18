"""Account routes: register, log in, and who am I. Guests never call these."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import User, get_db
from ..services.auth import (
    DUMMY_HASH,
    create_access_token,
    hash_password,
    verify_password,
)
from .deps import get_current_user

router = APIRouter(prefix="/auth")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field("", max_length=40)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    email: str
    display_name: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _out(user: User) -> UserOut:
    return UserOut(id=user.id, email=user.email, display_name=user.display_name)


def _normalize(email: str) -> str:
    return email.strip().lower()


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = _normalize(req.email)
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(409, "An account with this email already exists")
    user = User(
        email=email,
        display_name=req.display_name.strip() or email.split("@")[0][:40],
        password_hash=hash_password(req.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # two sign-ups with the same email at the same moment
        db.rollback()
        raise HTTPException(409, "An account with this email already exists")
    return AuthResponse(access_token=create_access_token(user.id), user=_out(user))


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == _normalize(req.email)))
    # Always run one password check, and give one error for both failures, so
    # nobody can use this route to find out which emails have accounts.
    ok = verify_password(req.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not ok:
        raise HTTPException(401, "Wrong email or password")
    return AuthResponse(access_token=create_access_token(user.id), user=_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _out(user)
