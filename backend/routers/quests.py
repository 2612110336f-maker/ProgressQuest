from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/quests", tags=["quests"])


def get_owned_quest(quest_id: str, db: Session, user: models.User) -> models.Quest:
    quest = db.query(models.Quest).filter(models.Quest.id == quest_id).first()
    if not quest:
        raise HTTPException(status_code=404, detail="ロードマップが見つかりません")
    if quest.user_id != user.id:
        raise HTTPException(status_code=403, detail="このロードマップにはアクセスできません")
    return quest


@router.get("", response_model=list[schemas.QuestOut])
def list_quests(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Quest).filter(models.Quest.user_id == user.id).all()


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
    quest.checkpoints.sort(key=lambda c: (c.order_index is None, c.order_index))
    return quest


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
