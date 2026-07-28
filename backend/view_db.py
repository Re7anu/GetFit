"""Interactive Database Inspector for GetFit PostgreSQL Database."""
from app.db.session import SessionLocal
from app.db.models import UserAuth, UserProfile, FoodLog, ExerciseLog

def view_database():
    db = SessionLocal()
    print("\n========================================================")
    print("                GETFIT DATABASE VIEWER                  ")
    print("========================================================\n")

    # 1. Users & Profiles
    users = db.query(UserAuth).all()
    print(f"USERS ({len(users)} registered accounts):\n" + "-"*65)
    for u in users:
        p = u.profile
        p_info = f"Name: {p.name} | Weight: {p.weight_kg}kg -> Target: {p.target_weight_kg}kg | Goal: {p.goal_type} | Budget: {p.calculated_calorie_target} kcal, {p.calculated_protein_target_g}g Protein" if p else "No Profile Set"
        print(f"  * ID: {u.id[:8]}... | Email: {u.email:<22} | {p_info}")

    # 2. Food Logs Summary
    total_meals = db.query(FoodLog).count()
    recent_meals = db.query(FoodLog).order_by(FoodLog.logged_at.desc()).limit(5).all()
    print(f"\nFOOD LOGS (Total: {total_meals} entries | Last 5 shown):\n" + "-"*65)
    for m in recent_meals:
        user = db.query(UserAuth).filter(UserAuth.id == m.user_id).first()
        email = user.email if user else m.user_id[:8]
        print(f"  * [{m.logged_at.strftime('%Y-%m-%d %H:%M')}] {email:<18} | {m.meal_type.upper():<9} | {m.description:<40} | {m.calories} kcal ({m.protein_g}g P / {m.carbs_g}g C / {m.fat_g}g F)")

    # 3. Exercise Logs Summary
    total_workouts = db.query(ExerciseLog).count()
    recent_workouts = db.query(ExerciseLog).order_by(ExerciseLog.logged_at.desc()).limit(5).all()
    print(f"\nEXERCISE LOGS (Total: {total_workouts} entries | Last 5 shown):\n" + "-"*65)
    for w in recent_workouts:
        user = db.query(UserAuth).filter(UserAuth.id == w.user_id).first()
        email = user.email if user else w.user_id[:8]
        print(f"  * [{w.logged_at.strftime('%Y-%m-%d %H:%M')}] {email:<18} | {w.exercise_name:<30} | {w.duration_minutes} mins | +{w.calories_burned} kcal burned")

    print("\n========================================================\n")
    db.close()

if __name__ == "__main__":
    view_database()
