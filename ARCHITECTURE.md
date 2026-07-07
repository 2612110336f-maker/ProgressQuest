# ProgressQuest 仕組みまとめ

ハッカソン期間中に「バイブコーディング」で一気に組み上げたコードを、チームで復習・引き継ぎできるように整理したドキュメントです。
セットアップ手順は [beginner-read.md](beginner-read.md) を参照してください。こちらは「各ファイルが何をしているか」に特化しています。

## 1. 全体像

```
[Next.js フロントエンド (frontend/)]
        │  axios (lib/api.ts)
        ▼
[FastAPI バックエンド (backend/)]
        │
        ├─ SQLAlchemy → Supabase PostgreSQL
        ├─ Gemini API (google-genai SDK)
        └─ LINE Messaging API (linebot.v3)
```

- ユーザーが目標と希望期日を入力すると、バックエンドがGemini APIを3段階で呼び出し（診断→期日提案→ロードマップ生成）、結果をDBに保存する。
- ロードマップの期日を過ぎたチェックポイントがあると、次回ログイン時にLINEで通知する（cronは使わない設計）。

**実装メモ**: [AGENTS.md](AGENTS.md)の設計ではSupabase Authを使う想定でしたが、実際には`backend/auth.py`で bcrypt + JWT(jose) による認証を自前実装しています。DBのみSupabaseのPostgreSQLを使用しています。

## 2. バックエンド（`backend/`）

| ファイル | 役割 |
|---|---|
| [main.py](backend/main.py) | FastAPIアプリのエントリーポイント。CORS設定、DB初期化、各routerの登録、認証3エンドポイント（`/auth/register`, `/auth/login`, `/auth/me`）、ログイン時のLINE通知トリガー(`notify_overdue_checkpoints`)を定義 |
| [database.py](backend/database.py) | SQLAlchemyの`engine`/`SessionLocal`/`Base`/`get_db`を定義。SupabaseのPostgreSQLへの接続設定 |
| [auth.py](backend/auth.py) | bcryptによるパスワードハッシュ化、JWTの発行(`create_access_token`)・検証(`decode_token`)、認証必須エンドポイント用の依存関数`get_current_user` |
| [models.py](backend/models.py) | SQLAlchemyモデル: `User`（認証・LINE連携情報）, `Quest`（ロードマップ本体）, `Checkpoint`（マイルストーン） |
| [schemas.py](backend/schemas.py) | Pydanticスキーマ。認証/Quest/Checkpoint/AI連携(diagnose・propose-deadline・generate-roadmap)/LINE連携ごとにリクエスト・レスポンスの型を定義 |
| [routers/quests.py](backend/routers/quests.py) | ロードマップのCRUD（一覧・詳細・作成・更新・ゴミ箱への移動/復元・完全削除） |
| [routers/checkpoints.py](backend/routers/checkpoints.py) | チェックポイントのCRUD（作成・部分更新・完了トグル・削除） |
| [routers/ai.py](backend/routers/ai.py) | **Core AI Flow**の実装。`/ai/diagnose` → `/ai/propose-deadline` → `/ai/generate-roadmap`の3エンドポイントと、Geminiのモデルフォールバック＋リトライ共通処理`call_gemini` |
| [routers/line.py](backend/routers/line.py) | LINE連携。連携コード発行(`/line/link-code`)、Webhook受信(`/line/webhook`)、プッシュ通知送信(`send_line_message`) |

### Core AI Flow（backend/routers/ai.py）

AGENTS.mdで定義されている必須フロー。3ステップとも`call_gemini()`を経由し、`response_schema`にPydanticモデルを渡してJSON構造化出力を強制している。

1. **`/ai/diagnose`**: 目標・希望期日から、現在地を把握するための診断質問（3〜10問、選択式）を生成
2. **`/ai/propose-deadline`**: 診断の回答をもとに、現実的な期日と根拠を提案
3. **`/ai/generate-roadmap`**: 確定期日をもとに、5〜8個のチェックポイント（SMART原則に沿った具体的なタスク）を生成

`call_gemini()`は`MODEL_CANDIDATES`（軽量→高性能の順）の各モデルを、429/503などの一時的なエラー時に最大`RETRIES_PER_MODEL`回リトライしながら試し、全滅した場合のみ502エラーを返す（アプリ全体はクラッシュさせない設計）。

### LINE連携の仕組み（backend/routers/line.py）

AGENTS.mdの想定（followイベントでline_user_idを取得）とは異なり、**6桁の連携コード方式**を採用：

1. フロントで「連携コード発行」→ `create_link_code()`がランダムな6桁コードを発行し`users.line_link_code`に保存
2. ユーザーがそのコードをLINE公式アカウントにテキスト送信
3. `line_webhook()`がテキストメッセージを受信し、一致するユーザーの`line_user_id`を確定、`line_link_code`はクリア

期日超過通知は`main.py`の`notify_overdue_checkpoints()`から、ログイン成功時に呼ばれる（cron不使用）。

## 3. フロントエンド（`frontend/`）

### ページ（`app/`, App Router）

