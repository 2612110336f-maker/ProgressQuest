# --- チェックポイント(Checkpoint)のCRUD ---
# 1つのロードマップ(Quest)に紐づくマイルストーンの作成・完了トグル・削除を担当する。
# quests.pyのget_owned_questを再利用し、「そのquestが自分の持ち物か」を
# checkpoint操作の前段でもチェックする(routers/quests.pyのコメント参照)。
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas
from routers.quests import get_owned_quest

router = APIRouter(tags=["checkpoints"])


# checkpoint自体からquestを辿ってuser_idを照合する認可チェック。
# 「チェックポイントは存在するが他人のロードマップのものだった」というケースを弾く。
def get_owned_checkpoint(checkpoint_id: str, db: Session, user: models.User) -> models.Checkpoint:
    checkpoint = (
        db.query(models.Checkpoint).filter(models.Checkpoint.id == checkpoint_id).first()
    )
    if not checkpoint:
        raise HTTPException(status_code=404, detail="チェックポイントが見つかりません")
    if checkpoint.quest.user_id != user.id:
        raise HTTPException(status_code=403, detail="このチェックポイントにはアクセスできません")
    return checkpoint


# 指定したquest_id配下に新しいチェックポイントを1件追加する。
# 先にget_owned_questでロードマップの所有権を確認してから作成する。
@router.post("/quests/{quest_id}/checkpoints", response_model=schemas.CheckpointOut)
def create_checkpoint(
    quest_id: str,
    checkpoint_in: schemas.CheckpointCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    get_owned_quest(quest_id, db, user)
    checkpoint = models.Checkpoint(quest_id=quest_id, **checkpoint_in.model_dump())
    db.add(checkpoint)
    db.commit()
    db.refresh(checkpoint)
    return checkpoint


# タイトル・期日などの部分更新に加え、`completed`という特殊フィールドを持つ。
# これはDBのカラムではなく、Trueなら完了時刻(completed_at)をセット、
# Falseなら完了取り消し(completed_atをNoneに戻す)という操作を表すフラグとして扱う。
# そのためdata.pop()でcompletedだけ切り出し、他のフィールドと別処理にしている。
@router.patch("/checkpoints/{checkpoint_id}", response_model=schemas.CheckpointOut)
def update_checkpoint(
    checkpoint_id: str,
    checkpoint_in: schemas.CheckpointUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    checkpoint = get_owned_checkpoint(checkpoint_id, db, user)
    data = checkpoint_in.model_dump(exclude_unset=True)
    completed = data.pop("completed", None)
    for field, value in data.items():
        setattr(checkpoint, field, value)
    if completed is True:
        checkpoint.completed_at = datetime.now()
    elif completed is False:
        checkpoint.completed_at = None
    db.commit()
    db.refresh(checkpoint)
    return checkpoint


# チェックポイントの完全削除(こちらはQuestと違い論理削除ではなく即時削除)。
@router.delete("/checkpoints/{checkpoint_id}")
def delete_checkpoint(
    checkpoint_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    checkpoint = get_owned_checkpoint(checkpoint_id, db, user)
    db.delete(checkpoint)
    db.commit()
    return {"detail": "削除しました"}
