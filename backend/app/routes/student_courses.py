
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.course import Course
from models.teacher import Teacher
from models.enrollment import Enrollment
from routes.student_auth import get_logged_in_student

router = APIRouter(
    prefix="/student/courses",
    tags=["Student Courses"]
)


@router.get("/available")
def get_available_courses(
    request: Request,
    db: Session = Depends(get_db)
):
    user, student = get_logged_in_student(request, db)

    courses = db.query(Course).order_by(Course.course_name).all()

    enrolled_course_ids = {
        row.course_id
        for row in db.query(Enrollment.course_id)
        .filter(Enrollment.student_id == student.id)
        .all()
    }

    result = []

    for course in courses:
        teacher = None

        if course.teacher_id is not None:
            teacher = db.query(Teacher).filter(
                Teacher.id == course.teacher_id
            ).first()

        result.append({
            "id": course.id,
            "course_name": course.course_name,
            "course_code": course.course_code,
            "description": course.description,
            "duration": course.duration,
            "teacher_name": teacher.full_name if teacher else None,
            "is_enrolled": course.id in enrolled_course_ids
        })

    return {"courses": result}


@router.post("/{course_id}/enroll")
def enroll_in_course(
    course_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    user, student = get_logged_in_student(request, db)

    course = db.query(Course).filter(
        Course.id == course_id
    ).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )

    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.course_id == course_id
    ).first()

    if existing_enrollment:
        raise HTTPException(
            status_code=409,
            detail="You are already enrolled in this course"
        )

    enrollment = Enrollment(
        student_id=student.id,
        course_id=course.id
    )

    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return {
        "message": "Successfully enrolled in the course",
        "enrollment_id": enrollment.id,
        "course_id": course.id,
        "course_name": course.course_name
    }


@router.get("/my-courses")
def get_my_courses(
    request: Request,
    db: Session = Depends(get_db)
):
    user, student = get_logged_in_student(request, db)

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student.id
    ).order_by(Enrollment.enrolled_at.desc()).all()

    result = []

    for enrollment in enrollments:
        course = db.query(Course).filter(
            Course.id == enrollment.course_id
        ).first()

        if course:
            teacher = None

            if course.teacher_id is not None:
                teacher = db.query(Teacher).filter(
                    Teacher.id == course.teacher_id
                ).first()

            result.append({
                "enrollment_id": enrollment.id,
                "course_id": course.id,
                "course_name": course.course_name,
                "course_code": course.course_code,
                "description": course.description,
                "duration": course.duration,
                "teacher_name": teacher.full_name if teacher else None,
                "enrolled_at": enrollment.enrolled_at
            })

    return {"courses": result}
