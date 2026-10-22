
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.sql import func
from database import Base


class TeacherLeaveRequest(Base):
    __tablename__ = "teacher_leave_requests"

    id = Column(Integer, primary_key=True, index=True)

    teacher_id = Column(
        Integer,
        ForeignKey("teachers.id"),
        nullable=False,
        index=True,
    )

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="Pending",
        server_default="Pending",
        index=True,
    )

    admin_remarks = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "end_date >= start_date",
            name="ck_teacher_leave_end_after_start",
        ),
        CheckConstraint(
            "status IN ('Pending', 'Approved', 'Rejected', 'On Hold')",
            name="ck_teacher_leave_valid_status",
        ),
    )
