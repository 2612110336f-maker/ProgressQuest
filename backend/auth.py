# --- 独自JWT認証の実装 ---
# AGENTS.mdの設計ではSupabase Authを使う想定だが、実際にはこのファイルで
# bcryptによるパスワードハッシュ化 + jose(JWT)によるトークン発行/検証を
# 自前実装している。main.pyの/auth/register, /auth/loginがここの関数を呼ぶ。
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from database import get_db
import models

load_dotenv()

# .envで管理する秘密情報。SECRET_KEYはJWTの署名鍵、ALGORITHMは署名アルゴリズム(HS256想定)。
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# bcryptでパスワードをハッシュ化するためのコンテキスト。roundsを上げるほど計算コストが増え安全になる。
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# bcryptはパスワードを72バイトまでしか扱えない仕様のため、
# それ以上の入力は事前に切り詰めてからハッシュ化/照合する（エラー防止のための実装上の工夫）。
def verify_password(plain_password, hashed_password):
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    password = password[:72]
    return pwd_context.hash(password)

# ユーザーID(sub)を含むペイロードに有効期限(exp)を付与し、JWTとして署名・発行する。
# expires_deltaを渡さなければACCESS_TOKEN_EXPIRE_MINUTES後に失効する。
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# JWTを検証し、中身のユーザーID(sub)を取り出す。
# 署名不正・期限切れなどJWTErrorが起きた場合はNoneを返す（呼び出し側で401にする）。
def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

# FastAPIの依存性注入で「Authorization: Bearer <token>」ヘッダーからトークンを取り出す仕組み。
# tokenUrlはSwagger UI(/docs)のログインフォームが叩くURLを指すだけで、実処理はcreate_access_tokenが行う。
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# 認証必須のエンドポイントで `Depends(auth.get_current_user)` として使う共通依存関数。
# トークンを検証→ユーザーIDを取得→DBから実在確認、の順でログイン中ユーザーを解決する。
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="無効なトークンです")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")
    return user
