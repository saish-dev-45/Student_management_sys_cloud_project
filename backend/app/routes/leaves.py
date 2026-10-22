
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.leave_request import LeaveRequest
from models.student import Student
from models.users import User


student_router = APIRouter(prefix="/student/leaves", tags=["Student Leaves"])
admin_router = APIRouter(prefix="/admin/leaves", tags=["Admin Leaves"])


# ---------- Request schemas ----------

class LeaveCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=2000)


class LeaveDecision(BaseModel):
    status: str
    admin_remarks: str | None = Field(default=None, max_length=2000)


# ---------- Authentication helpers ----------

def get_current_student(request: Request, db: Session):
    student_user_id = request.session.get("student_id")

    if student_user_id is None:
        raise HTTPException(status_code=401, detail="Please log in as a student")

    user = db.query(User).filter(
        User.id == student_user_id,
        User.role == "student",
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid student session")

    student = db.query(Student).filter(
        Student.user_id == user.id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return student


def require_admin(request: Request):
    if request.session.get("admin_id") is None:
        raise HTTPException(status_code=401, detail="Admin login required")


def serialize_leave(leave: LeaveRequest):
    return {
        "id": leave.id,
        "student_id": leave.student_id,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "reason": leave.reason,
        "status": leave.status,
        "admin_remarks": leave.admin_remarks,
        "created_at": leave.created_at,
        "updated_at": leave.updated_at,
    }


# ---------- Student endpoints ----------

@student_router.post("/")
def apply_for_leave(
    payload: LeaveCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    student = get_current_student(request, db)

    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be before start date",
        )

    if not payload.reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Leave reason cannot be empty",
        )

    leave = LeaveRequest(
        student_id=student.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status="Pending",
    )

    db.add(leave)
    db.commit()
    db.refresh(leave)

    return {
        "message": "Leave request submitted successfully",
        "leave": serialize_leave(leave),
    }


@student_router.get("/")
def get_my_leave_requests(
    request: Request,
    db: Session = Depends(get_db),
):
    student = get_current_student(request, db)

    leaves = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.student_id == student.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )

    return [serialize_leave(leave) for leave in leaves]


# ---------- Admin endpoints ----------

@admin_router.get("/")
def get_all_leave_requests(
    request: Request,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    require_admin(request)

    query = db.query(LeaveRequest)

    if status is not None:
        allowed_statuses = ["Pending", "Approved", "Rejected", "On Hold"]

        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Status must be one of: {', '.join(allowed_statuses)}",
            )

        query = query.filter(LeaveRequest.status == status)

    leaves = query.order_by(LeaveRequest.created_at.desc()).all()

    results = []

    for leave in leaves:
        item = serialize_leave(leave)

        student = db.query(Student).filter(
            Student.id == leave.student_id
        ).first()

        item["student_name"] = student.full_name if student else None
        item["student_email"] = student.email if student else None

        results.append(item)

    return results


@admin_router.patch("/{leave_id}/decision")
def update_leave_decision(
    leave_id: int,
    payload: LeaveDecision,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request)

    allowed_statuses = ["Approved", "Rejected", "On Hold"]

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(allowed_statuses)}",
        )

    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id
    ).first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = payload.status
    leave.admin_remarks = (
        payload.admin_remarks.strip()
        if payload.admin_remarks and payload.admin_remarks.strip()
        else None
    )

    db.commit()
    db.refresh(leave)

    return {
        "message": f"Leave request {payload.status.lower()} successfully",
        "leave": serialize_leave(leave),
    }
