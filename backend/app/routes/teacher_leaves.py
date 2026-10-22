
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.teacher_leave_request import TeacherLeaveRequest
from models.teacher import Teacher
from models.users import User


teacher_router = APIRouter(prefix="/teacher/leaves", tags=["Teacher Leaves"])
admin_router = APIRouter(prefix="/admin/teacher-leaves", tags=["Admin Teacher Leaves"])


# ---------- Schemas ----------

class LeaveCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=2000)


class LeaveDecision(BaseModel):
    status: str
    admin_remarks: str | None = Field(default=None, max_length=2000)


# ---------- Auth helpers ----------

def get_current_teacher(request: Request, db: Session):
    teacher_user_id = request.session.get("teacher_id")

    if teacher_user_id is None:
        raise HTTPException(status_code=401, detail="Please log in as a teacher")

    user = db.query(User).filter(
        User.id == teacher_user_id,
        User.role == "teacher",
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid teacher session")

    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    return teacher


def require_admin(request: Request):
    if request.session.get("admin_id") is None:
        raise HTTPException(status_code=401, detail="Admin login required")


def serialize_leave(leave: TeacherLeaveRequest):
    return {
        "id": leave.id,
        "teacher_id": leave.teacher_id,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "reason": leave.reason,
        "status": leave.status,
        "admin_remarks": leave.admin_remarks,
        "created_at": leave.created_at,
        "updated_at": leave.updated_at,
    }


# ---------- Teacher endpoints ----------

@teacher_router.post("/")
def apply_for_leave(
    payload: LeaveCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    teacher = get_current_teacher(request, db)

    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=400, detail="End date cannot be before start date"
        )

    if not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Leave reason cannot be empty")

    leave = TeacherLeaveRequest(
        teacher_id=teacher.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status="Pending",
    )

    db.add(leave)
    db.commit()
    db.refresh(leave)

    return {"message": "Leave request submitted successfully", "leave": serialize_leave(leave)}


@teacher_router.get("/")
def get_my_leave_requests(
    request: Request,
    db: Session = Depends(get_db),
):
    teacher = get_current_teacher(request, db)

    leaves = (
        db.query(TeacherLeaveRequest)
        .filter(TeacherLeaveRequest.teacher_id == teacher.id)
        .order_by(TeacherLeaveRequest.created_at.desc())
        .all()
    )

    return [serialize_leave(l) for l in leaves]


# ---------- Admin endpoints ----------

@admin_router.get("/")
def get_all_teacher_leaves(
    request: Request,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    require_admin(request)

    query = db.query(TeacherLeaveRequest)

    if status:
        allowed = ["Pending", "Approved", "Rejected", "On Hold"]
        if status not in allowed:
            raise HTTPException(
                status_code=400, detail=f"Status must be one of: {', '.join(allowed)}"
            )
        query = query.filter(TeacherLeaveRequest.status == status)

    leaves = query.order_by(TeacherLeaveRequest.created_at.desc()).all()

    results = []
    for leave in leaves:
        item = serialize_leave(leave)
        teacher = db.query(Teacher).filter(Teacher.id == leave.teacher_id).first()
        item["teacher_name"] = teacher.full_name if teacher else None
        item["teacher_email"] = teacher.email if teacher else None
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

    allowed = ["Approved", "Rejected", "On Hold"]
    if payload.status not in allowed:
        raise HTTPException(
            status_code=400, detail=f"Status must be one of: {', '.join(allowed)}"
        )

    leave = db.query(TeacherLeaveRequest).filter(TeacherLeaveRequest.id == leave_id).first()

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
