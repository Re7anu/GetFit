/* Dashboard Manager: Hero SVG Calorie Ring & Live Budget Renderer */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';

export class DashboardManager {
  static async render(container) {
    container.innerHTML = `
      <div class="dashboard-grid">
        <!-- Main Hero Column -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Hero SVG Gauge Card -->
          <div class="glass-card hero-gauge-container">
            <h3 style="font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
              Daily Net Caloric Budget
            </h3>

            <div class="gauge-svg-wrapper" style="margin-top: 1rem;">
              <svg class="gauge-svg" viewBox="0 0 240 240">
                <circle class="gauge-bg-ring" cx="120" cy="120" r="100" />
                <circle id="hero-progress-ring" class="gauge-progress-ring" cx="120" cy="120" r="100" />
              </svg>
              <div class="gauge-center-content">
                <div id="remaining-cals-val" class="gauge-value">----</div>
                <div class="gauge-label">Kcal Remaining</div>
              </div>
            </div>

            <!-- Dynamic Equation Row -->
            <div class="budget-equation-row">
              <div class="equation-item">
                <div id="eq-base-val" class="equation-val text-emerald">0</div>
                <div class="equation-lbl">Base Target</div>
              </div>
              <div class="equation-operator">+</div>
              <div class="equation-item">
                <div id="eq-burn-val" class="equation-val text-cobalt">0</div>
                <div class="equation-lbl">Exercise Burn</div>
              </div>
              <div class="equation-operator">-</div>
              <div class="equation-item">
                <div id="eq-consumed-val" class="equation-val" style="color: #F87171;">0</div>
                <div class="equation-lbl">Food Consumed</div>
              </div>
            </div>
          </div>

          <!-- Food AI Logger & Structured 2-Step Exercise Logger Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <!-- AI Meal Logger -->
            <div class="glass-card">
              <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>🥗</span> Log Meal with Gemini AI
              </h4>
              <form id="ai-meal-form" class="ai-prompt-bar">
                <input type="text" id="ai-meal-input" class="ai-prompt-input" placeholder="E.g., '2 eggs and toast'..." required />
                <button type="submit" id="ai-meal-btn" class="btn btn-primary" style="padding: 0.5rem 0.8rem; font-size: 0.8rem;">
                  Parse Meal
                </button>
              </form>
              <div id="ai-meal-status" style="display:none; font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent-health);"></div>
            </div>

            <!-- Structured 2-Step Scientific Exercise Logger Card -->
            <div class="glass-card">
              <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>⚡</span> Structured Workout Logger
              </h4>
              <form id="dash-structured-ex-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- Step 1: Category Selection -->
                <select id="dash-ex-cat-select" class="form-input" style="padding: 0.5rem; font-size: 0.85rem;" required>
                  <option value="">1. Select Category...</option>
                  <option value="distance">Distance-Based (Running, Cycling, Swimming)</option>
                  <option value="reps">Reps & Sets-Based (Pushups, Squats, Weightlifting)</option>
                  <option value="time">Time & Intensity-Based (Yoga, HIIT, Basketball)</option>
                </select>

                <!-- Step 2: Specific Exercise Selection -->
                <select id="dash-ex-item-select" class="form-input" style="padding: 0.5rem; font-size: 0.85rem; display: none;" required>
                  <option value="">2. Select Specific Exercise...</option>
                </select>

                <!-- Step 3: Dynamic Required Metric Fields -->
                <div id="dash-ex-dynamic-fields" style="display: none;"></div>

                <button type="submit" id="dash-ex-btn" class="btn btn-cobalt" style="padding: 0.5rem; font-size: 0.85rem; display: none;">
                  Calculate & Log Workout
                </button>
              </form>
              <div id="dash-ex-status" style="display:none; font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent-workout);"></div>
            </div>
          </div>

          <!-- Today's Activity Logged List -->
          <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3>Today's Meals & Workouts</h3>
              <div style="display: flex; gap: 0.5rem;">
                <button id="btn-manual-meal" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">+ Manual Meal</button>
                <button id="btn-manual-exercise" class="btn btn-cobalt" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">+ Manual Workout</button>
              </div>
            </div>

            <div id="activity-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
              <p class="text-muted" style="font-size: 0.85rem;">No meals or workouts logged today yet.</p>
            </div>
          </div>
        </div>

        <!-- Sidebar Column: Macro Breakdown & Profile Stats -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Macro Targets Card -->
          <div class="glass-card">
            <h3>Macronutrient Breakdown</h3>
            
            <div class="macro-group">
              <div class="macro-header">
                <span style="font-weight: 600;">Protein</span>
                <span id="macro-protein-label" class="text-muted">0g / 0g</span>
              </div>
              <div class="macro-bar-bg">
                <div id="macro-protein-bar" class="macro-bar-fill macro-bar-protein" style="width: 0%;"></div>
              </div>
            </div>

            <div class="macro-group">
              <div class="macro-header">
                <span style="font-weight: 600;">Carbohydrates</span>
                <span id="macro-carb-label" class="text-muted">0g / 0g</span>
              </div>
              <div class="macro-bar-bg">
                <div id="macro-carb-bar" class="macro-bar-fill macro-bar-carbs" style="width: 0%;"></div>
              </div>
            </div>

            <div class="macro-group">
              <div class="macro-header">
                <span style="font-weight: 600;">Fats</span>
                <span id="macro-fat-label" class="text-muted">0g / 0g</span>
              </div>
              <div class="macro-bar-bg">
                <div id="macro-fat-bar" class="macro-bar-fill macro-bar-fat" style="width: 0%;"></div>
              </div>
            </div>
          </div>

          <!-- Physical Profile Target Card -->
          <div class="glass-card">
            <h3>Physical Profile & Target</h3>
            <div id="profile-summary-box" style="margin-top: 1rem; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <p class="text-muted">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.fetchAndRenderData();
  }

  static async fetchAndRenderData() {
    try {
      const summary = await APIClient.request(ENDPOINTS.NUTRITION_SUMMARY);
      this.updateGaugeAndSummary(summary);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    }

    try {
      const [meals, workouts] = await Promise.all([
        APIClient.request(ENDPOINTS.MEALS_TODAY).catch(() => []),
        APIClient.request(ENDPOINTS.EXERCISES_TODAY).catch(() => []),
      ]);
      this.renderActivityList(meals, workouts);
    } catch (err) {
      console.error('Failed to load activity list:', err);
    }

    try {
      const profile = await APIClient.request(ENDPOINTS.PROFILE_ME);
      this.renderProfileBox(profile);
    } catch (err) {
      console.error('Failed to load profile summary:', err);
    }
  }

  static renderProfileBox(profile) {
    const box = document.getElementById('profile-summary-box');
    if (!box) return;

    box.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Name:</span>
        <span style="font-weight: 600;">${profile.name}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Current Weight:</span>
        <span style="font-weight: 600;">${profile.weight_kg} kg</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Target Weight:</span>
        <span style="font-weight: 600;">${profile.target_weight_kg} kg</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">BMR / TDEE:</span>
        <span style="font-weight: 600;">${Math.round(profile.bmr)} / ${Math.round(profile.tdee)} kcal</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Caloric Pace:</span>
        <span style="font-weight: 700; color: var(--accent-health);">${profile.caloric_pace_kcal_per_day} kcal/day</span>
      </div>
    `;
  }

