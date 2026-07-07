# --- Gemini API連携: Core AI Flowの3ステップ(diagnose → propose-deadline → generate-roadmap) ---
# AGENTS.mdで定義されている「新規ロードマップ作成は必ずこの3ステップを経る」を実装したファイル。
# 3エンドポイントはいずれも同じcall_gemini()を通じてGemini APIを呼び、
# response_schemaにPydanticモデルを渡すことでJSON構造化出力を強制している。
import os
import time
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from google.genai import types

import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

# Tried in order on each call; if one model is overloaded (503) or rate
# limited (429) we fall through to the next rather than failing outright.
# 上から順に「軽量・低コスト→高性能」の順に並んでおり、まず安価なモデルで試す。
MODEL_CANDIDATES = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"]
RETRIES_PER_MODEL = 2
RETRY_DELAY_SECONDS = 5


# GEMINI_API_KEYが未設定の場合はここで500エラーにする(呼び出し前のガード)。
def get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEYが設定されていません")
    return genai.Client(api_key=api_key)


# 3エンドポイント共通のGemini呼び出しラッパー。
# AGENTS.mdの「Gemini API呼び出しは必ずtry/exceptで囲む（429・タイムアウト対応）」を
# ここに集約実装している。
# 二重ループ(モデル×リトライ回数)で、
#   1つのモデルで最大RETRIES_PER_MODEL回試す
#   → それでも失敗したら次のモデル候補に切り替えて再度試す
# という「モデルのフォールバック + リトライ」を行う。
# 全滅した場合のみ502エラーとしてクライアントに返す(アプリ全体はクラッシュさせない)。
def call_gemini(prompt: str, response_schema):
    client = get_client()
    last_error: Exception | None = None

    for model in MODEL_CANDIDATES:
        for attempt in range(RETRIES_PER_MODEL):
            try:
                # response_schemaを渡すことでGemini側にJSON Schemaに沿った
                # 構造化出力を強制させ、response.parsedにPydanticオブジェクトとして返させる。
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=response_schema,
                    ),
                )

                if response.parsed is None:
                    raise ValueError("AIの応答を解析できませんでした")
                return response.parsed
            except Exception as e:
                last_error = e
                # Gemini occasionally returns a transient 503 ("high demand")
                # or 429 (quota) that clears up within a few seconds, or on a
                # different model entirely.
                if attempt < RETRIES_PER_MODEL - 1:
                    time.sleep(RETRY_DELAY_SECONDS)

    raise HTTPException(status_code=502, detail=f"AIの呼び出しに失敗しました: {last_error}")


# --- Step1: /ai/diagnose ---
# 目標(goal)と希望期日(desired_deadline)から、ユーザーの現在地を把握するための
# 診断質問(3〜10問・選択式)をGeminiに生成させる。
# プロンプト内でAIに「目標分類→必要能力の整理→不足情報の特定→質問作成」という
# 4ステップの思考手順を踏ませ、後続のpropose-deadline/generate-roadmapに使える
# 情報を過不足なく引き出す設計になっている。
@router.post("/diagnose", response_model=schemas.DiagnoseResponse)
def diagnose(
    req: schemas.DiagnoseRequest,
    user: models.User = Depends(get_current_user),
):
    context_line = f"補足情報: {req.context}\n" if req.context else ""
    prompt = f"""あなたは学習・目標達成のコーチです。
目的:
ユーザーの現在地を正確に把握し、
後続で現実的な期日提案とロードマップ作成を行うために必要な情報を収集してください。


今日の日付: {date.today()}
目標: {req.goal}
希望期日: {req.desired_deadline}
{context_line}

以下の手順で考えてください。

Step1:
目標を分類する。
例:
- 資格取得
- 語学学習
- ソフトウェア開発
- 転職
- 昇進
- 起業
- その他

Step2:
その目標達成に必要な能力・経験・リソースを整理する。

Step3:
以下の観点で不足情報を特定する。

- 現在の経験レベル
- 現在の進捗状況
- 毎週確保できる時間
- 利用可能なリソース
- モチベーションや優先度
- 目標の具体性

Step4:
不足情報を取得する質問を作成する。


ルール:

- 質問数は3〜10問
- シンプルな目標は3〜4問
- 複雑な目標は最大10問
- Yes/Noのみの質問は禁止
- 回答はすべて選択式
- optionsは必ず4個
- 選択肢はレベル差や状況差が分かる内容にする
- ロードマップ作成に不要な質問はしない
- 補足情報がある場合は反映する

出力は指定されたJSONスキーマのみ。
説明文は出力しない。
"""


    result = call_gemini(prompt, schemas.DiagnoseResponse)
    # プロンプトで「最大10問」と指示していても念のためコード側でも上限を保証する防御的な一行。
    result.questions = result.questions[:10]
    return result


