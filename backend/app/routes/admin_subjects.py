
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.subject import Subject

router = APIRouter(
    prefix="/admin/subjects",
    tags=["Admin Subjects"]
)


def verify_admin(request: Request, db: Session):
    admin_id = request.session.get("admin_id")

    admin = (
        db.query(User)
        .filter(User.id == admin_id, User.role == "admin")
        .first()
        if admin_id is not None else None
    )

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Please log in as admin first"
        )


class SubjectCreate(BaseModel):
    subject_name: str = Field(min_length=1, max_length=100)
    subject_code: str = Field(min_length=1, max_length=30)
    description: str | None = None


class SubjectUpdate(BaseModel):
    subject_name: str | None = Field(
        default=None, min_length=1, max_length=100
    )
    subject_code: str | None = Field(
        default=None, min_length=1, max_length=30
    )
    description: str | None = None


def subject_response(subject: Subject):
    return {
        "id": subject.id,
        "subject_name": subject.subject_name,
        "subject_code": subject.subject_code,
        "description": subject.description
    }


@router.post("/")
def create_subject(
    data: SubjectCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    existing = db.query(Subject).filter(
        Subject.subject_code == data.subject_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Subject code already exists"
        )

    subject = Subject(**data.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)

    return {
        "message": "Subject created successfully",
        "subject": subject_response(subject)
    }


@router.get("/")
def get_subjects(
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    subjects = db.query(Subject).order_by(
        Subject.subject_name
    ).all()

    return [subject_response(s) for s in subjects]


@router.get("/{subject_id}")
def get_subject(
    subject_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    subject = db.query(Subject).filter(
        Subject.id == subject_id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    return subject_response(subject)


@router.patch("/{subject_id}")
def update_subject(
    subject_id: int,
    data: SubjectUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    subject = db.query(Subject).filter(
        Subject.id == subject_id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    updates = data.model_dump(exclude_unset=True)

    if updates.get("subject_code") is not None:
        duplicate = db.query(Subject).filter(
            Subject.subject_code == updates["subject_code"],
            Subject.id != subject_id
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="Subject code already exists"
            )

    for field, value in updates.items():
        setattr(subject, field, value)

    db.commit()
    db.refresh(subject)

    return {
        "message": "Subject updated successfully",
        "subject": subject_response(subject)
    }


@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    subject = db.query(Subject).filter(
        Subject.id == subject_id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    db.delete(subject)
    db.commit()

    return {"message": "Subject deleted successfully"}
