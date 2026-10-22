
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.course import Course
from models.enrollment import Enrollment
from models.subject import Subject
from models.teacher import Teacher
from models.timetable import Timetable
from routes.student_auth import get_logged_in_student

router = APIRouter(
    prefix="/student/timetable",
    tags=["Student Timetable"]
)


@router.get("/programmes")
def get_enrolled_programmes(
    request: Request,
    db: Session = Depends(get_db)
):
    user, student = get_logged_in_student(request, db)

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student.id
    ).all()

    result = []

    for enrollment in enrollments:
        course = db.query(Course).filter(
            Course.id == enrollment.course_id
        ).first()

        if course:
            result.append({
                "course_id": course.id,
                "course_name": course.course_name,
                "course_code": course.course_code
            })

    return {"programmes": result}


@router.get("/{course_id}")
def get_student_timetable(
    course_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    user, student = get_logged_in_student(request, db)

    # The student must be enrolled in this programme.
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.course_id == course_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=403,
            detail="You are not enrolled in this programme"
        )

    course = db.query(Course).filter(
        Course.id == course_id
    ).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Programme not found"
        )

    rows = (
        db.query(Timetable, Teacher, Subject)
        .join(Teacher, Timetable.teacher_id == Teacher.id)
        .outerjoin(Subject, Timetable.subject_id == Subject.id)
        .filter(Timetable.course_id == course_id)
        .order_by(
            Timetable.period_number,
            Timetable.day_of_week
        )
        .all()
    )

    periods = []

    for timetable, teacher, subject in rows:
        periods.append({
            "id": timetable.id,
            "day_of_week": timetable.day_of_week,
            "period_number": timetable.period_number,
            "start_time": timetable.start_time.strftime("%H:%M"),
            "end_time": timetable.end_time.strftime("%H:%M"),
            "subject": (
                subject.subject_name
                if subject else timetable.subject
            ),
            "subject_id": timetable.subject_id,
            "teacher": teacher.full_name,
            "room": timetable.room
        })

    return {
        "course_id": course.id,
        "course_name": course.course_name,
        "course_code": course.course_code,
        "timetable": periods
    }
