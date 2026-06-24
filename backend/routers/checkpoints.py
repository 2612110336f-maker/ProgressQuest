from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas
from routers.quests import get_owned_quest

router = APIRouter(tags=["checkpoints"])


def get_owned_checkpoint(checkpoint_id: str, db: Session, user: models.User) -> models.Checkpoint:
    checkpoint = (
        db.query(models.Checkpoint).filter(models.Checkpoint.id == checkpoint_id).first()
    )
    if not checkpoint:
        raise HTTPException(status_code=404, detail="チェックポイントが見つかりません")
    if checkpoint.quest.user_id != user.id:
        raise HTTPException(status_code=403, detail="このチェックポイントにはアクセスできません")
    return checkpoint


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
