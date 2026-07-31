/* Workout Plan Manager: 7-Day Routine Blueprint, Individual Muscle Checkboxes, & Fitness Focus Setup */

import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { DashboardManager } from './dashboard.js';

export class WorkoutPlanManager {
  static init() {
    if (this.initialized) return;
    this.initialized = true;
    this.planData = null;
    this.renderModalDOM();
    this.bindEvents();
  }

  static async fetchPlan() {
    try {
      this.planData = await APIClient.request(ENDPOINTS.WORKOUT_PLAN);
      return this.planData;
    } catch (err) {
      console.error('Failed to fetch workout plan:', err);
      return null;
    }
  }

  static renderModalDOM() {
    if (document.getElementById('workout-plan-modal')) return;

    const modalHTML = `
      <div id="workout-plan-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 780px; max-height: 90vh; overflow-y: auto; padding: 1.5rem;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.85rem; margin-bottom: 1.2rem;">
            <div>
              <h2 style="font-size: 1.25rem; font-family: var(--font-heading); margin: 0;">📋 Weekly Routine & Fitness Focus Setup</h2>
              <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Configure your training philosophy and custom 7-day workout routine blueprint.</p>
            </div>
            <button class="close-btn" id="close-workout-plan-modal" style="background: transparent; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer;">&times;</button>
          </div>

          <form id="workout-plan-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Section 1: Fitness Philosophy Selection -->
            <div class="glass-card" style="background: rgba(22, 27, 34, 0.7); border: 1px solid var(--border-glass-glow); padding: 1.1rem;">
              <h3 style="font-size: 0.95rem; font-family: var(--font-heading); margin-bottom: 0.75rem; color: var(--accent-health); display: flex; align-items: center; gap: 0.4rem;">
                🎯 Select Your Fitness Philosophy
              </h3>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.75rem;">
                
                <label class="focus-option-card" style="background: rgba(16,185,129,0.06); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.85rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.35rem; position: relative;">
                  <input type="radio" name="plan-fitness-focus" value="bodybuilding" style="position: absolute; top: 0.85rem; right: 0.85rem;" />
                  <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary);">🏆 Bodybuilding</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Hypertrophy & high-volume weightlifting.</div>
                  <div style="font-size: 0.7rem; color: var(--accent-health); font-weight: 700; margin-top: 0.2rem;">Base: 1.8 g/kg | Max Cap: 2.5 g/kg</div>
                </label>

                <label class="focus-option-card" style="background: rgba(16,185,129,0.06); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.85rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.35rem; position: relative;">
                  <input type="radio" name="plan-fitness-focus" value="athletic" checked style="position: absolute; top: 0.85rem; right: 0.85rem;" />
                  <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary);">⚡ Athletic Build</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Balanced strength, power & conditioning.</div>
                  <div style="font-size: 0.7rem; color: var(--accent-health); font-weight: 700; margin-top: 0.2rem;">Base: 1.6 g/kg | Max Cap: 2.2 g/kg</div>
                </label>

                <label class="focus-option-card" style="background: rgba(16,185,129,0.06); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.85rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.35rem; position: relative;">
                  <input type="radio" name="plan-fitness-focus" value="sports_endurance" style="position: absolute; top: 0.85rem; right: 0.85rem;" />
                  <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary);">⚽ Sports & Endurance</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Field sports, running & high-stamina fuel.</div>
                  <div style="font-size: 0.7rem; color: var(--accent-health); font-weight: 700; margin-top: 0.2rem;">Base: 1.4 g/kg | Max Cap: 2.0 g/kg</div>
                </label>

              </div>
            </div>

            <!-- Section 2: 7-Day Weekly Schedule Builder -->
            <div class="glass-card" style="background: rgba(22, 27, 34, 0.7); padding: 1.1rem;">
              <h3 style="font-size: 0.95rem; font-family: var(--font-heading); margin-bottom: 0.75rem; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between;">
                <span>🗓️ Configure 7-Day Routine Blueprint</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">Select individual target muscles or sports per day</span>
              </h3>

              <div id="plan-days-builder" style="display: flex; flex-direction: column; gap: 1rem;">
                <!-- Dynamically populated 7 days -->
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
              <button type="button" id="btn-cancel-plan-modal" class="btn" style="padding: 0.55rem 1.1rem; font-size: 0.85rem;">Cancel</button>
              <button type="submit" id="btn-save-plan-modal" class="btn btn-primary" style="padding: 0.55rem 1.4rem; font-size: 0.85rem; font-weight: 700;">
                💾 Save Weekly Routine & Focus
              </button>
            </div>

          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static bindEvents() {
    // Open modal button
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-open-workout-plan') || e.target.closest('#btn-edit-plan-modal')) {
        this.openSetupModal();
      }

      if (e.target.id === 'close-workout-plan-modal' || e.target.id === 'btn-cancel-plan-modal') {
        const modal = document.getElementById('workout-plan-modal');
        if (modal) modal.classList.remove('active');
      }

      // 1-Tap Toggle Day Completion Checkbox on Schedule Grid Tile
      const toggleBtn = e.target.closest('.btn-toggle-plan-day');
      if (toggleBtn) {
        const day = toggleBtn.getAttribute('data-day');
        if (day) {
          this.toggleDayCompletion(day);
        }
      }
    });

    // Form Submit Handler
    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'workout-plan-form') {
        e.preventDefault();
        await this.savePlanFromForm();
      }
    });
  }

  static async toggleDayCompletion(day) {
    try {
      const updatedPlan = await APIClient.request(`${ENDPOINTS.WORKOUT_PLAN_TOGGLE}?day=${day}`, {
        method: 'POST',
      });
      this.planData = updatedPlan;
      window.dispatchEvent(new CustomEvent('exercise:logged'));
      await DashboardManager.fetchAndRenderData();
      this.renderScheduleGrid();
    } catch (err) {
      alert(`Failed to update day completion: ${err.message}`);
    }
  }

  static async openSetupModal() {
    const modal = document.getElementById('workout-plan-modal');
    if (!modal) return;

    if (!this.planData) {
      await this.fetchPlan();
    }

    const data = this.planData || {};
    const currentFocus = data.fitness_focus || 'athletic';

    // Set radio selection
    const radios = modal.querySelectorAll('input[name="plan-fitness-focus"]');
    radios.forEach(r => {
      r.checked = r.value === currentFocus;
    });

    // Render 7-day builder inputs
    const builderContainer = document.getElementById('plan-days-builder');
    const daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentScheduleMap = {};

    (data.weekly_schedule || []).forEach(item => {
      const dKey = item.day ? item.day.toLowerCase() : '';
      currentScheduleMap[dKey] = item;
    });

    const muscleOptions = [
      { id: 'chest', label: 'Chest' },
      { id: 'back', label: 'Back' },
      { id: 'shoulders', label: 'Shoulders' },
      { id: 'biceps', label: 'Biceps' },
      { id: 'triceps', label: 'Triceps' },
      { id: 'quads', label: 'Quads' },
      { id: 'hamstrings', label: 'Hamstrings' },
      { id: 'glutes', label: 'Glutes' },
      { id: 'calves', label: 'Calves' },
      { id: 'abs', label: 'Abs / Core' },
      { id: 'forearms', label: 'Forearms' },
    ];

    const sportsOptions = [
      { id: 'football', label: '⚽ Football' },
      { id: 'cricket', label: '🏏 Cricket' },
      { id: 'basketball', label: '🏀 Basketball' },
      { id: 'tennis', label: '🎾 Tennis' },
      { id: 'padel', label: '🏓 Padel' },
      { id: 'badminton', label: '🏸 Badminton' },
    ];

    const cardioOptions = [
      { id: 'walking', label: '🚶 Walking' },
      { id: 'running', label: '🏃 Running' },
      { id: 'cycling', label: '🚴 Cycling' },
      { id: 'swimming', label: '🏊 Swimming' },
      { id: 'hiit', label: '⚡ HIIT' },
    ];

    builderContainer.innerHTML = daysList.map(d => {
      const existing = currentScheduleMap[d] || { activity_type: 'rest', targets: [], is_completed: false };
      const capitalizedDay = d.charAt(0).toUpperCase() + d.slice(1);

      return `
        <div class="day-builder-row" data-day="${d}" style="background: rgba(9, 12, 16, 0.6); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 800; font-size: 0.9rem; color: var(--accent-health); text-transform: uppercase;">
              ${capitalizedDay}
            </div>

            <div style="display: flex; gap: 0.4rem;">
              <select class="form-input day-activity-select" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: #161B22;" data-day="${d}">
                <option value="rest" ${existing.activity_type === 'rest' ? 'selected' : ''}>😴 Rest Day</option>
                <option value="gym" ${existing.activity_type === 'gym' ? 'selected' : ''}>🏋️ Gym / Strength Split</option>
                <option value="sports" ${existing.activity_type === 'sports' ? 'selected' : ''}>⚽ Field Sports / Game</option>
                <option value="cardio" ${existing.activity_type === 'cardio' ? 'selected' : ''}>🏃 Cardio / Movement</option>
              </select>
            </div>
          </div>

          <!-- Target Checkboxes Section -->
          <div class="day-targets-box" id="targets-box-${d}" style="display: ${existing.activity_type === 'rest' ? 'none' : 'block'}; margin-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 0.5rem;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.4rem; font-weight: 600;">
              Select Target Muscle Groups or Activities for ${capitalizedDay}:
            </div>

            <div class="target-checkboxes-grid" style="display: flex; flex-wrap: wrap; gap: 0.4rem 0.75rem; font-size: 0.8rem;">
              ${[...muscleOptions, ...sportsOptions, ...cardioOptions].map(opt => {
                const checked = (existing.targets || []).includes(opt.id);
                return `
                  <label style="display: inline-flex; align-items: center; gap: 0.3rem; color: var(--text-primary); cursor: pointer; background: rgba(255,255,255,0.04); padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-glass);">
                    <input type="checkbox" name="target-${d}" value="${opt.id}" ${checked ? 'checked' : ''} />
                    <span>${opt.label}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Toggle targets box display when activity select changes
    builderContainer.querySelectorAll('.day-activity-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const d = select.getAttribute('data-day');
        const box = document.getElementById(`targets-box-${d}`);
        if (box) {
          box.style.display = select.value === 'rest' ? 'none' : 'block';
        }
      });
    });

    modal.classList.add('active');
  }

  static async savePlanFromForm() {
    const modal = document.getElementById('workout-plan-modal');
    if (!modal) return;

    const selectedFocus = modal.querySelector('input[name="plan-fitness-focus"]:checked')?.value || 'athletic';
    const daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const newSchedule = [];

    daysList.forEach(d => {
      const select = modal.querySelector(`.day-activity-select[data-day="${d}"]`);
      const actType = select ? select.value : 'rest';
      const checkedInputs = modal.querySelectorAll(`input[name="target-${d}"]:checked`);
      const targets = Array.from(checkedInputs).map(cb => cb.value);

      const existingCompleted = (this.planData?.weekly_schedule || []).find(x => (x.day || '').toLowerCase() === d)?.is_completed || false;

      newSchedule.push({
        day: d,
        activity_type: actType,
        targets: actType === 'rest' ? [] : targets,
        is_completed: existingCompleted,
      });
    });

    try {
      const saveBtn = document.getElementById('btn-save-plan-modal');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving Schedule...';
      }

      const updatedPlan = await APIClient.request(ENDPOINTS.WORKOUT_PLAN, {
        method: 'POST',
        body: JSON.stringify({
          fitness_focus: selectedFocus,
          schedule: newSchedule,
        }),
      });

      this.planData = updatedPlan;
      modal.classList.remove('active');
      window.dispatchEvent(new CustomEvent('exercise:logged'));
      await DashboardManager.fetchAndRenderData();
      this.renderScheduleGrid();
    } catch (err) {
      alert(`Failed to save weekly routine plan: ${err.message}`);
    } finally {
      const saveBtn = document.getElementById('btn-save-plan-modal');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Weekly Routine & Focus';
      }
    }
  }

  static async renderScheduleGrid(container) {
    const targetBox = container || document.getElementById('weekly-plan-schedule-box');
    if (!targetBox) return;

    if (!this.planData) {
      await this.fetchPlan();
    }

    const data = this.planData || {};
    const schedule = data.weekly_schedule || [];
    const focus = data.fitness_focus || 'athletic';

    const focusTitles = {
      bodybuilding: '🏆 Bodybuilding (Hypertrophy)',
      athletic: '⚡ Athletic Build (Functional Fitness)',
      sports_endurance: '⚽ Sports & Endurance Focus',
    };

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = new Date().getDay();
    const todayName = daysOfWeek[todayIndex];

    const completedCount = schedule.filter(x => x.is_completed).length;

    targetBox.innerHTML = `
      <div class="glass-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 17, 23, 0.7) 100%); border: 1px solid var(--border-glass-glow); padding: 1.25rem;">
        
        <!-- Header Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h3 style="font-size: 1.1rem; font-family: var(--font-heading); margin: 0; color: var(--text-primary);">
                📋 Weekly Routine Blueprint
              </h3>
              <span style="background: rgba(16,185,129,0.2); color: var(--accent-health); font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.55rem; border-radius: 999px;">
                ${focusTitles[focus] || '⚡ Athletic Build'}
              </span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Protein Target: <strong>${data.calculated_base_protein_g}g</strong> baseline | Max Cap: <strong style="color: var(--accent-health);">${data.calculated_max_protein_cap_g}g</strong> (${data.max_protein_cap_g_per_kg} g/kg)
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="text-align: right;">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Weekly Progress</div>
              <div style="font-size: 0.95rem; font-weight: 800; color: var(--accent-health); font-family: var(--font-heading);">
                ${completedCount} / 7 Days Done
              </div>
            </div>
            <button id="btn-edit-plan-modal" class="btn" style="background: rgba(255,255,255,0.08); color: var(--text-primary); border: 1px solid var(--border-glass); padding: 0.4rem 0.85rem; font-size: 0.8rem; font-weight: 600;">
              ✏️ Edit Plan
            </button>
          </div>
        </div>

        <!-- 7-Day Grid Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.65rem;">
          ${schedule.map(item => {
            const isToday = (item.day || '').toLowerCase() === todayName;
            const isDone = item.is_completed;
            const capitalizedDay = item.day.charAt(0).toUpperCase() + item.day.slice(1, 3);

            const actIcons = {
              rest: '😴 Rest',
              gym: '🏋️ Gym',
              sports: '⚽ Sport',
              cardio: '🏃 Cardio',
            };

            const targetsText = (item.targets || []).length > 0
              ? item.targets.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')
              : 'Rest & Recover';

            const cardBorder = isToday ? 'var(--accent-health)' : (isDone ? 'rgba(16,185,129,0.4)' : 'var(--border-glass)');
            const cardBg = isToday ? 'rgba(16,185,129,0.12)' : (isDone ? 'rgba(16,185,129,0.06)' : 'rgba(9, 12, 16, 0.5)');

            return `
              <div style="background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 10px; padding: 0.65rem 0.55rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem; position: relative;">
                
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 0.8rem; color: ${isToday ? 'var(--accent-health)' : 'var(--text-primary)'};">${capitalizedDay}</span>
                    ${isToday ? `<span style="font-size: 0.6rem; background: var(--accent-health); color: #000; font-weight: 900; padding: 0.05rem 0.35rem; border-radius: 4px;">TODAY</span>` : ''}
                  </div>

                  <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary); margin-top: 0.35rem; display: flex; align-items: center; gap: 0.2rem;">
                    ${actIcons[item.activity_type] || '😴 Rest'}
                  </div>

                  <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${targetsText}">
                    ${targetsText}
                  </div>
                </div>

                <!-- 1-Tap Toggle Done Button -->
                <button class="btn-toggle-plan-day" data-day="${item.day}" style="width: 100%; padding: 0.3rem 0.2rem; font-size: 0.7rem; font-weight: 800; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s ease; background: ${isDone ? '#10B981' : 'rgba(255,255,255,0.08)'}; color: ${isDone ? '#000' : 'var(--text-secondary)'};">
                  ${isDone ? '✔ Done' : 'Mark Done'}
                </button>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }
}
