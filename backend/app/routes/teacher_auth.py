from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.teacher import Teacher

router = APIRouter(
    prefix="/teacher",
    tags=["Teacher Authentication"]
)


class TeacherLoginData(BaseModel):
    username: str
    password: str


class TeacherProfileUpdate(BaseModel):
    phone: str | None = None
    address: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# TEACHER LOGIN
@router.post("/login")
def teacher_login(
    data: TeacherLoginData,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == data.username,
        User.role == "teacher"
    ).first()

    if not user or user.password != data.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid teacher username or password"
        )

    # Ensure this account has a linked teacher profile
    teacher = db.query(Teacher).filter(
        Teacher.user_id == user.id
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=403,
            detail="No teacher profile is linked to this account"
        )

    # Start a fresh session for the teacher
    request.session.clear()
    request.session["teacher_id"] = user.id

    return {
        "message": "Teacher login successful",
        "teacher": {
            "user_id": user.id,
            "teacher_id": teacher.id,
            "username": user.username,
            "full_name": teacher.full_name,
            "email": teacher.email,
            "subject": teacher.subject
        }
    }


# TEACHER DASHBOARD
@router.get("/dashboard")
def teacher_dashboard(
    request: Request,
    db: Session = Depends(get_db)
):
    teacher_user_id = request.session.get("teacher_id")

    if teacher_user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in as a teacher first"
        )

    user = db.query(User).filter(
        User.id == teacher_user_id,
        User.role == "teacher"
    ).first()

    if not user:
        request.session.clear()
        raise HTTPException(
            status_code=401,
            detail="Invalid teacher session"
        )

    teacher = db.query(Teacher).filter(
        Teacher.user_id == user.id
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher profile not found"
        )

    return {
        "message": f"Welcome, {teacher.full_name}!",
        "teacher": {
            "id": teacher.id,
            "username": user.username,
            "full_name": teacher.full_name,
            "email": teacher.email,
            "employee_id": teacher.employee_id,
            "subject": teacher.subject
        }
    }


# TEACHER LOGOUT
@router.post("/logout")
def teacher_logout(request: Request):
    request.session.clear()

    return {
        "message": "Teacher logged out successfully"
    }


# TEACHER PROFILE UPDATE
@router.patch("/profile")
def update_teacher_profile(
    payload: TeacherProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    teacher_user_id = request.session.get("teacher_id")
    if teacher_user_id is None:
        raise HTTPException(status_code=401, detail="Please log in as a teacher")

    user = db.query(User).filter(User.id == teacher_user_id, User.role == "teacher").first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid teacher session")

    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    if payload.phone is not None:
        teacher.phone = payload.phone.strip() or None
    if payload.address is not None:
        teacher.address = payload.address.strip() or None

    db.commit()
    db.refresh(teacher)

    return {
        "message": "Profile updated successfully",
        "teacher": {
            "id": teacher.id,
            "username": user.username,
            "full_name": teacher.full_name,
            "email": teacher.email,
            "employee_id": teacher.employee_id,
            "subject": teacher.subject,
            "phone": teacher.phone,
            "address": teacher.address,
        },
    }


# TEACHER CHANGE PASSWORD
@router.post("/change-password")
def change_teacher_password(
    payload: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
):
    teacher_user_id = request.session.get("teacher_id")
    if teacher_user_id is None:
        raise HTTPException(status_code=401, detail="Please log in as a teacher")

    user = db.query(User).filter(User.id == teacher_user_id, User.role == "teacher").first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid teacher session")

    if user.password != payload.current_password:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")

    user.password = payload.new_password
    db.commit()

    return {"message": "Password changed successfully"}
