"""Seed 30-day realistic historical food and workout logs into database."""
import random
from datetime import date, datetime, time, timedelta
from app.db.session import SessionLocal
from app.db.models import UserAuth, UserProfile, FoodLog, WorkoutLog

def seed_history_for_users():
    db = SessionLocal()
    users = db.query(UserAuth).all()
    
    if not users:
        print("No users found in database!")
        db.close()
        return

    today = date.today()
    print(f"Seeding 30-day history for {len(users)} user(s)...")

    meal_templates = [
        ("breakfast", "Oatmeal with Berries & Whey Protein", 0.22, 0.30, 0.35, 0.15),
        ("lunch", "Grilled Chicken Breast with Quinoa & Vegetables", 0.35, 0.40, 0.35, 0.25),
        ("dinner", "Salmon Filet with Brown Rice & Asparagus", 0.33, 0.35, 0.30, 0.35),
        ("snack", "Greek Yogurt & Protein Smoothie", 0.10, 0.15, 0.10, 0.10),
    ]

    workout_samples = [
        ("Outdoor Running", 35.0, 9.8, 320),
        ("Heavy Squats & Leg Day", 45.0, 6.0, 250),
        ("Pushups & Upper Body Circuit", 30.0, 5.0, 160),
        ("Vigorous Cycling", 40.0, 8.5, 290),
    ]

    for user in users:
        profile = user.profile
        if not profile:
            continue

        target_cals = profile.calculated_calorie_target
        target_prot = profile.calculated_protein_target_g
        goal = profile.goal_type

        print(f"Seeding user: {user.email} ({user.profile.name}) -> Goal: {goal}, Target: {target_cals} kcal, Protein: {target_prot}g")

        # Clear existing logs for past 30 days
        start_date = today - timedelta(days=29)
        start_dt = datetime.combine(start_date, time.min)
        db.query(FoodLog).filter(FoodLog.user_id == user.id, FoodLog.logged_at >= start_dt).delete()
        db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.logged_at >= start_dt).delete()
        db.commit()

        for day_offset in range(30):
            current_date = start_date + timedelta(days=day_offset)
            
            # ~70% of days hit goal, 30% miss
            hit_goal = random.random() < 0.70

            # Determine calorie multiplier for the day based on goal
            if goal == "lose_weight":
                cal_factor = random.uniform(0.85, 0.98) if hit_goal else random.uniform(1.10, 1.30)
            elif goal == "gain_muscle":
                cal_factor = random.uniform(1.02, 1.15) if hit_goal else random.uniform(0.75, 0.92)
            else:
                cal_factor = random.uniform(0.95, 1.05) if hit_goal else random.uniform(1.15, 1.35)

            prot_factor = random.uniform(1.05, 1.25) if hit_goal else random.uniform(0.60, 0.85)

            day_cals = target_cals * cal_factor
            day_prot = target_prot * prot_factor

            # Add workout on 50% of days
            has_workout = random.random() < 0.50
            if has_workout:
                wname, dur, met, burn = random.choice(workout_samples)
                w_time = datetime.combine(current_date, time(hour=17, minute=random.randint(0, 59)))
                ex_entry = WorkoutLog(
                    user_id=user.id,
                    exercise_name=wname,
                    duration_minutes=dur,
                    met_value=met,
                    calories_burned=burn,
                    input_method="structured",
                    logged_at=w_time,
                )
                db.add(ex_entry)

            # Generate 4 meals proportional to target
            for mtype, desc, c_pct, p_pct, carb_pct, f_pct in meal_templates:
                log_time = datetime.combine(
                    current_date, 
                    time(hour=8 if mtype=='breakfast' else (12 if mtype=='lunch' else (19 if mtype=='dinner' else 21)), minute=random.randint(0, 59))
                )
                
                meal_cals = int(round(day_cals * c_pct))
                meal_prot = round(day_prot * p_pct, 1)
                meal_carbs = round((meal_cals * carb_pct) / 4.0, 1)
                meal_fat = round((meal_cals * f_pct) / 9.0, 1)

                food_entry = FoodLog(
                    user_id=user.id,
                    meal_type=mtype,
                    description=desc,
                    calories=meal_cals,
                    protein_g=meal_prot,
                    carbs_g=meal_carbs,
                    fat_g=meal_fat,
                    input_method="ai_nlp",
                    logged_at=log_time,
                )
                db.add(food_entry)

        db.commit()
        print(f"Successfully seeded 30 days for {user.email}!")

    db.close()

if __name__ == "__main__":
    seed_history_for_users()
