
from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base


class Student(Base):
    __tablename__ = "students"

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
    roll_number = Column(String(30), unique=True, nullable=False)
    class_name = Column(String(50), nullable=False)
    address = Column(String(255), nullable=True)
