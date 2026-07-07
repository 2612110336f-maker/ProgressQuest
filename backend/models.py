# --- SQLAlchemyモデル定義 ---
# AGENTS.mdのDB設計(users/quests/checkpoints)をそのままORMクラス化したもの。
# database.pyのBaseを継承し、main.pyのBase.metadata.create_all()でテーブルが作られる。
from sqlalchemy import Column, String, Text, Date, DateTime, Integer, ForeignKey
# NOTE: 本番DBはPostgreSQL(database.py参照)だが、ここではsqlite方言のJSON型を
# importして使っている（開発初期の名残とみられる。SQLAlchemyの汎用JSON型でも動く）。
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

# 各テーブルの主キーに使うUUID文字列を生成するヘルパー。
# DBのauto increment IDではなくアプリ側でUUIDを採番する方式。
def generate_uuid():
    return str(uuid.uuid4())

# ユーザー情報。認証(auth.py)で参照するhashed_passwordと、
# LINE連携で使うline_user_id/line_link_codeを持つ。
# line_link_code: LINE友だち追加時に「誰のfollowイベントか」を紐付けるための一時コード（routers/line.py参照）。
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    line_user_id = Column(String, nullable=True)   # follow時にLINE側から取得して保存
    line_link_code = Column(String, nullable=True) # ユーザーとLINEアカウントの紐付け用コード
    created_at = Column(DateTime, default=datetime.now)

# 1つの目標(ゴール)＝1ロードマップ。
# original_deadline: ユーザーが最初に希望した期日 / final_deadline: AI診断後に確定した期日。
# diagnosis_result: /ai/diagnose・/ai/propose-deadlineでのAIとのやり取り結果をJSONBとして丸ごと保存。
# archived_at: 削除(ゴミ箱)扱いにした日時。物理削除せず論理削除するための列。
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

    # Quest削除時に紐づくCheckpointも自動で削除される(cascade="all, delete-orphan")。
    checkpoints = relationship(
        "Checkpoint", back_populates="quest", cascade="all, delete-orphan"
    )

# ロードマップ上の1つのチェックポイント(マイルストーン)。
# completed_atがNULLかつdue_dateが過去日 → 「期日超過」とみなす(main.py/notify_overdue_checkpoints参照)。
# order_index: ロードマップ上での表示順序。estimated_hours: AIが見積もった所要時間。
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
