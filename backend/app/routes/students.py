
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.student import Student

router = APIRouter(prefix="/admin/students", tags=["Students"])


class StudentCreate(BaseModel):
    full_name: str
    email: str
    phone: str | None = None
    roll_number: str
    class_name: str
    address: str | None = None


@router.post("/")
def create_student(
    data: StudentCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    admin_id = request.session.get("admin_id")

    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first() if admin_id is not None else None

    if not admin:
        raise HTTPException(status_code=401, detail="Admin login required")

    existing = db.query(Student).filter(
        (Student.email == data.email) |
        (Student.roll_number == data.roll_number)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email or roll number already exists"
        )

    student = Student(**data.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)

    return {
        "message": "Student created successfully",
        "student_id": student.id,
        "full_name": student.full_name
    }


class StudentUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    roll_number: str | None = None
    class_name: str | None = None
    address: str | None = None


def require_admin(request: Request, db: Session):
    admin_id = request.session.get("admin_id")
    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first() if admin_id is not None else None
    if not admin:
        raise HTTPException(status_code=401, detail="Admin login required")


def student_to_dict(s: Student):
    return {
        "id": s.id,
        "full_name": s.full_name,
        "email": s.email,
        "phone": s.phone,
        "roll_number": s.roll_number,
        "class_name": s.class_name,
        "address": s.address,
    }


def get_student_or_404(db: Session, student_id: int) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.get("/")
def list_students(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    students = db.query(Student).order_by(Student.id).all()
    return [student_to_dict(s) for s in students]


@router.get("/{student_id}")
def get_student(student_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    return student_to_dict(get_student_or_404(db, student_id))


@router.put("/{student_id}")
def update_student(
    student_id: int,
    data: StudentUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    require_admin(request, db)
    student = get_student_or_404(db, student_id)
    changes = data.model_dump(exclude_unset=True)

    for field in ("email", "roll_number"):
        if changes.get(field) is not None:
            clash = db.query(Student).filter(
                getattr(Student, field) == changes[field],
                Student.id != student_id
            ).first()
            if clash:
                raise HTTPException(
                    status_code=400,
                    detail="Email or roll number already exists"
                )

    for key, value in changes.items():
        if value is None and key in ("full_name", "email", "roll_number", "class_name"):
            continue  # required columns cannot be nulled
        setattr(student, key, value)

    db.commit()
    db.refresh(student)
    return {"message": "Student updated successfully", "student": student_to_dict(student)}


@router.delete("/{student_id}")
def delete_student(student_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    student = get_student_or_404(db, student_id)
    db.delete(student)
    db.commit()
    return {"message": "Student deleted successfully"}
