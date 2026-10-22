
from sqlalchemy import (
    Column,
    Integer,
    String,
    Time,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint
)

from database import Base
import models.course
import models.teacher
import models.subject


class Timetable(Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)

    # Used for existing school-class timetables
    standard = Column(Integer, nullable=True, index=True)

    # Used for programme timetables, e.g. MCA or MBA
    course_id = Column(
        Integer,
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Link the period to a subject
    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="SET NULL"),
        nullable=True
    )

    day_of_week = Column(String(10), nullable=False)

    period_number = Column(Integer, nullable=False)

    # Keep for compatibility with existing timetable code
    subject = Column(String(100), nullable=False)

    teacher_id = Column(
        Integer,
        ForeignKey("teachers.id"),
        nullable=False
    )

    start_time = Column(Time, nullable=False)

    end_time = Column(Time, nullable=False)

    room = Column(String(50), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "standard",
            "day_of_week",
            "period_number",
            name="uq_timetable_standard_day_period"
        ),
        UniqueConstraint(
            "course_id",
            "day_of_week",
            "period_number",
            name="uq_timetable_course_day_period"
        ),
        CheckConstraint(
            "standard IS NULL OR standard > 0",
            name="ck_timetable_standard_positive"
        ),
        CheckConstraint(
            "period_number > 0",
            name="ck_timetable_period_positive"
        ),
        CheckConstraint(
            "end_time > start_time",
            name="ck_timetable_end_after_start"
        ),
        CheckConstraint(
            "day_of_week IN "
            "('Monday', 'Tuesday', 'Wednesday', "
            "'Thursday', 'Friday')",
            name="ck_timetable_weekday"
        ),
        CheckConstraint(
            "(standard IS NOT NULL AND course_id IS NULL) OR "
            "(standard IS NULL AND course_id IS NOT NULL)",
            name="ck_timetable_class_or_course"
        )
    )
