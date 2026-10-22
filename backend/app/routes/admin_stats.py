from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.course import Course
from models.enrollment import Enrollment
from models.student import Student
from models.subject import Subject
from models.teacher import Teacher
from models.timetable import Timetable
from models.users import User

router = APIRouter(prefix="/admin/stats", tags=["Admin Statistics"])


def require_admin(request: Request, db: Session):
    admin_id = request.session.get("admin_id")
    admin = (
        db.query(User).filter(User.id == admin_id, User.role == "admin").first()
        if admin_id is not None
        else None
    )
    if not admin:
        raise HTTPException(status_code=401, detail="Admin login required")
    return admin


@router.get("/")
def get_admin_overview_stats(
    request: Request,
    db: Session = Depends(get_db),
):
    admin = require_admin(request, db)

    # 1. Total counts
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_teachers = db.query(func.count(Teacher.id)).scalar() or 0
    total_courses = db.query(func.count(Course.id)).scalar() or 0
    total_subjects = db.query(func.count(Subject.id)).scalar() or 0
    total_enrollments = db.query(func.count(Enrollment.id)).scalar() or 0
    total_timetable_slots = db.query(func.count(Timetable.id)).scalar() or 0
    total_accounts = db.query(func.count(User.id)).scalar() or 0

    # 2. Course-wise enrollment breakdown
    course_enrollment_counts = (
        db.query(
            Course.id,
            Course.course_name,
            Course.course_code,
            func.count(Enrollment.id).label("enrollment_count"),
        )
        .outerjoin(Enrollment, Course.id == Enrollment.course_id)
        .group_by(Course.id, Course.course_name, Course.course_code)
        .order_by(func.count(Enrollment.id).desc(), Course.course_name.asc())
        .limit(8)
        .all()
    )

    course_distribution = [
        {
            "course_id": c.id,
            "course_name": c.course_name,
            "course_code": c.course_code,
            "count": c.enrollment_count,
        }
        for c in course_enrollment_counts
    ]

    # 3. Recent enrollments
    recent_enrollments_records = (
        db.query(Enrollment, Student, Course)
        .join(Student, Enrollment.student_id == Student.id)
        .join(Course, Enrollment.course_id == Course.id)
        .order_by(Enrollment.enrolled_at.desc(), Enrollment.id.desc())
        .limit(6)
        .all()
    )

    recent_enrollments = [
        {
            "id": enr.id,
            "student_name": stu.full_name,
            "student_roll": stu.roll_number,
            "course_name": crs.course_name,
            "course_code": crs.course_code,
            "enrolled_at": (
                enr.enrolled_at.isoformat() if enr.enrolled_at else None
            ),
        }
        for enr, stu, crs in recent_enrollments_records
    ]

    # 4. Recent students
    recent_students = [
        {
            "id": s.id,
            "full_name": s.full_name,
            "roll_number": s.roll_number,
            "class_name": s.class_name,
            "email": s.email,
        }
        for s in db.query(Student).order_by(Student.id.desc()).limit(5).all()
    ]

    # 5. Recent teachers
    recent_teachers = [
        {
            "id": t.id,
            "full_name": t.full_name,
            "employee_id": t.employee_id,
            "subject": t.subject,
            "email": t.email,
        }
        for t in db.query(Teacher).order_by(Teacher.id.desc()).limit(5).all()
    ]

    return {
        "admin_user": admin.username,
        "counts": {
            "students": total_students,
            "teachers": total_teachers,
            "courses": total_courses,
            "subjects": total_subjects,
            "enrollments": total_enrollments,
            "timetable_slots": total_timetable_slots,
            "accounts": total_accounts,
        },
        "course_distribution": course_distribution,
        "recent_enrollments": recent_enrollments,
        "recent_students": recent_students,
        "recent_teachers": recent_teachers,
    }
