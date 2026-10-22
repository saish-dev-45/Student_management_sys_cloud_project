
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from database import Base, engine
from models.course import Course
from models.users import User
from models.student import Student
from models.teacher import Teacher
from models.timetable import Timetable
from models.enrollment import Enrollment
from models.subject import Subject
from models.course_subject import CourseSubject
from models.leave_request import LeaveRequest
from models.teacher_leave_request import TeacherLeaveRequest

from routes.auth import router as auth_router
from routes.students import router as students_router
from routes.teachers import router as teachers_routers
from routes.accounts import router as account_routers
from routes.courses import router as courses_router
from routes.teacher_auth import router as teacher_auth_router
from routes.teacher_courses import router as teacher_courses_router
from routes.timetable import router as timetables_router
from routes.teacher_timetable import router as teacher_timetable_router
from routes.student_auth import router as student_auth_router
from routes.student_courses import router as student_courses_router
from routes.admin_subjects import router as admin_subjects_router
from routes.admin_course_subjects import router as admin_course_subjects_router
from routes.student_timetable import router as student_timetable_router
from routes.admin_stats import router as admin_stats_router
from routes.leaves import (
    student_router as student_leaves_router,
    admin_router as admin_leaves_router,
)
from routes.teacher_leaves import (
    teacher_router as teacher_leaves_router,
    admin_router as admin_teacher_leaves_router,
)

load_dotenv()

app = FastAPI(title="Student Management System API")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-secret-change-me"),
    session_cookie="admin_session",
    max_age=3600,
    same_site="lax",
    https_only=False,
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(teachers_routers)
app.include_router(account_routers)
app.include_router(courses_router)
app.include_router(teacher_auth_router)
app.include_router(teacher_courses_router)
app.include_router(timetables_router)
app.include_router(teacher_timetable_router)
app.include_router(student_auth_router)
app.include_router(student_courses_router)
app.include_router(admin_subjects_router)
app.include_router(admin_course_subjects_router)
app.include_router(student_timetable_router)
app.include_router(admin_stats_router)
app.include_router(student_leaves_router)
app.include_router(admin_leaves_router)
app.include_router(teacher_leaves_router)
app.include_router(admin_teacher_leaves_router)

@app.get("/")
def root():
    return {"message": "Welcome to the Student Management System"}

@app.get("/api-root")
def api_root():
    return {"status": "ok"}
