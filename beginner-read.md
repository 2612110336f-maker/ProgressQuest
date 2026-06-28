# 🚀 ProgressQuest 環境構築ガイド

> git clone まで終わった人向けのセットアップ手順です。
> コマンドは **上から順番に** 実行してください。

---

## 事前確認

ターミナルを開いて以下を実行し、バージョンが表示されればOKです。

```bash
python3 --version   # Python 3.x.x と出ればOK
node --version      # v18.x.x などと出ればOK
```

---

## 1. リポジトリのフォルダに移動

```bash
cd hack-teamD   # クローンしたフォルダ名に合わせてください
```

---

## 2. バックエンドのセットアップ

```bash
# backendフォルダに移動
cd backend
#環境変数を設定するためのファイルを作成する
touch .env
SECRET_KEY=supersecretkey1234567890abcdef
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

GEMINI_API_KEY= Google AI Studioで自分で取得してきたものをかく

# Python仮想環境を作成（初回のみー何かしらエラーが出た場合はこちら以降再度全てのコマンドを上から打っていってください）
python3 -m venv venv

# 仮想環境を有効化
source venv/bin/activate
```

> ✅ ターミナルの先頭に `(venv)` と表示されれば成功です

```bash
# 必要なライブラリをインストール（初回のみ）
pip install fastapi uvicorn "python-jose[cryptography]" "passlib[bcrypt]" python-dotenv sqlalchemy "bcrypt==3.2.2"
```

---

## 3. バックエンドを起動する

```bash
# backendフォルダ・(venv)が有効な状態で実行
uvicorn main:app --reload
```

> ✅ `http://127.0.0.1:8000` と表示されれば起動成功です
> ブラウザで http://localhost:8000/docs を開くとAPI一覧が確認できます

---

## 4. フロントエンドのセットアップ

**新しいターミナルを開いて**以下を実行してください（バックエンドのターミナルはそのまま）。

```bash
# リポジトリのルートからfrontendフォルダに移動
cd hack-teamD/frontend

# 必要なパッケージをインストール（初回のみ）
npm install
```

---

## 5. フロントエンドを起動する

```bash
# frontendフォルダで実行
npm run dev
```

> ✅ `http://localhost:3000` と表示されれば起動成功です
> ブラウザで http://localhost:3000/login を開いてログイン画面が出ればOK

---

## 毎回の起動手順（2回目以降）

### バックエンド
```bash
cd hack-teamD/backend
source venv/bin/activate
uvicorn main:app --reload
```

### フロントエンド（新しいターミナルで）
```bash
cd hack-teamD/frontend
npm run dev
```

---

## 止め方

どちらもターミナルで `Ctrl + C` を押せば停止できます。

---

## うまくいかないときは

| 症状 | 対処法 |
|------|--------|
| `command not found: uvicorn` | `source venv/bin/activate` を実行してから再試行 |
| `command not found: npm` | Node.jsをインストールする |
| `Cannot find module` | `npm install` を再実行する |
| ブラウザに何も表示されない | バックエンドとフロントエンド両方が起動しているか確認 |

困ったらAIに聞いてください

## エラーが発生した場合
データベースの再構成
rm -f backend/progressquest.db

ライブラリの再インストール
pip install -r requirements.txt