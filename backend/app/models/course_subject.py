
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    UniqueConstraint
)

from database import Base


class CourseSubject(Base):
    __tablename__ = "course_subjects"

    id = Column(Integer, primary_key=True, index=True)

    course_id = Column(
        Integer,
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False
    )

    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "subject_id",
            name="uq_course_subject"
        ),
    )
