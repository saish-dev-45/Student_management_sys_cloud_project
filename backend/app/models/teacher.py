
from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=True
    )

    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    employee_id = Column(String(30), unique=True, nullable=False)
    subject = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
