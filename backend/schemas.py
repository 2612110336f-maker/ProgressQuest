# --- リクエスト/レスポンスのPydanticスキーマ集約ファイル ---
# AGENTS.mdの規約通り「リクエスト/レスポンスはPydanticスキーマで定義する」を
# 徹底し、全routerがこのファイルからimportして使う。
# ここではモデル(models.py, DBの実体)とスキーマ(こちら, API入出力の形)を分離している。
from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime

# --- 認証(main.pyの/auth/*で使用) ---
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

# --- チェックポイント(routers/checkpoints.pyで使用) ---
# Create: 新規作成時の入力 / Update: 部分更新時の入力(全項目Optional=PATCH的に使う)
# Out: レスポンス用。from_attributes=TrueによりSQLAlchemyモデルを直接渡してdictに変換できる。
class CheckpointCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    order_index: Optional[int] = None
    estimated_hours: Optional[int] = None

class CheckpointUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    order_index: Optional[int] = None
    completed: Optional[bool] = None  # Trueにするとcompleted_atに現在時刻をセット(router側のロジック)
    estimated_hours: Optional[int] = None

class CheckpointOut(BaseModel):
    id: str
    quest_id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    order_index: Optional[int] = None
    estimated_hours: Optional[int] = None

    class Config:
        from_attributes = True  # ORMオブジェクト(models.Checkpoint)からそのまま変換可能にする

# --- ロードマップ(routers/quests.pyで使用) ---
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
    archived_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 一覧表示用QuestOutに対し、詳細画面用はchekpointsも含めて返す(quest/[id]ページで使用)
class QuestDetailOut(QuestOut):
    checkpoints: list[CheckpointOut] = []

# --- Gemini AI連携フロー(routers/ai.py, Core AI Flowの3ステップに対応) ---

# Step1 /ai/diagnose: ゴールと希望期日から「現在地を把握するための質問」をAIに生成させる
class DiagnoseRequest(BaseModel):
    goal: str
    desired_deadline: date
    context: Optional[str] = None  # 追加のヒント情報(任意)

class DiagnoseQuestion(BaseModel):
    id: str
    text: str
    options: list[str]  # 選択式回答の選択肢

class DiagnoseResponse(BaseModel):
    questions: list[DiagnoseQuestion]

# Step2への入力: Step1の質問に対するユーザーの回答1件分
class DiagnoseAnswer(BaseModel):
    question_id: str
    answer: str

# Step2 /ai/propose-deadline: 診断結果をもとに現実的な期日をAIに提案させる
class ProposeDeadlineRequest(BaseModel):
    goal: str
    desired_deadline: date
    answers: list[DiagnoseAnswer]

class ProposeDeadlineResponse(BaseModel):
    proposed_deadline: date
    reason: str              # なぜその期日を提案したかの説明文
    diagnosis_summary: str   # Step3にそのまま引き継ぐ診断結果の要約

# Step3 /ai/generate-roadmap: 確定した期日までのチェックポイント列をAIに生成させる
class GenerateRoadmapRequest(BaseModel):
    goal: str
    final_deadline: date
    diagnosis_summary: str  # Step2の出力をそのまま渡す

class RoadmapCheckpoint(BaseModel):
    title: str
    description: str
    due_date: date
    order_index: int

    estimated_hours: int  # AIによる所要時間の見積もり

    deliverable: str      # そのチェックポイントの成果物(何が完成すれば達成か)


class GenerateRoadmapResponse(BaseModel):
    checkpoints: list[RoadmapCheckpoint]

# --- LINE連携(routers/line.pyで使用) ---
class LineStatusOut(BaseModel):
    linked: bool  # そのユーザーがLINEアカウントと連携済みかどうか

class LineLinkCodeOut(BaseModel):
    code: str     # フロントに表示する連携用コード(LINEで送信してもらう)
    linked: bool
