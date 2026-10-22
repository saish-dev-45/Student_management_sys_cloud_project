from datetime import time
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.teacher import Teacher
from models.course import Course
from models.subject import Subject
from models.timetable import Timetable


router = APIRouter(
    prefix="/admin/timetable",
    tags=["Admin Timetable"]
)


# Fixed school & programme periods.
PERIODS = {
    1: (time(9, 0), time(10, 0)),
    2: (time(10, 0), time(11, 0)),
    3: (time(11, 15), time(12, 15)),
    4: (time(12, 15), time(13, 15)),
    5: (time(14, 0), time(15, 0)),
    6: (time(15, 0), time(16, 0)),
}

WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
]


def require_admin(request: Request, db: Session):
    admin_id = request.session.get("admin_id")

    if admin_id is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in as an admin first"
        )

    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first()

    if not admin:
        request.session.pop("admin_id", None)
        raise HTTPException(
            status_code=401,
            detail="Invalid admin session"
        )

    return admin


class TimetableCreate(BaseModel):
    standard: Optional[int] = Field(default=None, gt=0)
    course_id: Optional[int] = Field(default=None, gt=0)
    subject_id: Optional[int] = Field(default=None, gt=0)
    day_of_week: Literal[
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
    ]
    period_number: int = Field(ge=1, le=6)
    subject: Optional[str] = Field(default=None, max_length=100)
    teacher_id: int = Field(gt=0)
    room: Optional[str] = Field(default=None, max_length=50)


class TimetableUpdate(TimetableCreate):
    pass


def validate_period(period_number: int):
    if period_number not in PERIODS:
        raise HTTPException(
            status_code=422,
            detail="Invalid period number. Choose a period from 1 to 6."
        )

    return PERIODS[period_number]


