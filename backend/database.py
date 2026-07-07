# --- DB接続まわりの共通設定 ---
# SupabaseのPostgreSQLに接続するためのSQLAlchemyセットアップ。
# ここで作った`engine`/`SessionLocal`/`Base`/`get_db`を
# main.pyやmodels.py、各routerがimportして使い回す。
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import psycopg2  # PostgreSQLドライバ。create_engineが内部で使用するため明示import
from dotenv import load_dotenv

# backend/.envを読み込み、DATABASE_URLなどの環境変数を使えるようにする
load_dotenv()

# 例: postgresql://user:password@host:port/dbname （Supabaseの接続文字列）
DATABASE_URL = os.getenv("DATABASE_URL")

# pool_pre_ping=True: コネクションプールから取り出す前に生存確認のpingを行う。
# Supabase側の接続が一定時間で切られてもエラーにならないようにするための設定。
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

# リクエストごとに使うDBセッションのファクトリ。
# autocommit/autoflushをFalseにし、明示的にcommit()するまでDBに反映しない設計。
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# models.pyの各モデルクラスが継承する基底クラス。
# Base.metadata.create_all()でテーブル定義からDDLを生成する（main.py参照）。
Base = declarative_base()


# FastAPIの Depends(get_db) から呼ばれるDIポイント。
# リクエスト処理中だけセッションを開き、処理が終わったら(例外時も)必ずcloseする。
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
