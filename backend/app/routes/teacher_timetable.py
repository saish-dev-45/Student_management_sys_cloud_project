
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.teacher import Teacher
from models.timetable import Timetable


router = APIRouter(
    prefix="/teacher/timetable",
    tags=["Teacher Timetable"]
)


def get_logged_in_teacher(request: Request, db: Session):
    # Your teacher login stores the User.id in this session key.
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
        request.session.pop("teacher_id", None)
        raise HTTPException(
            status_code=401,
            detail="Invalid teacher session"
        )

    # Resolve the actual Teacher profile.
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
def get_my_timetable(
    request: Request,
    day_of_week: Optional[
        Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    ] = None,
    db: Session = Depends(get_db)
):
    teacher = get_logged_in_teacher(request, db)

    query = db.query(Timetable).filter(
        Timetable.teacher_id == teacher.id
    )

    if day_of_week:
        query = query.filter(
            Timetable.day_of_week == day_of_week
        )

    entries = query.all()

    # Display entries in weekday and period order.
    weekday_order = {
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 3,
        "Thursday": 4,
        "Friday": 5,
    }

    entries.sort(
        key=lambda entry: (
            weekday_order.get(entry.day_of_week, 6),
            entry.period_number
        )
    )

    from models.course import Course
    course_map = {c.id: c for c in db.query(Course).all()}

    return {
        "teacher": teacher.full_name,
        "total_periods": len(entries),
        "timetable": [
            {
                "id": entry.id,
                "standard": entry.standard,
                "course_id": entry.course_id,
                "course_code": (
                    course_map[entry.course_id].course_code
                    if entry.course_id in course_map
                    else None
                ),
                "course_name": (
                    course_map[entry.course_id].course_name
                    if entry.course_id in course_map
                    else None
                ),
                "day_of_week": entry.day_of_week,
                "period_number": entry.period_number,
                "start_time": entry.start_time.strftime("%H:%M"),
                "end_time": entry.end_time.strftime("%H:%M"),
                "subject": entry.subject,
                "room": entry.room,
            }
            for entry in entries
        ]
    }
