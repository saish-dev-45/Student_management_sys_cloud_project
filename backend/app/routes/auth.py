from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.users import User

router = APIRouter(prefix="/admin", tags=["Admin Login"])


class LoginData(BaseModel):
    username: str
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
def admin_login(
    data: LoginData,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == data.username
    ).first()

    if (
        not user
        or user.password != data.password
        or user.role != "admin"
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )

    request.session.clear()
    request.session["admin_id"] = user.id

    return {"message": "Admin login successful"}


@router.get("/dashboard")
def admin_dashboard(
    request: Request,
    db: Session = Depends(get_db)
):
    admin_id = request.session.get("admin_id")

    if admin_id is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in first"
        )

    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first()

    if not admin:
        request.session.clear()
        raise HTTPException(
            status_code=401,
            detail="Invalid admin session"
        )

    return {"message": f"Welcome, {admin.username}!"}


@router.post("/logout")
def admin_logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}


@router.post("/change-password")
def admin_change_password(
    payload: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
):
    admin_id = request.session.get("admin_id")
    if admin_id is None:
        raise HTTPException(status_code=401, detail="Please log in first")

    admin = db.query(User).filter(User.id == admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin session")

    if admin.password != payload.current_password:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")

    admin.password = payload.new_password
    db.commit()

    return {"message": "Password changed successfully"}
