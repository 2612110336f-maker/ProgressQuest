# ProgressQuest

目標と期日を入力すると、AIが現在地を診断し、現実的な期日とロードマップ（チェックポイント一覧）を自動生成するWebアプリ。期日を過ぎたチェックポイントはLINEで通知する。

## Tech Stack

- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS → Vercel
- Backend: Python 3.12 + FastAPI → Railway または Render
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth
- AI: Gemini API (google-genai SDK)
- Notification: LINE Messaging API (line-bot-sdk-python 3.x)
- PWA: Serwist（第3週に追加）

## Directory Layout

```
progressquest/
├── frontend/
│   ├── app/
│   │   ├── (auth)/          # ログイン・登録ページ
│   │   ├── dashboard/       # ロードマップ一覧
│   │   ├── quest/[id]/      # 個別ロードマップ
│   │   └── new/             # 新規作成フロー（診断→期日確認→生成）
│   ├── components/          # 再利用UIパーツ
│   └── lib/                 # APIクライアント・ユーティリティ
└── backend/
    ├── main.py              # エントリーポイント
    ├── routers/
    │   ├── auth.py          # 認証
    │   ├── quests.py        # ロードマップCRUD
    │   ├── checkpoints.py   # チェックポイントCRUD
    │   ├── ai.py            # Gemini API（診断・期日提案・ロードマップ生成）
    │   └── line_webhook.py  # LINEイベント受け取り
    ├── models.py            # SQLAlchemyモデル
    └── schemas.py           # Pydanticスキーマ
```

## Commands

```bash
# フロントエンド起動（ポート3000）
cd frontend && npm run dev

# バックエンド起動（ポート8000）
cd backend && uvicorn main:app --reload

# バックエンド依存関係インストール
cd backend && pip install -r requirements.txt

# フロントエンド依存関係インストール
cd frontend && npm install
```

## Core AI Flow（最重要）

新規ロードマップ作成は必ず以下の3ステップを経る。

```
Step 1: POST /ai/diagnose
  入力: { goal: string, desired_deadline: date }
  出力: { questions: [{ id, text, options[] }] }  ← 診断用質問5問

Step 2: POST /ai/propose-deadline
  入力: { goal, desired_deadline, answers: [{ question_id, answer }] }
  出力: { proposed_deadline: date, reason: string, diagnosis_summary: string }

Step 3: POST /ai/generate-roadmap
  入力: { goal, final_deadline: date, diagnosis_summary: string }
  出力: { checkpoints: [{ title, description, due_date, order_index }] }
```

## Key Business Logic

- LINE通知はユーザーのログイン時にバックエンドが期日超過チェックポイントを確認し送信する（cronは使わない）
- LINEのuser_idはfollowイベント（友だち追加）のWebhookで取得し、users.line_user_idに保存する
- checkpoints.completed_atがNULLかつdue_dateが過去 → 期日超過扱い

## Database Schema（簡略）

```sql
-- ユーザー（Supabase Authと連携）
users: id(UUID), email, line_user_id, created_at

-- ロードマップ
quests: id(UUID), user_id, title, description,
        original_deadline(DATE), final_deadline(DATE),
        diagnosis_result(JSONB), created_at

-- チェックポイント
checkpoints: id(UUID), quest_id, title, description,
             due_date(DATE), completed_at(TIMESTAMP), order_index(INT)
```

## Code Conventions

### Python（バックエンド）
- 関数の引数・戻り値には必ず型ヒントをつける
- リクエスト/レスポンスはPydanticスキーマで定義する
- Gemini API呼び出しは必ずtry/exceptで囲む（429・タイムアウト対応）
- LINE通知の失敗は握りつぶしてログだけ出す（他機能に影響させない）

### TypeScript（フロントエンド）
- `any`禁止
- コンポーネントはアロー関数でexport
- `const`を優先して使う
- APIクライアントはlib/api.tsに集約する

### Git
- ブランチ: `develop`から`feature/<機能名>`を切る
- コミットメッセージ: `feat:` / `fix:` / `chore:` を先頭につける（日本語OK）
- `main`への直接pushは禁止

## Environment Variables（絶対にコミットしない）

### backend/.env
```
GEMINI_API_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

### frontend/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Important Rules

1. Gemini APIのエラーはアプリ全体をクラッシュさせない（try/except必須）
2. LINE通知の失敗は他の機能に影響させない（catch & logのみ）
3. シークレット類は`.env`で管理し、`.gitignore`に追加済みであることを確認してからコミットする
4. フロントエンドからバックエンドへのリクエストはCORSを設定する（localhost:3000を許可）
