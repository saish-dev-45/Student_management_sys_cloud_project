
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.teacher import Teacher
from models.course import Course
from models.enrollment import Enrollment
from models.course_subject import CourseSubject
from models.timetable import Timetable

router = APIRouter(
    prefix="/admin/courses",
    tags=["Courses"]
)


class CourseCreate(BaseModel):
    course_name: str = Field(min_length=1, max_length=100)
    course_code: str = Field(min_length=1, max_length=30)
    description: str | None = None
    duration: str | None = Field(default=None, max_length=50)
    teacher_id: int | None = None


class CourseUpdate(BaseModel):
    course_name: str | None = Field(default=None, min_length=1, max_length=100)
    course_code: str | None = Field(default=None, min_length=1, max_length=30)
    description: str | None = None
    duration: str | None = Field(default=None, max_length=50)
    teacher_id: int | None = None


def verify_admin(request: Request, db: Session):
    admin_id = request.session.get("admin_id")

    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first() if admin_id is not None else None

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Please log in as admin first"
        )


def course_response(course: Course):
    return {
        "id": course.id,
        "course_name": course.course_name,
        "course_code": course.course_code,
        "description": course.description,
        "duration": course.duration,
        "teacher_id": course.teacher_id
    }


def validate_teacher(db: Session, teacher_id: int | None):
    if teacher_id is not None:
        teacher = db.query(Teacher).filter(
            Teacher.id == teacher_id
        ).first()

        if not teacher:
            raise HTTPException(
                status_code=404,
                detail="Teacher not found"
            )


# CREATE COURSE
@router.post("/")
def create_course(
    data: CourseCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    existing = db.query(Course).filter(
        Course.course_code == data.course_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Course code already exists"
        )

    validate_teacher(db, data.teacher_id)

    course = Course(**data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)

    return {
        "message": "Course created successfully",
        "course": course_response(course)
    }


# GET ALL COURSES
@router.get("/")
def get_courses(
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    courses = db.query(Course).order_by(Course.id.desc()).all()
    return [course_response(course) for course in courses]


# GET ONE COURSE
@router.get("/{course_id}")
def get_course(
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

    return course_response(course)


# UPDATE COURSE
@router.patch("/{course_id}")
def update_course(
    course_id: int,
    data: CourseUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    course = db.query(Course).filter(
        Course.id == course_id
    ).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    updates = data.model_dump(exclude_unset=True)

    if "course_code" in updates and updates["course_code"] is not None:
        duplicate = db.query(Course).filter(
            Course.course_code == updates["course_code"],
            Course.id != course_id
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="Course code already exists"
            )

    if "teacher_id" in updates:
        validate_teacher(db, updates["teacher_id"])

    for field, value in updates.items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)

    return {
        "message": "Course updated successfully",
        "course": course_response(course)
    }


# DELETE COURSE
@router.delete("/{course_id}")
def delete_course(
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

    try:
        # Remove linked enrollments, subjects, and timetable entries
        db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)
        db.query(CourseSubject).filter(CourseSubject.course_id == course_id).delete(synchronize_session=False)
        db.query(Timetable).filter(Timetable.course_id == course_id).delete(synchronize_session=False)

        db.delete(course)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete course: {str(exc)}"
        )

    return {"message": "Course deleted successfully"}

