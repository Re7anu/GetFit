"""Service module for exercise catalog database management and seeding."""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models.exercise_catalog import ExerciseCatalogItem
from app.core.exercise_catalog import EXERCISE_CATALOG


def seed_exercise_catalog(db: Session) -> None:
    """Populates the exercise_catalog database table with standard scientific exercises if missing."""
    existing_ids = {item.id for item in db.query(ExerciseCatalogItem.id).all()}
    items_to_add = []

    for ex_id, data in EXERCISE_CATALOG.items():
        if ex_id not in existing_ids:
            items_to_add.append(
                ExerciseCatalogItem(
                    id=data["id"],
                    name=data["name"],
                    category=data["category"],
                    met=data.get("met", 4.0),
                    cadence_sec_per_rep=data.get("cadence_sec_per_rep"),
                    calories_per_km_per_kg=data.get("calories_per_km_per_kg"),
                    avg_speed_kmh=data.get("avg_speed_kmh"),
                    unit=data.get("unit"),
                    default_sets=data.get("default_sets"),
                    default_reps=data.get("default_reps"),
                    is_custom=False,
                )
            )

    if items_to_add:
        db.add_all(items_to_add)
        db.commit()


def get_exercise_catalog_list(db: Session, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all standard catalog items and optional custom user exercises from the database table."""
    seed_exercise_catalog(db)

    query = db.query(ExerciseCatalogItem)
    if user_id:
        query = query.filter(
            (ExerciseCatalogItem.is_custom == False) | (ExerciseCatalogItem.created_by_user_id == user_id)
        )
    else:
        query = query.filter(ExerciseCatalogItem.is_custom == False)

    items = query.all()

    return [
        {
            "id": x.id,
            "name": x.name,
            "category": x.category,
            "met": x.met,
            "cadence_sec_per_rep": x.cadence_sec_per_rep,
            "calories_per_km_per_kg": x.calories_per_km_per_kg,
            "avg_speed_kmh": x.avg_speed_kmh,
            "unit": x.unit,
            "default_sets": x.default_sets,
            "default_reps": x.default_reps,
            "is_custom": x.is_custom,
        }
        for x in items
    ]
