
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.student import Student
from models.teacher import Teacher

router = APIRouter(
    prefix="/admin/accounts",
    tags=["Accounts"]
)


class AccountCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5, max_length=100)
    password: str = Field(min_length=1, max_length=255)
    role: str

    full_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)

    # Student fields
    roll_number: str | None = Field(default=None, max_length=30)
    class_name: str | None = Field(default=None, max_length=50)

    # Teacher fields
    employee_id: str | None = Field(default=None, max_length=30)
    subject: str | None = Field(default=None, max_length=100)


def verify_admin(request: Request, db: Session):
    admin_id = request.session.get("admin_id")

    if admin_id is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in as admin first"
        )

    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin session"
        )


def account_response(user: User):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }


@router.post("/")
def create_account(
    data: AccountCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    if data.role not in ["student", "teacher"]:
        raise HTTPException(
            status_code=400,
            detail="Role must be student or teacher"
        )

    if data.role == "student":
        if not data.roll_number or not data.class_name:
            raise HTTPException(
                status_code=400,
                detail="Students require roll_number and class_name"
            )

    if data.role == "teacher":
        if not data.employee_id or not data.subject:
            raise HTTPException(
                status_code=400,
                detail="Teachers require employee_id and subject"
            )

    existing_user = db.query(User).filter(
        (User.username == data.username) |
        (User.email == data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )

    try:
        # Create login account
        user = User(
            username=data.username,
            email=data.email,
            password=data.password,
            role=data.role
        )

        db.add(user)
        db.flush()  # Assigns user.id without committing

        # Create the matching profile
        if data.role == "student":
            profile = Student(
                user_id=user.id,
                full_name=data.full_name,
                email=data.email,
                phone=data.phone,
                roll_number=data.roll_number,
                class_name=data.class_name,
                address=data.address
            )
        else:
            profile = Teacher(
                user_id=user.id,
                full_name=data.full_name,
                email=data.email,
                phone=data.phone,
                employee_id=data.employee_id,
                subject=data.subject,
                address=data.address
            )

        db.add(profile)
        db.commit()
        db.refresh(user)

        return {
            "message": "Account and profile created successfully",
            "account": account_response(user),
            "profile_id": profile.id
        }

    except Exception:
        db.rollback()
        raise


@router.get("/")
def get_accounts(
    request: Request,
    db: Session = Depends(get_db)
):
    verify_admin(request, db)

    users = db.query(User).filter(
        User.role.in_(["student", "teacher"])
    ).order_by(User.id.desc()).all()

    return [account_response(user) for user in users]