| パス | 役割 |
|---|---|
| [app/layout.tsx](frontend/app/layout.tsx) | 全ページ共通のルートレイアウト。フォント・PWA関連コンポーネント・テーマProviderを適用 |
| [app/page.tsx](frontend/app/page.tsx) | ルート("/")。ログイン状態を見て`/login`または`/dashboard`へリダイレクトするだけの振り分け役 |
| [app/login/page.tsx](frontend/app/login/page.tsx) | ログイン/新規登録（URLクエリ`?mode=register`でモード切替） |
| [app/dashboard/page.tsx](frontend/app/dashboard/page.tsx) | メイン画面。クエスト一覧・切り替え・進捗表示・LINE連携モーダル・ハンバーガーメニュー |
| [app/new/page.tsx](frontend/app/new/page.tsx) | 新規クエスト作成。Core AI Flow(diagnose→propose-deadline→generate-roadmap)をステートマシンとして実装、または手動作成 |
| [app/quest/[id]/page.tsx](frontend/app/quest/[id]/page.tsx) | 個別ロードマップ詳細。「マップ」タブ（すごろく風）と「一覧」タブ（チェックポイント管理）を切り替え |
| [app/trash/page.tsx](frontend/app/trash/page.tsx) | ゴミ箱（クリア済み/削除済みロードマップの復元・完全削除） |
| [app/manifest.ts](frontend/app/manifest.ts) | PWA用Webアプリマニフェスト定義 |

### ライブラリ（`lib/`）

| ファイル | 役割 |
|---|---|
| [lib/api.ts](frontend/lib/api.ts) | バックエンドAPIクライアント集約。axiosインスタンス＋認証トークン自動付与＋全エンドポイントの関数・型定義 |
| [lib/questStatus.ts](frontend/lib/questStatus.ts) | チェックポイントの表示ステータス（completed/current/overdue/future）判定ロジック |
| [lib/theme.tsx](frontend/lib/theme.tsx) | 「ファンタジー」「シンプル」テーマ切り替え用のReact Context |

### コンポーネント（`components/`）

| ファイル | 役割 |
|---|---|
| [components/QuestMap.tsx](frontend/components/QuestMap.tsx) | テーマ「ファンタジー」用のロードマップ表示。地図イラスト背景＋sin波配置＋パン/ズーム(マウス・タッチ)を自前実装 |
| [components/QuestMapSimple.tsx](frontend/components/QuestMapSimple.tsx) | テーマ「シンプル」用のロードマップ表示。ジグザグ配置のSVGすごろく |
| [components/WeeklyTimeline.tsx](frontend/components/WeeklyTimeline.tsx) | ダッシュボード下部の「今週のタスク」。全クエスト横断で期日超過・今週分を抽出 |
| [components/Mascot.tsx](frontend/components/Mascot.tsx) | 画面ごとの初回オンボーディング説明（フクロウの吹き出し）。localStorageで既読管理 |
| [components/QuestLoading.tsx](frontend/components/QuestLoading.tsx) | AI呼び出し待機中のローディング演出。実測時間の学習による進捗バー＋ヒント＋暇つぶしゲーム |
| [components/RunnerGame.tsx](frontend/components/RunnerGame.tsx) | 待機中に遊べるミニゲーム（Chrome恐竜ゲーム風）。requestAnimationFrameで物理演算 |
| [components/ServiceWorkerRegister.tsx](frontend/components/ServiceWorkerRegister.tsx) | PWA: 本番環境でのみService Workerを登録 |
| [components/InstallPrompt.tsx](frontend/components/InstallPrompt.tsx) | PWA: ホーム画面追加を促すバナー（`beforeinstallprompt`イベントを横取り） |

## 4. 一連の流れ：新規クエスト作成（AI生成ルート）

1. `app/new/page.tsx`で目標・希望期日を入力 → `lib/api.ts`の`diagnose()` → `backend/routers/ai.py`の`/ai/diagnose`
2. 診断質問に選択式で回答 → `proposeDeadline()` → `/ai/propose-deadline`で現実的な期日を提案
3. 提案期日を採用 or 自分で設定 → `generateRoadmap()` → `/ai/generate-roadmap`でチェックポイント列を生成
4. 内容確認後、`createQuest()`でQuest本体を作成 →生成されたチェックポイントを1件ずつ`createCheckpoint()`でループ保存
5. `/quest/[id]`へ遷移し、生成されたロードマップを確認

## 5. 認証・データ保護

- JWT(HS256)を`localStorage`に保存し、`lib/api.ts`のaxiosインターセプターが全リクエストに自動付与
- 各Quest/Checkpoint操作エンドポイントは`get_owned_quest`/`get_owned_checkpoint`で「ログイン中ユーザー本人の持ち物か」を必ず検証（他人のデータへのアクセスを403で拒否）

## 6. 既知の注意点（復習用メモ）

- `backend/models.py`は本番DBがPostgreSQLにも関わらず、`sqlalchemy.dialects.sqlite`のJSON型をimportしている（開発初期の名残と思われる。動作はするが本来はPostgreSQL用の型を使うのが望ましい）
- `frontend/AGENTS.md`に不審な「AIエージェント向け指示」（プロンプトインジェクションの疑い）が混入している。要対応・詳細は下記「7. セキュリティ注意事項」を参照

## 7. セキュリティ注意事項（未対応・要チーム確認）

`frontend/AGENTS.md`（コミット`3f8378c`「ログイン機能を作成」で追加）に、以下のような記述がある。

```
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ
from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
writing any code. Heed deprecation notices.
```

さらに`node_modules/next/dist/docs/index.md`の中には、通常のNext.js公式ドキュメントには存在しない
「AIエージェント向けの隠し指示」（存在しない`unstable_instant`というAPIをexportさせようとする内容）が
埋め込まれていることを確認した。AIコーディングアシスタントに実在しないAPIを実装させようとする
典型的なプロンプトインジェクションのパターンに一致する。

**対応が必要:**
1. `frontend/AGENTS.md`の該当セクション(`<!-- BEGIN:nextjs-agent-rules -->`〜)を削除する
2. `node_modules`を`package-lock.json`から入れ直す（`rm -rf node_modules && npm ci`）
3. `npm ls next`で実際にインストールされているNext.jsのバージョン・取得元を確認する

まだ本対応は完了していない（2026-07-07時点）。チームで確認の上、対応してください。
