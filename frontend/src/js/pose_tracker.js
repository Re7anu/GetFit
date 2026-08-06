/* AI Camera Pose Tracker & Real-Time Form Verification Engine */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';

export class PoseTrackerManager {
  static pose = null;
  static camera = null;
  static isRunning = false;
  static activeExercise = 'squats'; // 'squats', 'pushups', 'bicep_curls'
  
  // Rep Counter & State Machine Variables
  static repCount = 0;
  static stage = 'UP'; // 'UP' or 'DOWN'
  static reachedBottom = false; // Strict 2-phase lock: must hit bottom threshold before rep can score on return to top
  static lastRepTimestamp = 0; // Debounce timer to prevent double counting
  static formFeedback = { status: 'good', text: 'Get into position & begin!' };
  static currentAngle = 0;

  // Exercise Catalog Specs & MET Ratings for Auto-Logging
  static EXERCISES = {
    squats: {
      name: 'Bodyweight Squats',
      met: 5.0,
      calsPerRep: 0.32,
      instruction: 'Stand facing camera. Lower hips until knees reach 90° depth.',
    },
    pushups: {
      name: 'Bodyweight Push-ups',
      met: 8.0,
      calsPerRep: 0.45,
      instruction: 'Maintain a rigid plank. Lower chest until elbows reach 90°.',
    },
    bicep_curls: {
      name: 'Bicep Dumbbell Curls',
      met: 4.5,
      calsPerRep: 0.25,
      instruction: 'Keep upper arm stationary. Curl weight up to shoulder level.',
    },
  };

  static isEventsBound = false;
  static isSaving = false;

  static init() {
    this.bindEvents();
  }

