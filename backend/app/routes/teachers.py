
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.teacher import Teacher
from models.timetable import Timetable

router = APIRouter(prefix="/admin/teachers", tags=["Teachers"])


class TeacherCreate(BaseModel):
    full_name: str
    email: str
    phone: str | None = None
    employee_id: str
    subject: str
    address: str | None = None


@router.post("/")
def create_teacher(
    data: TeacherCreate,
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

    existing = db.query(Teacher).filter(
        (Teacher.email == data.email) |
        (Teacher.employee_id == data.employee_id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email or employee ID already exists"
        )

    teacher = Teacher(**data.model_dump())
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    return {
        "message": "Teacher created successfully",
        "teacher_id": teacher.id,
        "full_name": teacher.full_name
    }


class TeacherUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    employee_id: str | None = None
    subject: str | None = None
    address: str | None = None


def require_admin(request: Request, db: Session):
    admin_id = request.session.get("admin_id")
    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first() if admin_id is not None else None
    if not admin:
        raise HTTPException(status_code=401, detail="Admin login required")


def teacher_to_dict(t: Teacher):
    return {
        "id": t.id,
        "full_name": t.full_name,
        "email": t.email,
        "phone": t.phone,
        "employee_id": t.employee_id,
        "subject": t.subject,
        "address": t.address,
    }


def get_teacher_or_404(db: Session, teacher_id: int) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


@router.get("/")
def list_teachers(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    teachers = db.query(Teacher).order_by(Teacher.id).all()
    return [teacher_to_dict(t) for t in teachers]


@router.get("/{teacher_id}")
def get_teacher(teacher_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    return teacher_to_dict(get_teacher_or_404(db, teacher_id))


@router.put("/{teacher_id}")
def update_teacher(
    teacher_id: int,
    data: TeacherUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    require_admin(request, db)
    teacher = get_teacher_or_404(db, teacher_id)
    changes = data.model_dump(exclude_unset=True)

    for field in ("email", "employee_id"):
        if changes.get(field) is not None:
            clash = db.query(Teacher).filter(
                getattr(Teacher, field) == changes[field],
                Teacher.id != teacher_id
            ).first()
            if clash:
                raise HTTPException(
                    status_code=400,
                    detail="Email or employee ID already exists"
                )

    for key, value in changes.items():
        if value is None and key in ("full_name", "email", "employee_id", "subject"):
            continue  # required columns cannot be nulled
        setattr(teacher, key, value)

    db.commit()
    db.refresh(teacher)
    return {"message": "Teacher updated successfully", "teacher": teacher_to_dict(teacher)}


@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    teacher = get_teacher_or_404(db, teacher_id)
    if db.query(Timetable).filter(Timetable.teacher_id == teacher_id).first():
        raise HTTPException(
            status_code=409,
            detail="Teacher has timetable entries. Reassign or delete them first."
        )
    db.delete(teacher)
    db.commit()
    return {"message": "Teacher deleted successfully"}
