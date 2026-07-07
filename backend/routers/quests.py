# --- ロードマップ(Quest)のCRUD ---
# AI生成フロー(routers/ai.py)で作った内容をもとに、フロントがこのAPI経由で
# ロードマップの作成・取得・更新・ゴミ箱(論理削除)・完全削除を行う。
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/quests", tags=["quests"])


# 「そのquest_idが存在し、かつログイン中ユーザー本人の持ち物か」を検証する共通ヘルパー。
# 他人のロードマップを操作できないようにする認可チェックとして、
# update/trash/restore/deleteの各エンドポイントから呼ばれる。
def get_owned_quest(quest_id: str, db: Session, user: models.User) -> models.Quest:
    quest = db.query(models.Quest).filter(models.Quest.id == quest_id).first()
    if not quest:
        raise HTTPException(status_code=404, detail="ロードマップが見つかりません")
    if quest.user_id != user.id:
        raise HTTPException(status_code=403, detail="このロードマップにはアクセスできません")
    return quest


# ダッシュボード用: 自分が持つ、ゴミ箱に入っていない(archived_at is None)ロードマップ一覧。
@router.get("", response_model=list[schemas.QuestOut])
def list_quests(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Quest)
        .filter(models.Quest.user_id == user.id, models.Quest.archived_at.is_(None))
        .all()
    )


# ゴミ箱画面用: archived_atが入っている(削除扱いの)ロードマップ一覧。
@router.get("/trash", response_model=list[schemas.QuestOut])
def list_trashed_quests(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.Quest)
        .filter(models.Quest.user_id == user.id, models.Quest.archived_at.isnot(None))
        .all()
    )


# AI生成フロー(Step1〜3)完了後、フロントが確定した内容でロードマップ本体を新規作成する。
# チェックポイントはこの後、checkpoints.pyのcreate_checkpointで個別に追加される想定。
@router.post("", response_model=schemas.QuestOut)
def create_quest(
    quest_in: schemas.QuestCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    quest = models.Quest(user_id=user.id, **quest_in.model_dump())
    db.add(quest)
    db.commit()
    db.refresh(quest)
    return quest


# 個別ロードマップ画面(quest/[id])用: 紐づくcheckpointsも一緒に取得する(joinedloadでN+1回避)。
# 取得後にorder_indexで並べ替えてからレスポンスする(DB上の順序を保証しないため)。
@router.get("/{quest_id}", response_model=schemas.QuestDetailOut)
def get_quest(
    quest_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    quest = (
        db.query(models.Quest)
        .options(joinedload(models.Quest.checkpoints))
        .filter(models.Quest.id == quest_id)
        .first()
    )
    if not quest:
        raise HTTPException(status_code=404, detail="ロードマップが見つかりません")
    if quest.user_id != user.id:
        raise HTTPException(status_code=403, detail="このロードマップにはアクセスできません")
    # order_indexがNoneのものを末尾に回しつつ昇順ソート
    quest.checkpoints.sort(key=lambda c: (c.order_index is None, c.order_index))
    return quest


# タイトル・期日などの部分更新。model_dump(exclude_unset=True)により
# リクエストで実際に送られてきたフィールドだけを上書きする(PATCH的な挙動)。
@router.patch("/{quest_id}", response_model=schemas.QuestOut)
def update_quest(
    quest_id: str,
    quest_in: schemas.QuestUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    quest = get_owned_quest(quest_id, db, user)
    for field, value in quest_in.model_dump(exclude_unset=True).items():
        setattr(quest, field, value)
    db.commit()
    db.refresh(quest)
    return quest


# 「削除」ボタン押下時の処理。物理削除はせずarchived_atに現在時刻を入れるだけ(論理削除)。
# ゴミ箱画面から復元できるようにするための設計。
@router.post("/{quest_id}/trash", response_model=schemas.QuestOut)
def trash_quest(
    quest_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    quest = get_owned_quest(quest_id, db, user)
    quest.archived_at = datetime.now()
    db.commit()
    db.refresh(quest)
    return quest


# ゴミ箱からの復元。archived_atをNoneに戻すだけ。
@router.post("/{quest_id}/restore", response_model=schemas.QuestOut)
def restore_quest(
    quest_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    quest = get_owned_quest(quest_id, db, user)
    quest.archived_at = None
    db.commit()
    db.refresh(quest)
    return quest


# ゴミ箱からの完全削除。models.pyのcascade設定により、紐づくcheckpointsも自動で削除される。
@router.delete("/{quest_id}")
def delete_quest(
    quest_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    quest = get_owned_quest(quest_id, db, user)
    db.delete(quest)
    db.commit()
    return {"detail": "削除しました"}