# --- Step2: /ai/propose-deadline ---
# Step1の質問への回答(answers)をもとに、希望期日が現実的かどうかをAIに評価させ、
# 現実的な期日(proposed_deadline)・その根拠(reason)・診断結果の要約(diagnosis_summary)を得る。
# diagnosis_summaryはStep3(generate-roadmap)にそのまま引き継がれる中間成果物。
@router.post("/propose-deadline", response_model=schemas.ProposeDeadlineResponse)
def propose_deadline(
    req: schemas.ProposeDeadlineRequest,
    user: models.User = Depends(get_current_user),
):
    answers_text = "\n".join(f"- {a.question_id}: {a.answer}" for a in req.answers)
    prompt = f"""あなたは学習・目標達成のコーチです。

目的:
ユーザーの現在地を踏まえて、
達成可能性の高い現実的な期日を提案してください。

今日の日付: {date.today()}
目標: {req.goal}
希望期日: {req.desired_deadline}
診断の回答:
{answers_text}



あなたは学習・目標達成支援の専門コーチです。

目的:
ユーザーの現在地を分析し、
達成可能性の高い現実的な期日を提案してください。

今日の日付: {date.today()}
目標: {req.goal}
希望期日: {req.desired_deadline}

診断回答:
{answers_text}

以下の手順で考えてください。

Step1:
回答から現在の経験・進捗・学習時間を整理する。

Step2:
目標達成に必要な能力との差分を整理する。

Step3:
希望期日が現実的か評価する。

Step4:
現実的な期日を提案する。

評価時は以下を考慮すること。

- 現在の経験レベル
- 現在の進捗
- 学習・作業可能時間
- 目標難易度
- 一般的な習得期間

提案結果は以下のいずれかとなる。

- 希望期日で達成可能
- やや延長が必要
- 大幅な延長が必要

出力ルール:

proposed_deadline
- 必ず今日より後の日付
- 合理的な根拠に基づいて決定する

diagnosis_summary
- 現在地と課題を要約
- 2〜3文以内
- 120文字以内

reason
- 期日提案の根拠
- 2文以内
- 120文字以内

short_summary
- UI表示用
- 30文字以内
- 以下の形式

現在地: ○○ / 課題: ○○

short_reason
- UI表示用
- 40文字以内
- 期日変更理由のみ記載

推測で補完しないこと。
出力はJSONのみ。
"""


    return call_gemini(prompt, schemas.ProposeDeadlineResponse)


# --- Step3: /ai/generate-roadmap ---
# 確定期日(final_deadline)とStep2の診断要約(diagnosis_summary)をもとに、
# 5〜8個のチェックポイント(SMART原則に沿った具体的なタスク)から成る
# ロードマップをAIに生成させる。これがquestsテーブル作成後にcheckpointsとして保存される。
@router.post("/generate-roadmap", response_model=schemas.GenerateRoadmapResponse)
def generate_roadmap(
    req: schemas.GenerateRoadmapRequest,
    user: models.User = Depends(get_current_user),
):
    prompt = f"""あなたは学習・目標達成のコーチです。

目的:
目標達成までの実行可能なロードマップを作成してください。


今日の日付: {date.today()}
目標: {req.goal}
確定期日: {req.final_deadline}
診断結果: {req.diagnosis_summary}



以下の手順で考えてください。

Step1:
目標達成に必要な能力・知識・経験を整理する。

Step2:
現在地とゴールとの差分を整理する。

Step3:
差分を埋めるための学習・実践ステップを設計する。

Step4:
確定期日までに達成可能なロードマップへ分割する。

ロードマップ作成ルール:

- チェックポイントは5〜8個
- 順番に実施すると目標達成できる構成にする
- 前のステップの成果が次のステップにつながる構成にする
- 実際に行動できるレベルまで具体化する
- 各チェックポイントはSMART原則に従う

SMART原則:

- Specific（具体的）
- Measurable（測定可能）
- Achievable（達成可能）
- Relevant（目標に関連）
- Time-bound（期限あり）

ロードマップは可能な限り以下の流れを意識すること。

1. 基礎理解
2. 基礎演習
3. 応用演習
4. 実践・成果物作成
5. 最終達成

description作成ルール:

- やるべき行動を具体的に書く
- 学習内容や実施内容を明確にする
- なぜそのステップが必要なのかを簡潔に含める
- 完了条件を必ず記載する
- 「勉強する」「理解を深める」などの曖昧表現は禁止
- 150〜300文字程度を目安にする

悪い例:
AWSを勉強する

良い例:
AWSのIAM・EC2・S3について学習する。
公式ドキュメントや教材を使って基本概念を理解し、
各サービスの用途を説明できる状態を目指す。
最後に基礎問題へ取り組み理解度を確認する。


title作成ルール:

- 一目で内容が分かること
- 20〜40文字程度

estimated_hours作成ルール:

- 必須
- 各タスクの完了に必要な総時間を算出する
- 単位は時間
- 整数で出力する
- 読書・学習・演習・復習を含む
- 現在地（診断結果）を考慮する
- 現実的な値にする
- 必ず1以上の値を設定する

deliverable作成ルール:

- 必須
- タスクの成果物または完了条件を記載する
- 30〜80文字程度
- 「何ができたら完了か」を明確にする
- 具体的かつ測定可能な内容にする

悪い例:
AWSを理解する

良い例:
IAM・EC2・S3の基礎問題20問で80%以上正答する


日付ルール:

- due_dateは必ず今日より後
- due_dateは確定期日以前
- due_dateはorder_index順に増加する
- チェックポイント間の期間配分は現実的にする

各チェックポイントには以下を含める。

- title
- description
- due_date
- order_index
- estimated_hours
- deliverable

estimated_hoursは必須項目。

出力は指定されたJSONスキーマのみ。
説明文やMarkdownは出力しない
"""



    return call_gemini(prompt, schemas.GenerateRoadmapResponse)
