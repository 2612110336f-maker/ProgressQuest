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
MODEL_CANDIDATES = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"]
RETRIES_PER_MODEL = 2
RETRY_DELAY_SECONDS = 5


def get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEYが設定されていません")
    return genai.Client(api_key=api_key)


def call_gemini(prompt: str, response_schema):
    client = get_client()
    last_error: Exception | None = None

    for model in MODEL_CANDIDATES:
        for attempt in range(RETRIES_PER_MODEL):
            try:
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


@router.post("/diagnose", response_model=schemas.DiagnoseResponse)
def diagnose(
    req: schemas.DiagnoseRequest,
    user: models.User = Depends(get_current_user),
):
    prompt = f"""あなたは学習・目標達成のコーチです。
以下の目標と希望期日を持つユーザーの「現在地」を診断するための質問を5問作成してください。

今日の日付: {date.today()}
目標: {req.goal}
希望期日: {req.desired_deadline}

各質問にはid（q1, q2, ...）、text（質問文）、options（3〜4個の選択肢の配列）を含めてください。"""
    return call_gemini(prompt, schemas.DiagnoseResponse)


@router.post("/propose-deadline", response_model=schemas.ProposeDeadlineResponse)
def propose_deadline(
    req: schemas.ProposeDeadlineRequest,
    user: models.User = Depends(get_current_user),
):
    answers_text = "\n".join(f"- {a.question_id}: {a.answer}" for a in req.answers)
    prompt = f"""あなたは学習・目標達成のコーチです。
以下の目標・希望期日・診断の回答をもとに、現実的な期日を再提案してください。

今日の日付: {date.today()}
目標: {req.goal}
希望期日: {req.desired_deadline}
診断の回答:
{answers_text}

proposed_deadline（提案する期日）は必ず今日より後の日付にしてください。
reason（その理由）、diagnosis_summary（現在地とギャップの要約）も出力してください。"""
    return call_gemini(prompt, schemas.ProposeDeadlineResponse)


@router.post("/generate-roadmap", response_model=schemas.GenerateRoadmapResponse)
def generate_roadmap(
    req: schemas.GenerateRoadmapRequest,
    user: models.User = Depends(get_current_user),
):
    prompt = f"""あなたは学習・目標達成のコーチです。
以下の目標・確定期日・診断結果をもとに、目標達成までのチェックポイント（小さなステップ）を
5〜8個程度生成してください。

今日の日付: {date.today()}
目標: {req.goal}
確定期日: {req.final_deadline}
診断結果: {req.diagnosis_summary}

各チェックポイントには title（タイトル）、description（やること）、due_date（期日）、
order_index（並び順、1始まり）を含めてください。due_dateは必ず今日より後、かつ確定期日
（{req.final_deadline}）以前の日付にし、order_indexの順に段階的に設定してください。"""
    return call_gemini(prompt, schemas.GenerateRoadmapResponse)
