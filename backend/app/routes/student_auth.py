from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.student import Student


router = APIRouter(
    prefix="/student",
    tags=["Student Authentication"]
)


class StudentLoginData(BaseModel):
    username: str
    password: str


class StudentProfileUpdate(BaseModel):
    phone: str | None = None
    address: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


def get_logged_in_student(request: Request, db: Session):
    # This session key stores the User.id.
    student_user_id = request.session.get("student_id")

    if student_user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in as a student first"
        )

    user = db.query(User).filter(
        User.id == student_user_id,
        User.role == "student"
    ).first()

    if not user:
        request.session.pop("student_id", None)
        raise HTTPException(
            status_code=401,
            detail="Invalid student session"
        )

    student = db.query(Student).filter(
        Student.user_id == user.id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )

    return user, student


@router.post("/login")
def student_login(
    data: StudentLoginData,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == data.username,
        User.role == "student"
    ).first()

    if not user or user.password != data.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid student username or password"
        )

    student = db.query(Student).filter(
        Student.user_id == user.id
    ).first()

    if not student:
        raise HTTPException(
            status_code=403,
            detail="No student profile is linked to this account"
        )

    # Clear any previous role session, then create student session.
    request.session.clear()
    request.session["student_id"] = user.id

    return {
        "message": "Student login successful",
        "student": {
            "user_id": user.id,
            "student_id": student.id,
            "username": user.username,
            "full_name": student.full_name,
            "email": student.email,
            "roll_number": student.roll_number,
            "class_name": student.class_name
        }
    }


@router.get("/dashboard")
def student_dashboard(
    request: Request,
    db: Session = Depends(get_db)
):
    user, student = get_logged_in_student(request, db)

    return {
        "message": f"Welcome, {student.full_name}!",
        "student": {
            "id": student.id,
            "username": user.username,
            "full_name": student.full_name,
            "email": student.email,
            "roll_number": student.roll_number,
            "class_name": student.class_name,
            "phone": student.phone,
            "address": student.address
        }
    }


@router.post("/logout")
def student_logout(request: Request):
    request.session.clear()

    return {
        "message": "Student logged out successfully"
    }


@router.patch("/profile")
def update_student_profile(
    payload: StudentProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    user, student = get_logged_in_student(request, db)

    if payload.phone is not None:
        student.phone = payload.phone.strip() or None
    if payload.address is not None:
        student.address = payload.address.strip() or None

    db.commit()
    db.refresh(student)

    return {
        "message": "Profile updated successfully",
        "student": {
            "id": student.id,
            "username": user.username,
            "full_name": student.full_name,
            "email": student.email,
            "roll_number": student.roll_number,
            "class_name": student.class_name,
            "phone": student.phone,
            "address": student.address,
        },
    }


@router.post("/change-password")
def change_student_password(
    payload: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
):
    user, _ = get_logged_in_student(request, db)

    if user.password != payload.current_password:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")

    user.password = payload.new_password
    db.commit()

    return {"message": "Password changed successfully"}
