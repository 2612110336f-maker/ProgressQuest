# --- LINE連携: アカウント紐付け(link-code) + Webhook受信 + メッセージ送信 ---
# AGENTS.mdの設計では「followイベントでline_user_idを取得する」想定だが、
# 実装では6桁の数字コードによる紐付け方式を採用している:
#   1. ユーザーがフロントで「連携コード発行」を押す → create_link_code()
#   2. 発行されたコードをLINE公式アカウントにテキストで送る
#   3. line_webhook()がそのテキストを受信し、一致するユーザーのline_user_idを確定する
# followイベントを待たずに済み、複数ユーザーが同じ公式アカウントを使っても
# 誰が送ったかをコードで一意に特定できるのが利点。
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


# LINE_CHANNEL_SECRETを使ってWebhookの署名検証パーサーを組み立てる。
def _get_parser() -> WebhookParser:
    secret = os.getenv("LINE_CHANNEL_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="LINE_CHANNEL_SECRETが設定されていません")
    return WebhookParser(secret)


# LINE_CHANNEL_ACCESS_TOKENを使ってメッセージ送信用のMessaging APIクライアントを組み立てる。
def _get_messaging_api() -> MessagingApi:
    token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="LINE_CHANNEL_ACCESS_TOKENが設定されていません")
    return MessagingApi(ApiClient(Configuration(access_token=token)))


# main.pyのnotify_overdue_checkpoints()から呼ばれるプッシュ通知の実処理。
# AGENTS.mdのルール「LINE通知の失敗は握りつぶしてログだけ出す」を徹底し、
# 例外を上位に投げず、ここで完結させる(呼び出し元のログイン処理を止めないため)。
def send_line_message(line_user_id: str, text: str) -> None:
    try:
        api = _get_messaging_api()
        api.push_message(
            PushMessageRequest(to=line_user_id, messages=[TextMessage(text=text)])
        )
    except Exception as e:
        print(f"LINE通知の送信に失敗しました: {e}")


# フロントの設定画面で「連携済みかどうか」の表示に使う。
@router.get("/status", response_model=schemas.LineStatusOut)
def get_line_status(user: models.User = Depends(get_current_user)):
    return {"linked": user.line_user_id is not None}


# ランダムな6桁の数字コードを発行し、ユーザーに一時的に紐付けて保存する。
# このコードをLINEで送ってもらうことで、下のline_webhook()が本人確認に使う。
@router.post("/link-code", response_model=schemas.LineLinkCodeOut)
def create_link_code(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    code = "".join(random.choices(string.digits, k=6))
    user.line_link_code = code
    db.commit()
    return {"code": code, "linked": user.line_user_id is not None}


# LINEプラットフォームからのWebhookエンドポイント(LINE Developersコンソールに登録するURL)。
# 署名(x-line-signature)を検証し、テキストメッセージイベントのみを処理する。
# 受信したテキスト＝連携コードとみなし、一致するユーザーがいればline_user_idを確定させ、
# line_link_codeは使い捨てなのでNoneにクリアする。
@router.post("/webhook")
async def line_webhook(request: Request, db: Session = Depends(get_db)):
    signature = request.headers.get("x-line-signature", "")
    body = (await request.body()).decode("utf-8")

    try:
        events = _get_parser().parse(body, signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="不正な署名です")

    for event in events:
        # テキストメッセージ以外(スタンプ・画像など)のイベントは無視する
        if not (isinstance(event, MessageEvent) and isinstance(event.message, TextMessageContent)):
            continue

        code = event.message.text.strip()
        target_user = (
            db.query(models.User).filter(models.User.line_link_code == code).first()
        )
        if target_user:
            # コード一致 → event.source.user_id (LINE側のユーザーID)を確定保存
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

        # reply_token(1回限り有効)を使って、送られてきたメッセージへの返信を行う。
        # ここも失敗時はログのみで処理を止めない。
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
