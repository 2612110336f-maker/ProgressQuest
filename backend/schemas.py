from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class CheckpointCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    order_index: Optional[int] = None

class CheckpointUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    order_index: Optional[int] = None
    completed: Optional[bool] = None

class CheckpointOut(BaseModel):
    id: str
    quest_id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    order_index: Optional[int] = None

    class Config:
        from_attributes = True

class QuestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    original_deadline: Optional[date] = None
    final_deadline: Optional[date] = None

class QuestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    original_deadline: Optional[date] = None
    final_deadline: Optional[date] = None
    diagnosis_result: Optional[Any] = None

class QuestOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    original_deadline: Optional[date] = None
    final_deadline: Optional[date] = None
    diagnosis_result: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True

class QuestDetailOut(QuestOut):
    checkpoints: list[CheckpointOut] = []

class DiagnoseRequest(BaseModel):
    goal: str
    desired_deadline: date

class DiagnoseQuestion(BaseModel):
    id: str
    text: str
    options: list[str]

class DiagnoseResponse(BaseModel):
    questions: list[DiagnoseQuestion]

class DiagnoseAnswer(BaseModel):
    question_id: str
    answer: str

class ProposeDeadlineRequest(BaseModel):
    goal: str
    desired_deadline: date
    answers: list[DiagnoseAnswer]

class ProposeDeadlineResponse(BaseModel):
    proposed_deadline: date
    reason: str
    diagnosis_summary: str

class GenerateRoadmapRequest(BaseModel):
    goal: str
    final_deadline: date
    diagnosis_summary: str

class RoadmapCheckpoint(BaseModel):
    title: str
    description: str
    due_date: date
    order_index: int

class GenerateRoadmapResponse(BaseModel):
    checkpoints: list[RoadmapCheckpoint]
