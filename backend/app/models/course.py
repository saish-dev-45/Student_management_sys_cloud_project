from sqlalchemy import Column, Integer, String, Text, ForeignKey
from database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_name = Column(String(100), nullable=False)
    course_code = Column(String(30), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(String(50), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
