"""Dedicated Domain Service for Pose Estimation Joint Angle Math, Exercise Depth Limits, and State Machine Evaluation."""

import math
import time
from typing import Any
from app.schemas.workout_log import (
    FormFeedbackResponse,
    PoseFrameEvaluationRequest,
    PoseFrameEvaluationResponse,
)


def calculate_joint_angle_3d(p1: Any, p2: Any, p3: Any) -> int:
    """Calculates 2D/3D interior joint angle (degrees) between p1, vertex p2, and p3."""
    if not p1 or not p2 or not p3:
        return 0
    radians = math.atan2(p3.y - p2.y, p3.x - p2.x) - math.atan2(p1.y - p2.y, p1.x - p2.x)
    angle = abs(radians * 180.0 / math.pi)
    if angle > 180.0:
        angle = 360.0 - angle
    return round(angle)


def evaluate_pose_frame(req: PoseFrameEvaluationRequest) -> PoseFrameEvaluationResponse:
    """Evaluates joint angles, movement depth thresholds, and 2-phase rep state machine on backend."""
    lm = req.landmarks
    now_ms = time.time() * 1000.0

    def is_visible(*indices):
        return all(i < len(lm) and lm[i].visibility > 0.55 for i in indices)

    exercise = req.exercise.lower()
    rep_count = req.rep_count
    stage = req.current_stage
    reached_bottom = req.reached_bottom
    last_rep_ts = req.last_rep_timestamp
    rep_incremented = False
    current_angle = 0
    feedback_status = "good"
    feedback_text = "Get into position & begin!"

    if exercise == "squats":
        if not is_visible(23, 25, 27) and not is_visible(24, 26, 28):
            return PoseFrameEvaluationResponse(
                current_angle=0,
                stage=stage,
                reached_bottom=reached_bottom,
                rep_count=rep_count,
                rep_incremented=False,
                last_rep_timestamp=last_rep_ts,
                form_feedback=FormFeedbackResponse(status="warning", text="⚠️ Step back so your legs & hips are visible"),
            )

        left_angle = calculate_joint_angle_3d(lm[23], lm[25], lm[27]) if is_visible(23, 25, 27) else None
        right_angle = calculate_joint_angle_3d(lm[24], lm[26], lm[28]) if is_visible(24, 26, 28) else None

        if left_angle is not None and right_angle is not None:
            current_angle = round((left_angle + right_angle) / 2)
        else:
            current_angle = left_angle if left_angle is not None else (right_angle or 180)

        if current_angle <= 95:
            stage = "DOWN"
            reached_bottom = True
            if current_angle <= 85:
                feedback_status, feedback_text = "good", "🟢 EXCELLENT DEPTH! (Deep Squat)"
            else:
                feedback_status, feedback_text = "good", "🟢 GOOD PARALLEL DEPTH! Push up."
        elif current_angle >= 160:
            if reached_bottom and (now_ms - last_rep_ts > 800):
                rep_count += 1
                rep_incremented = True
                last_rep_ts = now_ms
                reached_bottom = False
                feedback_status, feedback_text = "good", "🎉 SQUAT REP COMPLETED!"
            elif not reached_bottom:
                feedback_status, feedback_text = "good", "Standing straight. Lower into a squat!"
            stage = "UP"
        elif stage == "DOWN" and 100 < current_angle < 150:
            feedback_status, feedback_text = "warning", "🟡 SQUAT DEEPER! Reach 90° knee bend."

    elif exercise == "pushups":
        if not is_visible(11, 13, 15) and not is_visible(12, 14, 16):
            return PoseFrameEvaluationResponse(
                current_angle=0,
                stage=stage,
                reached_bottom=reached_bottom,
                rep_count=rep_count,
                rep_incremented=False,
                last_rep_timestamp=last_rep_ts,
                form_feedback=FormFeedbackResponse(status="warning", text="⚠️ Step back so arms & shoulders are visible"),
            )

        left_elbow = calculate_joint_angle_3d(lm[11], lm[13], lm[15]) if is_visible(11, 13, 15) else None
        right_elbow = calculate_joint_angle_3d(lm[12], lm[14], lm[16]) if is_visible(12, 14, 16) else None

        if left_elbow is not None and right_elbow is not None:
            current_angle = round((left_elbow + right_elbow) / 2)
        else:
            current_angle = left_elbow if left_elbow is not None else (right_elbow or 180)

        plank_visible = is_visible(11, 23, 27) or is_visible(12, 24, 28)
        plank_angle = 180
        if plank_visible:
            plank_angle = (
                calculate_joint_angle_3d(lm[11], lm[23], lm[27])
                if is_visible(11, 23, 27)
                else calculate_joint_angle_3d(lm[12], lm[24], lm[28])
            )

        if plank_angle < 145:
            feedback_status, feedback_text = "danger", "🔴 KEEP PLANK STRAIGHT! Don't sag hips."
        elif current_angle <= 90:
            stage = "DOWN"
            reached_bottom = True
            feedback_status, feedback_text = "good", "🟢 EXCELLENT PUSH-UP DEPTH! Push up."
        elif current_angle >= 155:
            if reached_bottom and (now_ms - last_rep_ts > 800):
                rep_count += 1
                rep_incremented = True
                last_rep_ts = now_ms
                reached_bottom = False
                feedback_status, feedback_text = "good", "🎉 PUSH-UP REP COMPLETED!"
            elif not reached_bottom:
                feedback_status, feedback_text = "good", "Top plank position. Lower your chest!"
            stage = "UP"
        elif stage == "DOWN" and 105 < current_angle < 145:
            feedback_status, feedback_text = "warning", "🟡 LOWER CHEST DEEPER!"

    elif exercise in ["bicep_curls", "bicep_curl"]:
        left_elbow = calculate_joint_angle_3d(lm[11], lm[13], lm[15]) if is_visible(11, 13, 15) else None
        right_elbow = calculate_joint_angle_3d(lm[12], lm[14], lm[16]) if is_visible(12, 14, 16) else None

        if left_elbow is None and right_elbow is None:
            return PoseFrameEvaluationResponse(
                current_angle=0,
                stage=stage,
                reached_bottom=reached_bottom,
                rep_count=rep_count,
                rep_incremented=False,
                last_rep_timestamp=last_rep_ts,
                form_feedback=FormFeedbackResponse(status="warning", text="⚠️ Step back so arms & elbows are visible"),
            )

        if left_elbow is not None and right_elbow is not None:
            current_angle = min(left_elbow, right_elbow)
        else:
            current_angle = left_elbow if left_elbow is not None else right_elbow

        if current_angle <= 50:
            stage = "DOWN"
            reached_bottom = True
            feedback_status, feedback_text = "good", "🟢 PEAK BICEP CONTRACTION! Lower slowly."
        elif current_angle >= 150:
            if reached_bottom and (now_ms - last_rep_ts > 800):
                rep_count += 1
                rep_incremented = True
                last_rep_ts = now_ms
                reached_bottom = False
                feedback_status, feedback_text = "good", "🎉 BICEP CURL REP COMPLETED!"
            elif not reached_bottom:
                feedback_status, feedback_text = "good", "Arm extended at bottom. Curl weight up!"
            stage = "UP"
        elif stage == "UP" and 60 < current_angle < 120:
            feedback_status, feedback_text = "warning", "🟡 SQUEEZE AT THE TOP!"

    return PoseFrameEvaluationResponse(
        current_angle=current_angle,
        stage=stage,
        reached_bottom=reached_bottom,
        rep_count=rep_count,
        rep_incremented=rep_incremented,
        last_rep_timestamp=last_rep_ts,
        form_feedback=FormFeedbackResponse(status=feedback_status, text=feedback_text),
    )
