
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.course import Course
from models.subject import Subject
from models.course_subject import CourseSubject

router = APIRouter(
    prefix="/admin/courses",
    tags=["Course Subjects"]
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


@router.post("/{course_id}/subjects/{subject_id}")
def assign_subject(
    course_id: int,
    subject_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    course = db.query(Course).filter(
        Course.id == course_id
    ).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    subject = db.query(Subject).filter(
        Subject.id == subject_id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    existing = db.query(CourseSubject).filter(
        CourseSubject.course_id == course_id,
        CourseSubject.subject_id == subject_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Subject is already assigned to this course"
        )

    mapping = CourseSubject(
        course_id=course_id,
        subject_id=subject_id
    )

    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    return {
        "message": "Subject assigned to course successfully",
        "course_id": course_id,
        "subject_id": subject_id
    }


@router.get("/{course_id}/subjects")
def get_course_subjects(
    course_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    course = db.query(Course).filter(
        Course.id == course_id
    ).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    mappings = db.query(CourseSubject).filter(
        CourseSubject.course_id == course_id
    ).all()

    result = []

    for mapping in mappings:
        subject = db.query(Subject).filter(
            Subject.id == mapping.subject_id
        ).first()

        if subject:
            result.append({
                "id": subject.id,
                "subject_name": subject.subject_name,
                "subject_code": subject.subject_code,
                "description": subject.description
            })

    return {
        "course_id": course.id,
        "course_name": course.course_name,
        "subjects": result
    }


@router.delete("/{course_id}/subjects/{subject_id}")
def remove_subject_from_course(
    course_id: int,
    subject_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    mapping = db.query(CourseSubject).filter(
        CourseSubject.course_id == course_id,
        CourseSubject.subject_id == subject_id
    ).first()

    if not mapping:
        raise HTTPException(
            status_code=404,
            detail="Subject assignment not found"
        )

    db.delete(mapping)
    db.commit()

    return {"message": "Subject removed from course successfully"}
