
from sqlalchemy import Column, Integer, String, Text
from database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)

    subject_name = Column(String(100), nullable=False)

    subject_code = Column(
        String(30),
        unique=True,
        nullable=False
    )

    description = Column(Text, nullable=True)
