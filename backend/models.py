from sqlalchemy import Column, String, Text, Date, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    line_user_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class Quest(Base):
    __tablename__ = "quests"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    original_deadline = Column(Date, nullable=True)
    final_deadline = Column(Date, nullable=True)
    diagnosis_result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    archived_at = Column(DateTime, nullable=True)

    checkpoints = relationship(
        "Checkpoint", back_populates="quest", cascade="all, delete-orphan"
    )

class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id = Column(String, primary_key=True, default=generate_uuid)
    quest_id = Column(String, ForeignKey("quests.id"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    order_index = Column(Integer, nullable=True)
    estimated_hours = Column(Integer, nullable=True)

    quest = relationship("Quest", back_populates="checkpoints")
