import os
import random
import string

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from linebot.v3 import WebhookParser
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    ApiClient,
    Configuration,
    MessagingApi,
    PushMessageRequest,
    ReplyMessageRequest,
    TextMessage,
)
from linebot.v3.webhooks import MessageEvent, TextMessageContent

from auth import get_current_user
from database import get_db
import models
import schemas

router = APIRouter(prefix="/line", tags=["line"])


def _get_parser() -> WebhookParser:
    secret = os.getenv("LINE_CHANNEL_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="LINE_CHANNEL_SECRETが設定されていません")
    return WebhookParser(secret)


def _get_messaging_api() -> MessagingApi:
    token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="LINE_CHANNEL_ACCESS_TOKENが設定されていません")
    return MessagingApi(ApiClient(Configuration(access_token=token)))


def send_line_message(line_user_id: str, text: str) -> None:
    try:
        api = _get_messaging_api()
        api.push_message(
            PushMessageRequest(to=line_user_id, messages=[TextMessage(text=text)])
        )
    except Exception as e:
        print(f"LINE通知の送信に失敗しました: {e}")


@router.get("/status", response_model=schemas.LineStatusOut)
def get_line_status(user: models.User = Depends(get_current_user)):
    return {"linked": user.line_user_id is not None}


@router.post("/link-code", response_model=schemas.LineLinkCodeOut)
def create_link_code(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    code = "".join(random.choices(string.digits, k=6))
    user.line_link_code = code
    db.commit()
    return {"code": code, "linked": user.line_user_id is not None}


@router.post("/webhook")
async def line_webhook(request: Request, db: Session = Depends(get_db)):
    signature = request.headers.get("x-line-signature", "")
    body = (await request.body()).decode("utf-8")

    try:
        events = _get_parser().parse(body, signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="不正な署名です")

    for event in events:
        if not (isinstance(event, MessageEvent) and isinstance(event.message, TextMessageContent)):
            continue

        code = event.message.text.strip()
        target_user = (
            db.query(models.User).filter(models.User.line_link_code == code).first()
        )
        if target_user:
            target_user.line_user_id = event.source.user_id
            target_user.line_link_code = None
            db.commit()
            reply_text = (
                "連携が完了しました！期日を過ぎたチェックポイントがあると、"
                "次回ログイン時にお知らせします。"
            )
        else:
            reply_text = (
                "コードが見つかりませんでした。ProgressQuestの画面に表示されている"
                "連携コードを送ってください。"
            )

        try:
            _get_messaging_api().reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[TextMessage(text=reply_text)],
                )
            )
        except Exception as e:
            print(f"LINE返信の送信に失敗しました: {e}")

    return {"detail": "ok"}