def check_conflicts(
    db: Session,
    data: TimetableCreate,
    exclude_id: Optional[int] = None
):
    start_time, end_time = validate_period(data.period_number)

    # Validate that either standard or course_id is provided, but not both.
    if (data.standard is not None and data.course_id is not None) or (
        data.standard is None and data.course_id is None
    ):
        raise HTTPException(
            status_code=422,
            detail="Please provide either standard (for school class) or course_id (for degree programme), but not both."
        )

    # Verify teacher exists
    teacher = db.query(Teacher).filter(
        Teacher.id == data.teacher_id
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher not found"
        )

    # Verify course if course_id provided
    if data.course_id is not None:
        course = db.query(Course).filter(
            Course.id == data.course_id
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    # Resolve and verify subject
    resolved_subject_name = data.subject.strip() if data.subject else None
    if data.subject_id is not None:
        subject_record = db.query(Subject).filter(
            Subject.id == data.subject_id
        ).first()
        if not subject_record:
            raise HTTPException(status_code=404, detail="Subject not found")
        if not resolved_subject_name:
            resolved_subject_name = subject_record.subject_name

    if not resolved_subject_name:
        raise HTTPException(
            status_code=422,
            detail="Subject name or a valid subject_id is required."
        )

    # Standard conflict check
    if data.standard is not None:
        standard_query = db.query(Timetable).filter(
            Timetable.standard == data.standard,
            Timetable.day_of_week == data.day_of_week,
            Timetable.start_time < end_time,
            Timetable.end_time > start_time
        )
        if exclude_id is not None:
            standard_query = standard_query.filter(Timetable.id != exclude_id)

        if standard_query.first():
            raise HTTPException(
                status_code=409,
                detail="This standard already has a class scheduled during that time."
            )

    # Course conflict check
    if data.course_id is not None:
        course_query = db.query(Timetable).filter(
            Timetable.course_id == data.course_id,
            Timetable.day_of_week == data.day_of_week,
            Timetable.start_time < end_time,
            Timetable.end_time > start_time
        )
        if exclude_id is not None:
            course_query = course_query.filter(Timetable.id != exclude_id)

        if course_query.first():
            raise HTTPException(
                status_code=409,
                detail="This course already has a lecture scheduled during that time."
            )

    # Teacher conflict check (teacher cannot be in two places at once)
    teacher_query = db.query(Timetable).filter(
        Timetable.teacher_id == data.teacher_id,
        Timetable.day_of_week == data.day_of_week,
        Timetable.start_time < end_time,
        Timetable.end_time > start_time
    )
    if exclude_id is not None:
        teacher_query = teacher_query.filter(Timetable.id != exclude_id)

    if teacher_query.first():
        raise HTTPException(
            status_code=409,
            detail="This teacher is already scheduled for another lecture during that time."
        )

    return start_time, end_time, resolved_subject_name


def timetable_response(entry: Timetable):
    return {
        "id": entry.id,
        "standard": entry.standard,
        "course_id": entry.course_id,
        "subject_id": entry.subject_id,
        "day_of_week": entry.day_of_week,
        "period_number": entry.period_number,
        "start_time": entry.start_time.strftime("%H:%M"),
        "end_time": entry.end_time.strftime("%H:%M"),
        "subject": entry.subject,
        "teacher_id": entry.teacher_id,
        "room": entry.room,
    }


@router.post("/")
def create_timetable_entry(
    data: TimetableCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    require_admin(request, db)

    start_time, end_time, resolved_subject_name = check_conflicts(db, data)

    entry = Timetable(
        standard=data.standard,
        course_id=data.course_id,
        subject_id=data.subject_id,
        day_of_week=data.day_of_week,
        period_number=data.period_number,
        subject=resolved_subject_name,
        teacher_id=data.teacher_id,
        start_time=start_time,
        end_time=end_time,
        room=data.room.strip() if data.room else None,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "message": "Timetable entry created successfully",
        "timetable": timetable_response(entry)
    }


@router.get("/")
def list_timetable(
    request: Request,
    standard: Optional[int] = None,
    course_id: Optional[int] = None,
    day_of_week: Optional[
        Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    ] = None,
    db: Session = Depends(get_db)
):
    require_admin(request, db)

    query = db.query(Timetable)

    if standard is not None:
        query = query.filter(Timetable.standard == standard)

    if course_id is not None:
        query = query.filter(Timetable.course_id == course_id)

    if day_of_week is not None:
        query = query.filter(Timetable.day_of_week == day_of_week)

    entries = query.all()

    # Sort weekday order and period number
    weekday_order = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5}
    entries.sort(key=lambda e: (
        weekday_order.get(e.day_of_week, 6),
        e.period_number
    ))

    return {
        "total_entries": len(entries),
        "timetable": [
            timetable_response(entry) for entry in entries
        ]
    }


@router.get("/{entry_id}")
def get_timetable_entry(
    entry_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    require_admin(request, db)

    entry = db.query(Timetable).filter(
        Timetable.id == entry_id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Timetable entry not found"
        )

    return timetable_response(entry)


@router.put("/{entry_id}")
def update_timetable_entry(
    entry_id: int,
    data: TimetableUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    require_admin(request, db)

    entry = db.query(Timetable).filter(
        Timetable.id == entry_id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Timetable entry not found"
        )

    start_time, end_time, resolved_subject_name = check_conflicts(
        db,
        data,
        exclude_id=entry_id
    )

    entry.standard = data.standard
    entry.course_id = data.course_id
    entry.subject_id = data.subject_id
    entry.day_of_week = data.day_of_week
    entry.period_number = data.period_number
    entry.subject = resolved_subject_name
    entry.teacher_id = data.teacher_id
    entry.start_time = start_time
    entry.end_time = end_time
    entry.room = data.room.strip() if data.room else None

    db.commit()
    db.refresh(entry)

    return {
        "message": "Timetable entry updated successfully",
        "timetable": timetable_response(entry)
    }


@router.delete("/{entry_id}")
def delete_timetable_entry(
    entry_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    require_admin(request, db)

    entry = db.query(Timetable).filter(
        Timetable.id == entry_id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Timetable entry not found"
        )

    db.delete(entry)
    db.commit()

    return {"message": "Timetable entry deleted successfully"}
