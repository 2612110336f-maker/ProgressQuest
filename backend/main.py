import os
from datetime import date

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db, Base
import models, schemas, auth
from routers import quests, checkpoints, ai, line

Base.metadata.create_all(bind=engine)

app = FastAPI()

allowed_origins = ["http://localhost:3000"]
extra_origin = os.getenv("FRONTEND_URL")
if extra_origin:
    allowed_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quests.router)
app.include_router(checkpoints.router)
app.include_router(ai.router)
app.include_router(line.router)


def notify_overdue_checkpoints(db_user: models.User, db: Session) -> None:
    if not db_user.line_user_id:
        return
    try:
        overdue = (
            db.query(models.Checkpoint)
            .join(models.Quest)
            .filter(
                models.Quest.user_id == db_user.id,
                models.Checkpoint.completed_at.is_(None),
                models.Checkpoint.due_date.isnot(None),
                models.Checkpoint.due_date < date.today(),
            )
            .all()
        )
        if not overdue:
            return
        lines = "\n".join(f"・{cp.title}（期日: {cp.due_date}）" for cp in overdue)
        line.send_line_message(
            db_user.line_user_id,
            f"⚠️ 期日を過ぎたチェックポイントがあります\n{lines}",
        )
    except Exception as e:
        print(f"期日超過チェックの通知に失敗しました: {e}")

@app.post("/auth/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    hashed = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token = auth.create_access_token(data={"sub": new_user.id})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/auth/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが違います")
    notify_overdue_checkpoints(db_user, db)
    token = auth.create_access_token(data={"sub": db_user.id})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me")
def get_me(token: str, db: Session = Depends(get_db)):
    user_id = auth.decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="無効なトークンです")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return {"id": user.id, "email": user.email}