  static updateGaugeAndSummary(summary) {
    const remainingEl = document.getElementById('remaining-cals-val');
    const baseEl = document.getElementById('eq-base-val');
    const burnEl = document.getElementById('eq-burn-val');
    const consumedEl = document.getElementById('eq-consumed-val');
    const ringEl = document.getElementById('hero-progress-ring');

    if (!remainingEl) return;

    remainingEl.textContent = summary.remaining_calories;
    baseEl.textContent = summary.base_calorie_target;
    burnEl.textContent = summary.exercise_net_calories_burned;
    consumedEl.textContent = summary.consumed_calories;

    // SVG Circumference = 2 * PI * 100 = 628
    const target = summary.adjusted_calorie_target || 2000;
    const pct = Math.min(Math.max(summary.consumed_calories / target, 0), 1);
    const offset = 628 * (1 - pct);
    ringEl.style.strokeDashoffset = offset;

    // Update Macro Bars
    this.updateMacroBar('protein', summary.consumed_protein_g, summary.target_protein_g);
    this.updateMacroBar('carb', summary.consumed_carb_g, summary.target_carb_g);
    this.updateMacroBar('fat', summary.consumed_fat_g, summary.target_fat_g);
  }

  static updateMacroBar(type, consumed, target) {
    const label = document.getElementById(`macro-${type}-label`);
    const bar = document.getElementById(`macro-${type}-bar`);
    if (!label || !bar) return;

    label.textContent = `${consumed}g / ${target}g`;
    const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
    bar.style.width = `${pct}%`;
  }

  static renderActivityList(meals = [], workouts = []) {
    const container = document.getElementById('activity-list');
    if (!container) return;

    // Standardize timeline entries
    const mealItems = (meals || []).map(m => ({
      type: 'meal',
      title: m.description,
      subtitle: `${m.meal_type} • ${m.protein_g}g P • ${m.carbs_g}g C • ${m.fat_g}g F`,
      calories: `+${m.calories} kcal`,
      color: 'var(--accent-health)',
      time: new Date(m.logged_at),
    }));

    const workoutItems = (workouts || []).map(w => ({
      type: 'workout',
      title: w.exercise_name,
      subtitle: `${w.duration_minutes} mins • MET ${w.met_value}${w.notes ? ' • ' + w.notes : ''}`,
      calories: `-${w.calories_burned} kcal (Net)`,
      color: 'var(--accent-workout)',
      time: new Date(w.logged_at),
    }));

    const combined = [...mealItems, ...workoutItems].sort((a, b) => b.time - a.time);

    if (combined.length === 0) {
      container.innerHTML = `<p class="text-muted" style="font-size: 0.85rem;">No meals or workouts logged today yet.</p>`;
      return;
    }

    container.innerHTML = combined.map(item => `
      <div style="background: rgba(9, 12, 16, 0.6); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem;">
            <span>${item.type === 'meal' ? '🥗' : '⚡'}</span> ${item.title}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-top: 0.15rem;">
            ${item.subtitle}
          </div>
        </div>
        <div style="font-family: var(--font-heading); font-weight: 700; color: ${item.color};">
          ${item.calories}
        </div>
      </div>
    `).join('');
  }
}
