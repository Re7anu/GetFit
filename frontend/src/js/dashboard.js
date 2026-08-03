import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { LoggingManager } from './logging.js';

export class DashboardManager {
  static async render(container) {

    container.innerHTML = `
      <div class="dashboard-grid">
        <!-- Main Left Column: Hero Gauge + Embedded Macros + Logger Cards -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- Consolidated Hero Card: Caloric Budget + Integrated Macros -->
          <div class="glass-card hero-gauge-container">
            <h3 style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
              Daily Net Caloric Budget & Macronutrients
            </h3>

            <!-- SVG Gauge Ring -->
            <div class="gauge-svg-wrapper" style="margin-top: 0.5rem;">
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
            <div class="budget-equation-row" style="margin-bottom: 1.5rem;">
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

            <!-- Embedded Macronutrient Breakdown Bars inside the same Hero Card -->
            <div style="width: 100%; border-top: 1px solid var(--border-glass); padding-top: 1.25rem;">
              <h4 style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
                Macronutrient Split
              </h4>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <!-- Protein -->
                <div class="macro-group" style="margin-top: 0;">
                  <div class="macro-header">
                    <span style="font-weight: 600; font-size: 0.8rem;">Protein</span>
                    <span id="macro-protein-label" class="text-muted" style="font-size: 0.75rem;">0g / 0g</span>
                  </div>
                  <div class="macro-bar-bg">
                    <div id="macro-protein-bar" class="macro-bar-fill macro-bar-protein" style="width: 0%;"></div>
                  </div>
                </div>

                <!-- Carbs -->
                <div class="macro-group" style="margin-top: 0;">
                  <div class="macro-header">
                    <span style="font-weight: 600; font-size: 0.8rem;">Carbs</span>
                    <span id="macro-carb-label" class="text-muted" style="font-size: 0.75rem;">0g / 0g</span>
                  </div>
                  <div class="macro-bar-bg">
                    <div id="macro-carb-bar" class="macro-bar-fill macro-bar-carbs" style="width: 0%;"></div>
                  </div>
                </div>

                <!-- Fats -->
                <div class="macro-group" style="margin-top: 0;">
                  <div class="macro-header">
                    <span style="font-weight: 600; font-size: 0.8rem;">Fats</span>
                    <span id="macro-fat-label" class="text-muted" style="font-size: 0.75rem;">0g / 0g</span>
                  </div>
                  <div class="macro-bar-bg">
                    <div id="macro-fat-bar" class="macro-bar-fill macro-bar-fat" style="width: 0%;"></div>
                  </div>
                </div>
              </div>

              <!-- Micronutrient Intelligence Breakdown Bars -->
              <div style="width: 100%; border-top: 1px solid var(--border-glass); padding-top: 1.25rem; margin-top: 1.25rem;">
                <h4 style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                  <span>Micronutrient Intelligence (WHO / NIH RDAs)</span>
                  <span style="font-size: 0.75rem; text-transform: none; color: var(--accent-health); font-weight: 500;">Essential Vitamins & Minerals</span>
                </h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                  <!-- Fiber -->
                  <div class="macro-group" style="margin-top: 0;">
                    <div class="macro-header">
                      <span style="font-weight: 600; font-size: 0.8rem; color: #34D399;">🌾 Fiber</span>
                      <span id="micro-fiber-label" class="text-muted" style="font-size: 0.75rem;">0g / 30g</span>
                    </div>
                    <div class="macro-bar-bg">
                      <div id="micro-fiber-bar" class="macro-bar-fill" style="width: 0%; background: linear-gradient(90deg, #10B981, #34D399);"></div>
                    </div>
                  </div>

                  <!-- Sodium -->
                  <div class="macro-group" style="margin-top: 0;">
                    <div class="macro-header">
                      <span style="font-weight: 600; font-size: 0.8rem; color: #FBBF24;">🧂 Sodium</span>
                      <span id="micro-sodium-label" class="text-muted" style="font-size: 0.75rem;">0mg / 2300mg</span>
                    </div>
                    <div class="macro-bar-bg">
                      <div id="micro-sodium-bar" class="macro-bar-fill" style="width: 0%; background: linear-gradient(90deg, #F59E0B, #FBBF24);"></div>
                    </div>
                  </div>

                  <!-- Potassium -->
                  <div class="macro-group" style="margin-top: 0;">
                    <div class="macro-header">
                      <span style="font-weight: 600; font-size: 0.8rem; color: #60A5FA;">🥑 Potassium</span>
                      <span id="micro-potassium-label" class="text-muted" style="font-size: 0.75rem;">0mg / 3400mg</span>
                    </div>
                    <div class="macro-bar-bg">
                      <div id="micro-potassium-bar" class="macro-bar-fill" style="width: 0%; background: linear-gradient(90deg, #2563EB, #60A5FA);"></div>
                    </div>
                  </div>

                  <!-- Vitamin C -->
                  <div class="macro-group" style="margin-top: 0;">
                    <div class="macro-header">
                      <span style="font-weight: 600; font-size: 0.8rem; color: #F472B6;">🍊 Vitamin C</span>
                      <span id="micro-vitamin_c-label" class="text-muted" style="font-size: 0.75rem;">0mg / 90mg</span>
                    </div>
                    <div class="macro-bar-bg">
                      <div id="micro-vitamin_c-bar" class="macro-bar-fill" style="width: 0%; background: linear-gradient(90deg, #EC4899, #F472B6);"></div>
                    </div>
                  </div>

                  <!-- Calcium -->
                  <div class="macro-group" style="margin-top: 0;">
                    <div class="macro-header">
                      <span style="font-weight: 600; font-size: 0.8rem; color: #A7F3D0;">🥛 Calcium</span>
                      <span id="micro-calcium-label" class="text-muted" style="font-size: 0.75rem;">0mg / 1000mg</span>
                    </div>
                    <div class="macro-bar-bg">
                      <div id="micro-calcium-bar" class="macro-bar-fill" style="width: 0%; background: linear-gradient(90deg, #059669, #A7F3D0);"></div>
                    </div>
                  </div>

                  <!-- Iron -->
                  <div class="macro-group" style="margin-top: 0;">
                    <div class="macro-header">
                      <span style="font-weight: 600; font-size: 0.8rem; color: #C084FC;">🥩 Iron</span>
                      <span id="micro-iron-label" class="text-muted" style="font-size: 0.75rem;">0mg / 18mg</span>
                    </div>
                    <div class="macro-bar-bg">
                      <div id="micro-iron-bar" class="macro-bar-fill" style="width: 0%; background: linear-gradient(90deg, #9333EA, #C084FC);"></div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Right Sidebar Column: Physical Profile (Top) + Scrollable Activity Timeline (Bottom) -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- 1. Physical Profile Target Card (Positioned at Top) -->
          <div class="glass-card">
            <h4 style="font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase;">Physical Profile</h4>
            <div id="profile-summary-box" style="margin-top: 0.75rem; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
              <p class="text-muted">Loading profile...</p>
            </div>
          </div>

          <!-- 2. Today's Activity Logged List with Dedicated Glass Scrollbar (Positioned Below Profile) -->
          <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-size: 1rem; margin: 0;">Today's Activity Timeline</h3>
              <span class="text-muted" style="font-size: 0.75rem;">Summary Log</span>
            </div>

            <!-- Scrollable Timeline Container with Fixed Height -->
            <div id="activity-list" class="scrollable-timeline" style="display: flex; flex-direction: column; gap: 0.75rem;">
              <p class="text-muted" style="font-size: 0.85rem;">No meals or workouts logged today yet.</p>
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

    // Update Micronutrient Bars
    this.updateMicroBar('fiber', summary.consumed_fiber_g, summary.target_fiber_g || 30.0, 'g');
    this.updateMicroBar('sodium', summary.consumed_sodium_mg, summary.target_sodium_mg || 2300.0, 'mg');
    this.updateMicroBar('potassium', summary.consumed_potassium_mg, summary.target_potassium_mg || 3400.0, 'mg');
    this.updateMicroBar('vitamin_c', summary.consumed_vitamin_c_mg, summary.target_vitamin_c_mg || 90.0, 'mg');
    this.updateMicroBar('calcium', summary.consumed_calcium_mg, summary.target_calcium_mg || 1000.0, 'mg');
    this.updateMicroBar('iron', summary.consumed_iron_mg, summary.target_iron_mg || 18.0, 'mg');
  }

  static updateMacroBar(type, consumed, target) {
    const label = document.getElementById(`macro-${type}-label`);
    const bar = document.getElementById(`macro-${type}-bar`);
    if (!label || !bar) return;

    label.textContent = `${consumed}g / ${target}g`;
    const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
    bar.style.width = `${pct}%`;
  }

  static updateMicroBar(type, consumed, target, unit = 'mg') {
    const label = document.getElementById(`micro-${type}-label`);
    const bar = document.getElementById(`micro-${type}-bar`);
    if (!label || !bar) return;

    const consVal = consumed !== undefined ? consumed : 0;
    label.textContent = `${consVal}${unit} / ${target}${unit}`;
    const pct = target > 0 ? Math.min((consVal / target) * 100, 100) : 0;
    bar.style.width = `${pct}%`;
  }

  static renderActivityList(meals = [], workouts = []) {
    const container = document.getElementById('activity-list');
    if (!container) return;

    // Store raw lists for editing lookup
    this.rawMeals = meals || [];
    this.rawWorkouts = workouts || [];

    // Standardize timeline entries
    const mealItems = (meals || []).map(m => ({
      id: m.id,
      type: 'meal',
      title: m.description,
      subtitle: `${m.meal_type} • ${m.protein_g}g P • ${m.carbs_g}g C • ${m.fat_g}g F`,
      calories: `+${m.calories} kcal`,
      color: 'var(--accent-health)',
      time: new Date(m.logged_at),
    }));

    const workoutItems = (workouts || []).map(w => ({
      id: w.id,
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
      <div class="activity-card-row" data-id="${item.id}" data-type="${item.type}" style="background: rgba(9, 12, 16, 0.6); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.65rem 0.85rem; display: flex; justify-content: space-between; align-items: center; position: relative; ${item.type === 'meal' ? 'cursor: pointer;' : ''}">
        <div>
          <div style="font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem;">
            <span>${item.type === 'meal' ? '🥗' : '⚡'}</span> ${item.title}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-top: 0.15rem;">
            ${item.subtitle}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem; position: relative;">
          <div style="font-family: var(--font-heading); font-weight: 700; font-size: 0.85rem; color: ${item.color};">
            ${item.calories}
          </div>
          
          <!-- Sleek Kebab 3-Dots Menu -->
          <div class="kebab-wrapper" style="position: relative;">
            <button class="kebab-btn" style="background: transparent; border: none; color: var(--text-secondary); font-size: 1.1rem; cursor: pointer; padding: 0 0.25rem;" title="Options">
              &#8942;
            </button>
            <div class="kebab-menu" style="display: none; position: absolute; right: 0; top: 110%; background: #161B22; border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.35rem; min-width: 135px; box-shadow: var(--shadow-card); z-index: 100;">
              ${item.type === 'meal' ? `
                <button class="kebab-item action-view-detail" data-id="${item.id}" style="width: 100%; text-align: left; background: transparent; border: none; color: var(--accent-health); padding: 0.35rem 0.5rem; font-size: 0.8rem; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
                  🔍 Details
                </button>
              ` : ''}
              <button class="kebab-item action-edit" data-id="${item.id}" data-type="${item.type}" style="width: 100%; text-align: left; background: transparent; border: none; color: var(--text-primary); padding: 0.35rem 0.5rem; font-size: 0.8rem; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 0.35rem;">
                ✏️ Edit
              </button>
              <button class="kebab-item action-delete-prompt" data-id="${item.id}" data-type="${item.type}" style="width: 100%; text-align: left; background: transparent; border: none; color: #EF4444; padding: 0.35rem 0.5rem; font-size: 0.8rem; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 0.35rem;">
                🗑️ Delete
              </button>
              
              <!-- Kebab Inline Delete Confirmation -->
              <div class="kebab-delete-confirm" style="display: none; padding: 0.4rem 0.3rem; text-align: center; background: rgba(239,68,68,0.12); border-radius: 6px; margin-top: 0.2rem;">
                <div style="font-size: 0.7rem; font-weight: 700; color: #EF4444; margin-bottom: 0.35rem;">Delete this ${item.type}?</div>
                <div style="display: flex; gap: 0.3rem; justify-content: center;">
                  <button class="btn-cancel-kebab-delete" style="background: rgba(255,255,255,0.08); color: var(--text-secondary); border: none; padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.7rem; cursor: pointer;">No</button>
                  <button class="btn-confirm-kebab-delete" data-id="${item.id}" data-type="${item.type}" style="background: #EF4444; color: white; border: none; padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; cursor: pointer;">Yes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Row click listener for meals
    container.querySelectorAll('.activity-card-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.kebab-wrapper')) return;
        const type = row.getAttribute('data-type');
        const id = row.getAttribute('data-id');
        if (type === 'meal') {
          const meal = (this.rawMeals || []).find(m => m.id === id);
          if (meal) {
            LoggingManager.openMealDetailModal(meal);
          }
        }
      });
    });

    this.bindKebabHandlers();
  }

  static bindKebabHandlers() {
    // Toggle Kebab Menu Dropdown
    document.querySelectorAll('.kebab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.nextElementSibling;
        document.querySelectorAll('.kebab-menu').forEach(m => {
          if (m !== menu) {
            m.style.display = 'none';
            const confirmBox = m.querySelector('.kebab-delete-confirm');
            if (confirmBox) confirmBox.style.display = 'none';
          }
        });
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
    });

    // Close menus when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.kebab-menu').forEach(m => {
        m.style.display = 'none';
        const confirmBox = m.querySelector('.kebab-delete-confirm');
        if (confirmBox) confirmBox.style.display = 'none';
      });
    });

    // Handle View Details Click
    document.querySelectorAll('.action-view-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const meal = (this.rawMeals || []).find(m => m.id === id);
        if (meal) {
          LoggingManager.openMealDetailModal(meal);
        }
      });
    });

    // Handle Delete Prompt Toggle
    document.querySelectorAll('.action-delete-prompt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.closest('.kebab-menu');
        const confirmBox = menu ? menu.querySelector('.kebab-delete-confirm') : null;
        if (confirmBox) {
          confirmBox.style.display = confirmBox.style.display === 'block' ? 'none' : 'block';
        }
      });
    });

    // Handle Cancel Kebab Delete
    document.querySelectorAll('.btn-cancel-kebab-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.closest('.kebab-menu');
        if (menu) menu.style.display = 'none';
      });
    });

    // Handle Confirm Kebab Delete Click
    document.querySelectorAll('.btn-confirm-kebab-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const type = btn.getAttribute('data-type');
        if (!id || !type) return;

        const card = btn.closest('.activity-card-row');
        if (card) {
          card.style.opacity = '0.3';
          card.style.pointerEvents = 'none';
        }

        try {
          const endpoint = type === 'meal' ? `${ENDPOINTS.MEALS}/${id}` : `${ENDPOINTS.WORKOUTS_BASE}/${id}`;
          await APIClient.request(endpoint, { method: 'DELETE' });
          if (type === 'meal') {
            window.dispatchEvent(new CustomEvent('meal:logged'));
          } else {
            window.dispatchEvent(new CustomEvent('exercise:logged'));
          }
          await DashboardManager.fetchAndRenderData();
        } catch (err) {
          console.error(`Failed to delete ${type}:`, err);
          if (card) {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
          }
        }
      });
    });

    // Handle Edit Click
    document.querySelectorAll('.action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const type = btn.getAttribute('data-type');
        if (!id || !type) return;

        window.dispatchEvent(new CustomEvent('activity:edit', { detail: { id, type, meals: this.rawMeals, workouts: this.rawWorkouts } }));
      });
    });
  }


}