  static bindEvents() {
    if (this.isEventsBound) return;
    this.isEventsBound = true;

    document.addEventListener('click', (e) => {
      // Toggle Camera Start / Stop
      if (e.target.closest('#btn-start-pose-cam')) {
        this.startCamera();
      } else if (e.target.closest('#btn-stop-pose-cam')) {
        this.stopCamera();
      } else if (e.target.closest('#btn-reset-pose-reps')) {
        this.resetCounter();
      } else if (e.target.closest('#btn-save-pose-workout')) {
        this.saveWorkoutSet();
      } else if (e.target.closest('#btn-trigger-upload-pose-video')) {
        const fileInput = document.getElementById('pose-video-file-input');
        if (fileInput) fileInput.click();
      } else if (e.target.closest('#btn-toggle-pose-fullscreen')) {
        this.toggleFullscreen();
      } else if (e.target.closest('#btn-pose-fs-weight-minus')) {
        const weightInput = document.getElementById('pose-added-weight-input');
        if (weightInput) {
          const val = Math.max(0, (parseFloat(weightInput.value) || 0) - 2.5);
          weightInput.value = val;
          this.updateHUDUI();
        }
      } else if (e.target.closest('#btn-pose-fs-weight-plus')) {
        const weightInput = document.getElementById('pose-added-weight-input');
        if (weightInput) {
          const val = (parseFloat(weightInput.value) || 0) + 2.5;
          weightInput.value = val;
          this.updateHUDUI();
        }
      }

      // Exercise Option Selectors - Fix inline styling highlight & sync across docks
      const exBtn = e.target.closest('.pose-ex-selector-btn');
      if (exBtn) {
        const exTarget = exBtn.dataset.exercise;
        this.activeExercise = exTarget;

        document.querySelectorAll('.pose-ex-selector-btn').forEach((b) => {
          if (b.dataset.exercise === exTarget) {
            b.classList.add('active');
            b.style.background = 'rgba(56, 189, 248, 0.2)';
            b.style.color = '#38BDF8';
            b.style.border = '1px solid var(--accent-workout)';
            b.style.fontWeight = '800';
          } else {
            b.classList.remove('active');
            b.style.background = 'rgba(15, 23, 42, 0.85)';
            b.style.color = 'var(--text-secondary)';
            b.style.border = '1px solid var(--border-glass)';
            b.style.fontWeight = '600';
          }
        });

        // Auto-set default weight for dumbbells
        const weightInput = document.getElementById('pose-added-weight-input');
        if (weightInput) {
          weightInput.value = this.activeExercise === 'bicep_curls' ? 5 : 0;
        }

        this.resetCounter();
        this.updateExerciseInstructions();
      }
    });

    // Handle Added Weight Input Change across both normal & Fullscreen inputs
    document.addEventListener('input', (e) => {
      if (e.target) {
        if (e.target.id === 'pose-added-weight-input') {
          const fsInput = document.getElementById('pose-fs-weight-input');
          if (fsInput && document.activeElement !== fsInput) fsInput.value = e.target.value;
          this.updateHUDUI();
        } else if (e.target.id === 'pose-fs-weight-input') {
          const normalInput = document.getElementById('pose-added-weight-input');
          if (normalInput && document.activeElement !== normalInput) normalInput.value = e.target.value;
          this.updateHUDUI();
        }
      }
    });

    // Handle Uploaded Video File Selection
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'pose-video-file-input') {
        const file = e.target.files[0];
        if (file) {
          this.processUploadedVideo(file);
        }
      }
    });
    // Handle native HTML5 fullscreenchange events
    document.addEventListener('fullscreenchange', () => {
      const container = document.getElementById('ex-section-pose-tracker');
      const btn = document.getElementById('btn-toggle-pose-fullscreen');
      if (!container || !btn) return;

      const isNativeFS = !!document.fullscreenElement;
      if (isNativeFS) {
        container.classList.add('pose-fullscreen-mode');
        btn.innerHTML = 'Exit Fullscreen';
        btn.style.background = 'rgba(56, 189, 248, 0.2)';
        btn.style.color = '#38BDF8';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.5)';
      } else {
        container.classList.remove('pose-fullscreen-mode');
        btn.innerHTML = 'Fullscreen';
        btn.style.background = 'rgba(255, 255, 255, 0.08)';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'var(--border-glass)';
      }
    });

    // Handle Escape key to exit fallback CSS fullscreen mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const container = document.getElementById('ex-section-pose-tracker');
        if (container && container.classList.contains('pose-fullscreen-mode')) {
          this.exitFullscreenMode();
        }
      }
    });
  }

  static toggleFullscreen() {
    const container = document.getElementById('ex-section-pose-tracker');
    if (!container) return;

    if (!document.fullscreenElement && !container.classList.contains('pose-fullscreen-mode')) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          this.enterFallbackFullscreen();
        });
      } else {
        this.enterFallbackFullscreen();
      }
    } else {
      this.exitFullscreenMode();
    }
  }

  static enterFallbackFullscreen() {
    const container = document.getElementById('ex-section-pose-tracker');
    const btn = document.getElementById('btn-toggle-pose-fullscreen');
    if (!container || !btn) return;
    container.classList.add('pose-fullscreen-mode');
    btn.innerHTML = 'Exit Fullscreen';
    btn.style.background = 'rgba(56, 189, 248, 0.2)';
    btn.style.color = '#38BDF8';
    btn.style.borderColor = 'rgba(56, 189, 248, 0.5)';
  }

  static exitFullscreenMode() {
    const container = document.getElementById('ex-section-pose-tracker');
    const btn = document.getElementById('btn-toggle-pose-fullscreen');
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (container) container.classList.remove('pose-fullscreen-mode');
    if (btn) {
      btn.innerHTML = 'Fullscreen';
      btn.style.background = 'rgba(255, 255, 255, 0.08)';
      btn.style.color = 'var(--text-secondary)';
      btn.style.borderColor = 'var(--border-glass)';
    }
  }

  static getAddedWeightKg() {
    const fsInput = document.getElementById('pose-fs-weight-input');
    const normalInput = document.getElementById('pose-added-weight-input');

    if (fsInput && document.activeElement === fsInput) {
      const val = parseFloat(fsInput.value);
      return isNaN(val) || val < 0 ? 0.0 : val;
    }
    if (normalInput) {
      const val = parseFloat(normalInput.value);
      return isNaN(val) || val < 0 ? 0.0 : val;
    }
    if (fsInput) {
      const val = parseFloat(fsInput.value);
      return isNaN(val) || val < 0 ? 0.0 : val;
    }
    return 0.0;
  }

  static async processUploadedVideo(file) {
    const videoElement = document.getElementById('pose-video');
    const statusBox = document.getElementById('pose-status-msg');

    if (!videoElement) return;

    this.stopCamera();
    this.resetCounter();

    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.style.background = 'rgba(56, 189, 248, 0.15)';
      statusBox.style.color = '#38BDF8';
      statusBox.textContent = `⏳ Loading video "${file.name}" for AI motion analysis...`;
    }

    try {
      if (!this.pose) {
        this.pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        this.pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        this.pose.onResults((results) => this.onResults(results));
      }

      const fileURL = URL.createObjectURL(file);
      videoElement.src = fileURL;
      videoElement.muted = true;
      this.isRunning = true;

      videoElement.onloadedmetadata = () => {
        videoElement.play();
        const processFrame = async () => {
          if (this.isRunning && !videoElement.paused && !videoElement.ended) {
            await this.pose.send({ image: videoElement });
            requestAnimationFrame(processFrame);
          }
        };
        processFrame();
      };

      videoElement.onended = () => {
        if (statusBox) {
          statusBox.style.display = 'block';
          statusBox.style.background = 'rgba(16, 185, 129, 0.15)';
          statusBox.style.color = '#10B981';
          statusBox.textContent = `✅ Video analysis complete! Detected ${this.repCount} reps. Click Save below to log set.`;
        }
      };

      document.getElementById('btn-start-pose-cam').style.display = 'none';
      document.getElementById('btn-stop-pose-cam').style.display = 'inline-flex';
    } catch (err) {
      console.error('[PoseTracker] Video upload error:', err);
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBox.style.color = '#EF4444';
        statusBox.textContent = `❌ Failed to process video file: ${err.message}`;
      }
    }
  }

  static updateExerciseInstructions() {
    const spec = this.EXERCISES[this.activeExercise];
    const titleEl = document.getElementById('pose-ex-title');
    const descEl = document.getElementById('pose-ex-desc');
    if (titleEl && spec) titleEl.textContent = spec.name;
    if (descEl && spec) descEl.textContent = spec.instruction;
  }

  static resetCounter() {
    this.repCount = 0;
    this.stage = 'UP';
    this.reachedBottom = false;
    this.lastRepTimestamp = 0;
    this.currentAngle = 0;
    this.formFeedback = { status: 'good', text: 'Counter reset. Get into position & begin!' };
    this.updateHUDUI();
  }

  static async startCamera() {
    const videoElement = document.getElementById('pose-video');
    const canvasElement = document.getElementById('pose-canvas');
    const statusBox = document.getElementById('pose-status-msg');

    if (!videoElement || !canvasElement) return;

    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.textContent = '⏳ Loading Google MediaPipe Pose AI Engine...';
    }

    try {
      if (typeof window.Pose === 'undefined' || typeof window.Camera === 'undefined') {
        throw new Error('MediaPipe Pose library scripts not loaded. Check internet connection.');
      }

      if (!this.pose) {
        this.pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        this.pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        this.pose.onResults((results) => this.onResults(results));
      }

      if (!this.camera) {
        this.camera = new window.Camera(videoElement, {
          onFrame: async () => {
            if (this.isRunning && this.pose) {
              await this.pose.send({ image: videoElement });
            }
          },
          width: 640,
          height: 480,
        });
      }

      await this.camera.start();
      this.isRunning = true;

      // Update UI Controls
      document.getElementById('btn-start-pose-cam').style.display = 'none';
      document.getElementById('btn-stop-pose-cam').style.display = 'inline-flex';
      if (statusBox) {
        statusBox.style.display = 'none';
      }
    } catch (err) {
      console.error('[PoseTracker] Camera error:', err);
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBox.style.color = '#EF4444';
        statusBox.textContent = `❌ Camera initialization failed: ${err.message}`;
      }
    }
  }

  static stopCamera() {
    this.isRunning = false;
    if (this.camera) {
      try {
        this.camera.stop();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      this.camera = null;
    }

    const startBtn = document.getElementById('btn-start-pose-cam');
    const stopBtn = document.getElementById('btn-stop-pose-cam');
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'none';

    // Clear Canvas
    const canvasElement = document.getElementById('pose-canvas');
    if (canvasElement) {
      const ctx = canvasElement.getContext('2d');
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
  }

  // Calculate 2D angle between 3 joint points (p1, p2 vertex, p3)
  static calculateAngle(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return 0;
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360.0 - angle;
    }
    return Math.round(angle);
  }

  static isEvaluatingFrame = false;

  static async onResults(results) {
    const canvasElement = document.getElementById('pose-canvas');
    const videoElement = document.getElementById('pose-video');
    if (!canvasElement || !videoElement) return;

    const ctx = canvasElement.getContext('2d');
    canvasElement.width = videoElement.videoWidth || 640;
    canvasElement.height = videoElement.videoHeight || 480;

    ctx.save();
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
      const lm = results.poseLandmarks;

      // Draw Skeleton & Bone Connections on Canvas locally for 60 FPS fluidity
      this.drawSkeleton(ctx, lm, canvasElement.width, canvasElement.height);

      // Delegate Joint Angles & Rep State Machine Evaluation to Python FastAPI Backend
      if (!this.isEvaluatingFrame) {
        this.isEvaluatingFrame = true;
        try {
          const evalPayload = {
            exercise: this.activeExercise,
            landmarks: lm.map((pt) => ({
              x: pt.x,
              y: pt.y,
              z: pt.z || 0.0,
              visibility: pt.visibility || 1.0,
            })),
            current_stage: this.stage,
            reached_bottom: this.reachedBottom,
            rep_count: this.repCount,
            last_rep_timestamp: this.lastRepTimestamp,
          };

          const res = await APIClient.request(ENDPOINTS.POSE_EVALUATE_FRAME, {
            method: 'POST',
            body: JSON.stringify(evalPayload),
          });

          if (res) {
            this.currentAngle = res.current_angle;
            this.stage = res.stage;
            this.reachedBottom = res.reached_bottom;
            this.repCount = res.rep_count;
            this.lastRepTimestamp = res.last_rep_timestamp;
            if (res.form_feedback) {
              this.formFeedback = res.form_feedback;
            }
          }
        } catch (err) {
          console.warn('[PoseTracker] Backend frame evaluation fallback:', err.message);
          // Fallback to local evaluation if network drops
          this.processExerciseRulesLocal(lm);
        } finally {
          this.isEvaluatingFrame = false;
        }
      }
    } else {
      this.formFeedback = { status: 'warning', text: 'Step into camera frame...' };
    }

    ctx.restore();
    this.updateHUDUI();
  }

  // Local fallback evaluation logic
  static processExerciseRulesLocal(lm) {
    const now = Date.now();
    const isVisible = (...indices) => indices.every((i) => lm[i] && lm[i].visibility > 0.55);

    if (this.activeExercise === 'squats') {
      if (!isVisible(23, 25, 27) && !isVisible(24, 26, 28)) return;
      const leftKnee = isVisible(23, 25, 27) ? this.calculateAngle(lm[23], lm[25], lm[27]) : null;
      const rightKnee = isVisible(24, 26, 28) ? this.calculateAngle(lm[24], lm[26], lm[28]) : null;
      const kneeAngle = leftKnee !== null && rightKnee !== null ? Math.round((leftKnee + rightKnee) / 2) : (leftKnee || rightKnee || 180);
      this.currentAngle = kneeAngle;

      if (kneeAngle <= 95) {
        this.stage = 'DOWN';
        this.reachedBottom = true;
      } else if (kneeAngle >= 160) {
        if (this.reachedBottom && (now - this.lastRepTimestamp > 800)) {
          this.repCount++;
          this.lastRepTimestamp = now;
          this.reachedBottom = false;
        }
        this.stage = 'UP';
      }
    } else if (this.activeExercise === 'pushups') {
      if (!isVisible(11, 13, 15) && !isVisible(12, 14, 16)) return;
      const leftElbow = isVisible(11, 13, 15) ? this.calculateAngle(lm[11], lm[13], lm[15]) : null;
      const rightElbow = isVisible(12, 14, 16) ? this.calculateAngle(lm[12], lm[14], lm[16]) : null;
      const elbowAngle = leftElbow !== null && rightElbow !== null ? Math.round((leftElbow + rightElbow) / 2) : (leftElbow || rightElbow || 180);
      this.currentAngle = elbowAngle;

      if (elbowAngle <= 90) {
        this.stage = 'DOWN';
        this.reachedBottom = true;
      } else if (elbowAngle >= 155) {
        if (this.reachedBottom && (now - this.lastRepTimestamp > 800)) {
          this.repCount++;
          this.lastRepTimestamp = now;
          this.reachedBottom = false;
        }
        this.stage = 'UP';
      }
    } else if (this.activeExercise === 'bicep_curls') {
      const leftElbow = isVisible(11, 13, 15) ? this.calculateAngle(lm[11], lm[13], lm[15]) : null;
      const rightElbow = isVisible(12, 14, 16) ? this.calculateAngle(lm[12], lm[14], lm[16]) : null;
      if (leftElbow === null && rightElbow === null) return;
      const activeAngle = leftElbow !== null && rightElbow !== null ? Math.min(leftElbow, rightElbow) : (leftElbow || rightElbow);
      this.currentAngle = activeAngle;

      if (activeAngle <= 50) {
        this.stage = 'DOWN';
        this.reachedBottom = true;
      } else if (activeAngle >= 150) {
        if (this.reachedBottom && (now - this.lastRepTimestamp > 800)) {
          this.repCount++;
          this.lastRepTimestamp = now;
          this.reachedBottom = false;
        }
        this.stage = 'UP';
      }
    }
  }

  static drawSkeleton(ctx, lm, width, height) {
    const connections = [
      [11, 12], [11, 13], [13, 15], // Left Arm
      [12, 14], [14, 16],           // Right Arm
      [11, 23], [12, 24], [23, 24], // Torso / Hips
      [23, 25], [25, 27],           // Left Leg
      [24, 26], [26, 28],           // Right Leg
    ];

    // Draw Bone Lines
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#10B981'; // Neon Accent Health Green

    connections.forEach(([i, j]) => {
      if (lm[i] && lm[j] && lm[i].visibility > 0.5 && lm[j].visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(lm[i].x * width, lm[i].y * height);
        ctx.lineTo(lm[j].x * width, lm[j].y * height);
        ctx.stroke();
      }
    });

    // Draw Joint Keypoint Circles
    const activeJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    activeJoints.forEach((idx) => {
      const pt = lm[idx];
      if (pt && pt.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#38BDF8'; // Vivid Cyan Joint Marker
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
      }
    });
  }

  static updateHUDUI() {
    const repValEl = document.getElementById('pose-hud-rep-count');
    const angleValEl = document.getElementById('pose-hud-angle');
    const stageValEl = document.getElementById('pose-hud-stage');
    const bannerEl = document.getElementById('pose-form-banner');
    const saveBtn = document.getElementById('btn-save-pose-workout');
    const fsWeightInput = document.getElementById('pose-fs-weight-input');
    const normalWeightInput = document.getElementById('pose-added-weight-input');
    const weight = this.getAddedWeightKg();

    if (repValEl) repValEl.textContent = this.repCount;
    if (angleValEl) angleValEl.textContent = `${this.currentAngle}°`;
    if (stageValEl) stageValEl.textContent = this.stage.toUpperCase();
    if (fsWeightInput && document.activeElement !== fsWeightInput) fsWeightInput.value = weight;
    if (normalWeightInput && document.activeElement !== normalWeightInput) normalWeightInput.value = weight;

    if (bannerEl) {
      bannerEl.textContent = this.formFeedback.text;
      if (this.formFeedback.status === 'good') {
        bannerEl.style.background = 'rgba(16, 185, 129, 0.2)';
        bannerEl.style.color = '#10B981';
        bannerEl.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      } else if (this.formFeedback.status === 'warning') {
        bannerEl.style.background = 'rgba(245, 158, 11, 0.2)';
        bannerEl.style.color = '#F59E0B';
        bannerEl.style.border = '1px solid rgba(245, 158, 11, 0.4)';
      } else if (this.formFeedback.status === 'danger') {
        bannerEl.style.background = 'rgba(239, 68, 68, 0.2)';
        bannerEl.style.color = '#EF4444';
        bannerEl.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      }
    }

    if (saveBtn) {
      if (this.repCount > 0) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        const addedWeight = this.getAddedWeightKg();
        const weightLabel = addedWeight > 0 ? ` • +${addedWeight}kg` : '';
        saveBtn.textContent = `Save Workout Set (${this.repCount} Reps${weightLabel})`;
      } else {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.textContent = 'Save Workout Set (0 Reps)';
      }
    }
  }

  static async saveWorkoutSet() {
    if (this.repCount <= 0 || this.isSaving) return;
    this.isSaving = true;

    const saveBtn = document.getElementById('btn-save-pose-workout');
    const statusBox = document.getElementById('pose-status-msg');

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Saving Workout Set...';
    }

    const addedWeight = this.getAddedWeightKg();
    const catalogIdMap = {
      squats: 'squats_bodyweight',
      pushups: 'pushups',
      bicep_curls: 'bicep_curls',
    };

    const exerciseCatalogId = catalogIdMap[this.activeExercise] || 'squats_bodyweight';

    // Delegate Net MET calorie burn, rest intervals, and mass load multiplier equations to backend!
    const payload = {
      exercise_id: exerciseCatalogId,
      sets: 1,
      reps: this.repCount,
      additional_weight_kg: addedWeight,
    };

    try {
      const result = await APIClient.request(ENDPOINTS.WORKOUTS_STRUCTURED, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (statusBox) {
        const cals = result ? result.calories_burned : 0;
        const name = result ? result.exercise_name : 'Workout Set';
        const weightNote = addedWeight > 0 ? ` with ${addedWeight} kg added weight` : '';
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBox.style.color = '#10B981';
        statusBox.textContent = `✅ Successfully logged set: ${this.repCount} reps of ${name}${weightNote} (${cals} Net kcal burned)!`;
      }

      this.resetCounter();

      // Dispatch single global custom event to refresh UI
      window.dispatchEvent(new CustomEvent('exercise:logged'));
    } catch (err) {
      console.error('[PoseTracker] Save workout error:', err);
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBox.style.color = '#EF4444';
        statusBox.textContent = `❌ Failed to log workout set: ${err.message}`;
      }
    } finally {
      this.isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    }
  }
}
