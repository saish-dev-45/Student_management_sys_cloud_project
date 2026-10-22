
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.teacher import Teacher
from models.course import Course

router = APIRouter(
    prefix="/teacher/courses",
    tags=["Teacher Courses"]
)


def get_logged_in_teacher(request: Request, db: Session):
    # Get the logged-in teacher's user ID
    user_id = request.session.get("teacher_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in as a teacher first"
        )

    # Verify that this account is a teacher
    user = db.query(User).filter(
        User.id == user_id,
        User.role == "teacher"
    ).first()

    if not user:
        request.session.pop("teacher_id", None)
        raise HTTPException(
            status_code=401,
            detail="Invalid teacher session"
        )

    # Find the teacher profile linked to this user
    teacher = db.query(Teacher).filter(
        Teacher.user_id == user.id
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher profile not found"
        )

    return teacher


@router.get("/")
def get_my_courses(
    request: Request,
    db: Session = Depends(get_db)
):
    teacher = get_logged_in_teacher(request, db)

    # Get only courses assigned to this teacher
    courses = db.query(Course).filter(
        Course.teacher_id == teacher.id
    ).all()

    return {
        "message": "Courses retrieved successfully",
        "teacher": teacher.full_name,
        "total_courses": len(courses),
        "courses": [
            {
                "id": course.id,
                "course_name": course.course_name,
                "course_code": course.course_code,
                "description": course.description,
                "duration": course.duration
            }
            for course in courses
        ]
    }


@router.get("/{course_id}")
def get_my_course(
    course_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    teacher = get_logged_in_teacher(request, db)

    # Find the requested course only if assigned to this teacher
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.teacher_id == teacher.id
    ).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found or not assigned to you"
        )

    return {
        "id": course.id,
        "course_name": course.course_name,
        "course_code": course.course_code,
        "description": course.description,
        "duration": course.duration
    }
