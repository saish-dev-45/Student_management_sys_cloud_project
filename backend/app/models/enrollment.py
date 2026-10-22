
from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from database import Base


class Enrollment(Base):
    __tablename__ = "course_enrollments"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False
    )

    course_id = Column(
        Integer,
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False
    )

    enrolled_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "course_id",
            name="uq_student_course_enrollment"
        ),
    )
