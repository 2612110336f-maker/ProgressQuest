# --- ProgressQuest バックエンドのエントリーポイント ---
# ここでFastAPIアプリを1つ生成し、CORS設定・DB初期化・各routerの登録・
# 認証系(register/login/me)のエンドポイントをまとめて定義している。
# uvicorn main:app --reload で起動すると、この`app`が読み込まれる。
import os
from datetime import date

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db, Base
import models, schemas, auth
from routers import quests, checkpoints, ai, line

# NOTE: AGENTS.mdの設計ではSupabase Authを使う想定だったが、
# 実装では独自のJWT発行(auth.py)+SQLite/Postgresへのユーザーテーブルで
# 認証を行っている（ハッカソン中の実装簡略化）。

# アプリ起動時にmodels.pyで定義したテーブルが無ければ作成する。
# マイグレーションツールは使わず、起動のたびに存在確認だけ行う簡易方式。
Base.metadata.create_all(bind=engine)


app = FastAPI()

# フロントエンド(Next.js, localhost:3000)からのリクエストを許可するCORS設定。
# 本番用のフロントURLは環境変数FRONTEND_URLで追加できるようにしている。
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

# 機能ごとに分割したエンドポイント群(routers/以下)をここで一括登録する。
app.include_router(quests.router)      # ロードマップCRUD
app.include_router(checkpoints.router) # チェックポイントCRUD
app.include_router(ai.router)          # Gemini APIによる診断・提案・生成
app.include_router(line.router)        # LINE Webhook受信・メッセージ送信


# AGENTS.mdの「LINE通知はcronを使わずログイン時にチェックする」という設計を
# そのまま実装した関数。login()から呼ばれる。
# 対象: そのユーザーが持つチェックポイントのうち、未完了(completed_at is None)かつ
#       期日(due_date)が今日より前のもの＝期日超過。
# LINE未連携(line_user_idがNone)のユーザーは何もせず抜ける。
# 送信に失敗しても例外を握りつぶし、ログ出力のみ行う
# （AGENTS.mdのルール「LINE通知の失敗は他機能に影響させない」に対応）。
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

# --- 新規ユーザー登録 ---
# 1. email重複チェック → 2. パスワードをbcryptでハッシュ化 → 3. usersテーブルへ保存
# → 4. JWTアクセストークンを発行してそのまま返す(登録直後に自動ログイン状態にする)。
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

# --- ログイン ---
# email/パスワードを検証してJWTを発行する。
# ログインのタイミングで notify_overdue_checkpoints() を呼び、
# 期日超過チェックポイントがあればLINEに通知する（cron不使用の代替設計）。
@app.post("/auth/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが違います")
    notify_overdue_checkpoints(db_user, db)
    token = auth.create_access_token(data={"sub": db_user.id})
    return {"access_token": token, "token_type": "bearer"}

# --- ログイン中ユーザー情報の取得 ---
# クエリパラメータで渡されたJWTを検証し、対応するユーザーのid/emailを返す。
# フロントエンドがログイン状態の確認やヘッダー表示に使う。
@app.get("/auth/me")
def get_me(token: str, db: Session = Depends(get_db)):
    user_id = auth.decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="無効なトークンです")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return {"id": user.id, "email": user.email}
