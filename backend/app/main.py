
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from database import Base, engine, SessionLocal
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


def seed_initial_admin():
    admin_user = os.getenv("ADMIN_USERNAME", "").strip()
    admin_pass = os.getenv("ADMIN_PASSWORD", "").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@school.edu").strip()

    if not admin_user or not admin_pass:
        return

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == admin_user).first()
        if not existing:
            new_admin = User(
                username=admin_user,
                email=admin_email,
                password=admin_pass,
                role="admin",
            )
            db.add(new_admin)
            db.commit()
            print(f"[Seed] Created initial admin account '{admin_user}'.")
        else:
            print(f"[Seed] Admin account '{admin_user}' already exists.")
    except Exception as e:
        print(f"[Seed] Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist and seed initial admin on startup
    try:
        Base.metadata.create_all(bind=engine)
        seed_initial_admin()
    except Exception as e:
        print(f"[Startup] Database setup warning: {e}")
    yield


app = FastAPI(title="Student Management System API", lifespan=lifespan)

# Session middleware (inner)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-secret-change-me"),
    session_cookie="admin_session",
    max_age=86400,
    same_site="lax",
    https_only=False,
)

# CORS middleware (outer, handles preflight requests)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
for origin in default_origins:
    if origin not in origins:
        origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.railway\.app|https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
