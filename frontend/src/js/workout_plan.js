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
              <h2 style="font-size: 1.25rem; font-family: var(--font-heading); margin: 0;">📋 Weekly Routine Setup</h2>
              <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Configure your custom 7-day workout routine blueprint.</p>
            </div>
            <button class="close-btn" id="close-workout-plan-modal" style="background: transparent; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer;">&times;</button>
          </div>

          <form id="workout-plan-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
            
            <!-- 7-Day Weekly Schedule Builder -->
            <div class="glass-card" style="background: rgba(22, 27, 34, 0.7); padding: 1.1rem;">
              <h3 style="font-size: 0.95rem; font-family: var(--font-heading); margin-bottom: 0.75rem; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between;">
                <span>🗓️ Configure 7-Day Routine Blueprint</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">Select day tab to customize target routine</span>
              </h3>

              <!-- Day Selector Tabs -->
              <div id="plan-day-tabs" style="display: flex; gap: 0.35rem; margin-bottom: 0.85rem; overflow-x: auto; padding-bottom: 0.35rem; border-bottom: 1px solid var(--border-glass);">
                <!-- Day tab buttons rendered dynamically -->
              </div>

              <div id="plan-days-builder" style="display: flex; flex-direction: column; gap: 1rem;">
                <!-- Dynamically populated 7 days (active day visible, others hidden) -->
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
              <button type="button" id="btn-cancel-plan-modal" class="btn" style="padding: 0.55rem 1.1rem; font-size: 0.85rem;">Cancel</button>
              <button type="submit" id="btn-save-plan-modal" class="btn btn-primary" style="padding: 0.55rem 1.4rem; font-size: 0.85rem; font-weight: 700;">
                💾 Save Weekly Routine
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

      // Day Tab Selector in Setup Modal
      const dayTabBtn = e.target.closest('.plan-day-tab-btn');
      if (dayTabBtn) {
        const targetDay = dayTabBtn.getAttribute('data-day');
        this.switchSetupDayTab(targetDay);
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

  static switchSetupDayTab(targetDay) {
    const tabsContainer = document.getElementById('plan-day-tabs');
    const builderContainer = document.getElementById('plan-days-builder');
    if (!tabsContainer || !builderContainer) return;

    // Update tab styles
    tabsContainer.querySelectorAll('.plan-day-tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-day') === targetDay;
      if (isTarget) {
        btn.style.background = 'var(--accent-health)';
        btn.style.color = '#000';
        btn.style.borderColor = 'var(--accent-health)';
        btn.style.fontWeight = '800';
      } else {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'var(--border-glass)';
        btn.style.fontWeight = '600';
      }
    });

    // Show selected day row, hide others
    builderContainer.querySelectorAll('.day-builder-row').forEach(row => {
      if (row.getAttribute('data-day') === targetDay) {
        row.style.display = 'block';
      } else {
        row.style.display = 'none';
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

    // Render Day Tabs & 7-day builder inputs
    const tabsContainer = document.getElementById('plan-day-tabs');
    const builderContainer = document.getElementById('plan-days-builder');
    const daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentScheduleMap = {};

    (data.weekly_schedule || []).forEach(item => {
      const dKey = item.day ? item.day.toLowerCase() : '';
      currentScheduleMap[dKey] = item;
    });

    const shortDayNames = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };

    const activityIcons = {
      rest: '😴',
      gym: '🏋️',
      sports: '⚽',
      cardio: '🏃',
    };

    // Render Tabs
    if (tabsContainer) {
      tabsContainer.innerHTML = daysList.map((d, index) => {
        const existing = currentScheduleMap[d] || { activity_type: 'rest' };
        const icon = activityIcons[existing.activity_type] || '😴';
        const isFirst = index === 0;
        return `
          <button type="button" class="plan-day-tab-btn" data-day="${d}" style="padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.8rem; font-weight: ${isFirst ? '800' : '600'}; background: ${isFirst ? 'var(--accent-health)' : 'rgba(255,255,255,0.05)'}; color: ${isFirst ? '#000' : 'var(--text-secondary)'}; border: 1px solid ${isFirst ? 'var(--accent-health)' : 'var(--border-glass)'}; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; display: flex; align-items: center; gap: 0.35rem;">
            <span>${shortDayNames[d]}</span>
            <span style="font-size: 0.75rem;">${icon}</span>
          </button>
        `;
      }).join('');
    }

    const muscleCategories = [
      {
        category: '🦵 Legs & Lower Body',
        color: '#34D399',
        items: [
          { id: 'squats_bodyweight', legacyId: 'quads', label: 'Bodyweight Squat' },
          { id: 'squats_barbell', legacyId: 'quads', label: 'Barbell Squat' },
          { id: 'bulgarian_split_squat', legacyId: 'quads', label: 'Bulgarian Split Squat' },
          { id: 'leg_press', legacyId: 'quads', label: 'Leg Press' },
          { id: 'lunges', legacyId: 'quads', label: 'Lunge' },
          { id: 'deadlift', legacyId: 'hamstrings', label: 'Deadlift' },
          { id: 'leg_extension', legacyId: 'quads', label: 'Leg Extension' },
          { id: 'leg_curl', legacyId: 'hamstrings', label: 'Leg Curl' },
          { id: 'standing_calf_raise', legacyId: 'calves', label: 'Standing Calf Raise' },
          { id: 'seated_calf_raise', legacyId: 'calves', label: 'Seated Calf Raise' },
        ]
      },
      {
        category: '🧱 Chest & Push',
        color: '#60A5FA',
        items: [
          { id: 'bench_press', legacyId: 'chest', label: 'Bench Press' },
          { id: 'chest_fly', legacyId: 'chest', label: 'Chest Fly' },
          { id: 'pushups', legacyId: 'chest', label: 'Push-up' },
          { id: 'dips', legacyId: 'triceps', label: 'Dip' },
        ]
      },
      {
        category: '🪵 Back & Pull',
        color: '#FBBF24',
        items: [
          { id: 'lat_pulldown', legacyId: 'back', label: 'Lat Pull-down' },
          { id: 'pullups', legacyId: 'back', label: 'Pull-up' },
          { id: 'bent_over_row', legacyId: 'back', label: 'Bent-over Row' },
          { id: 'upright_row', legacyId: 'shoulders', label: 'Upright Row' },
          { id: 'shoulder_shrug', legacyId: 'back', label: 'Shoulder Shrug' },
          { id: 'back_extension', legacyId: 'back', label: 'Back Extension' },
        ]
      },
      {
        category: '⚡ Shoulders',
        color: '#34D399',
        items: [
          { id: 'shoulder_press', legacyId: 'shoulders', label: 'Overhead Shoulder Press' },
          { id: 'lateral_raise', legacyId: 'shoulders', label: 'Lateral Raise' },
        ]
      },
      {
        category: '🦾 Arms (Biceps & Triceps)',
        color: '#F472B6',
        items: [
          { id: 'bicep_curls', legacyId: 'biceps', label: 'Biceps Curl' },
          { id: 'hammer_curl', legacyId: 'biceps', label: 'Hammer Curl' },
          { id: 'tricep_pushdown', legacyId: 'triceps', label: 'Triceps Push-down' },
          { id: 'lying_triceps_extension', legacyId: 'triceps', label: 'Lying Triceps Extension' },
          { id: 'overhead_triceps_extension', legacyId: 'triceps', label: 'Overhead Triceps Extension' },
        ]
      },
      {
        category: '🎯 Core & Abs',
        color: '#C084FC',
        items: [
          { id: 'crunches', legacyId: 'abs', label: 'Crunch' },
          { id: 'russian_twists', legacyId: 'abs', label: 'Russian Twist' },
          { id: 'leg_raises', legacyId: 'abs', label: 'Hanging Leg Raise' },
        ]
      }
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

    builderContainer.innerHTML = daysList.map((d, index) => {
      const existing = currentScheduleMap[d] || { activity_type: 'rest', targets: [], is_completed: false };
      const capitalizedDay = d.charAt(0).toUpperCase() + d.slice(1);
      const isVisible = index === 0;

      return `
        <div class="day-builder-row" data-day="${d}" style="display: ${isVisible ? 'block' : 'none'}; background: rgba(9, 12, 16, 0.6); border: 1px solid var(--border-glass); border-radius: 10px; padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--accent-health); text-transform: uppercase; display: flex; align-items: center; gap: 0.4rem;">
              <span>🗓️ ${capitalizedDay} Routine</span>
            </div>

            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Activity Type:</span>
              <select class="form-input day-activity-select" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; background: #161B22;" data-day="${d}">
                <option value="rest" ${existing.activity_type === 'rest' ? 'selected' : ''}>😴 Rest Day</option>
                <option value="gym" ${existing.activity_type === 'gym' ? 'selected' : ''}>🏋️ Gym / Strength Split</option>
                <option value="sports" ${existing.activity_type === 'sports' ? 'selected' : ''}>⚽ Field Sports / Game</option>
                <option value="cardio" ${existing.activity_type === 'cardio' ? 'selected' : ''}>🏃 Cardio / Movement</option>
              </select>
            </div>
          </div>

          <!-- Target Checkboxes Section -->
          <div class="day-targets-box" id="targets-box-${d}" style="display: ${existing.activity_type === 'rest' ? 'none' : 'block'}; margin-top: 0.75rem; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 0.75rem;">
            
            <!-- Category 1: Sports & Games -->
            <div style="margin-bottom: 0.85rem;">
              <div style="font-size: 0.75rem; color: #3B82F6; font-weight: 700; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>⚽ Field Sports & Games</span>
              </div>
              <div class="target-checkboxes-grid" style="display: flex; flex-wrap: wrap; gap: 0.4rem 0.65rem; font-size: 0.8rem;">
                ${sportsOptions.map(opt => {
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

            <!-- Category 2: Cardio & Movement -->
            <div style="margin-bottom: 0.85rem;">
              <div style="font-size: 0.75rem; color: #F59E0B; font-weight: 700; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>🏃 Cardio & General Movement</span>
              </div>
              <div class="target-checkboxes-grid" style="display: flex; flex-wrap: wrap; gap: 0.4rem 0.65rem; font-size: 0.8rem;">
                ${cardioOptions.map(opt => {
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

            <!-- Category 3: Gym Exercises Categorized by Muscle Group -->
            <div>
              <div style="font-size: 0.75rem; color: var(--accent-health); font-weight: 700; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>🏋️ Target Exercises & Muscle Groups (Gym / Strength)</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${muscleCategories.map(cat => `
                  <div style="background: rgba(22,27,34,0.5); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.73rem; font-weight: 800; color: ${cat.color}; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.04em;">
                      ${cat.category}
                    </div>
                    <div class="target-checkboxes-grid" style="display: flex; flex-wrap: wrap; gap: 0.35rem 0.55rem; font-size: 0.78rem;">
                      ${cat.items.map(opt => {
                        const checked = (existing.targets || []).includes(opt.id) || (existing.targets || []).includes(opt.legacyId);
                        return `
                          <label style="display: inline-flex; align-items: center; gap: 0.3rem; color: var(--text-primary); cursor: pointer; background: rgba(255,255,255,0.04); padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-glass);">
                            <input type="checkbox" name="target-${d}" value="${opt.id}" ${checked ? 'checked' : ''} />
                            <span>${opt.label}</span>
                          </label>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>
        </div>
      `;
    }).join('');

    // Toggle targets box display and update tab icon live when activity select changes
    builderContainer.querySelectorAll('.day-activity-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const d = select.getAttribute('data-day');
        const box = document.getElementById(`targets-box-${d}`);
        if (box) {
          box.style.display = select.value === 'rest' ? 'none' : 'block';
        }

        // Live update icon on corresponding day tab
        const tabBtn = tabsContainer ? tabsContainer.querySelector(`.plan-day-tab-btn[data-day="${d}"]`) : null;
        if (tabBtn) {
          const iconSpan = tabBtn.querySelector('span:nth-child(2)');
          if (iconSpan) {
            iconSpan.textContent = activityIcons[select.value] || '😴';
          }
        }
      });
    });

    modal.classList.add('active');
  }

  static async savePlanFromForm() {
    const modal = document.getElementById('workout-plan-modal');
    if (!modal) return;

    const selectedFocus = this.planData?.fitness_focus || 'general_health';
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
        saveBtn.textContent = '💾 Save Weekly Routine';
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
