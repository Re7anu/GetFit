/* Main Application Entry Point & State Router */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { AuthManager } from './auth.js';
import { ProfileManager } from './profile.js';
import { SettingsManager } from './settings.js';
import { DashboardManager } from './dashboard.js';
import { LoggingManager } from './logging.js';
import { AnalyticsManager } from './analytics.js';
import { WorkoutPlanManager } from './workout_plan.js';
import { PoseTrackerManager } from './pose_tracker.js';
import { fitbotController } from './fitbot.js';

export class App {
  static async init() {
    try {
      AuthManager.init();
      ProfileManager.init();
      SettingsManager.init();
      LoggingManager.init();
      AnalyticsManager.init();
      WorkoutPlanManager.init();
      PoseTrackerManager.init();
      fitbotController.init();
    } catch (err) {
      console.error('[App Init Warning]:', err.message);
    }

    this.bindNavigationTabs();
    this.bindGlobalEvents();
    await this.checkStateAndRoute();
  }

  static bindNavigationTabs() {
    const navTabs = document.getElementById('app-nav-tabs');
    if (!navTabs) return;

    navTabs.addEventListener('click', async (e) => {
      const btn = e.target.closest('.nav-tab-btn');
      if (!btn) return;

      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mainContainer = document.getElementById('main-content');

      if (tab === 'dashboard') {
        await DashboardManager.render(mainContainer);
      } else if (tab === 'food') {
        this.renderFoodTab(mainContainer);
      } else if (tab === 'exercise') {
        this.renderExerciseTab(mainContainer);
      } else if (tab === 'analytics') {
        await AnalyticsManager.render(mainContainer);
      } else if (tab === 'fitbot') {
        await fitbotController.renderFullPageView(mainContainer);
      }
    });
  }

  static async renderFoodTab(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem; width: 100%;">
        
        <!-- Header Strip -->
        <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
          <div>
            <h2 style="font-family: var(--font-heading); margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 0.5rem;">
              🥗 Food & Nutrition Intelligence
            </h2>
            <p class="text-muted" style="margin-top: 0.25rem; font-size: 0.85rem;">
              Scan food photos with Gemini Vision AI, log text meals, or enter custom entries with micronutrient enrichment.
            </p>
          </div>
          <button id="btn-manual-meal" class="btn btn-primary" style="padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
            + Manual Meal Entry
          </button>
        </div>

        <!-- 2-Column Grid: AI Logger on Left | Today's Logged Meals on Right -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; align-items: start;">

          <!-- Left Column: AI Multimodal Food Scanner Card -->
          <div class="glass-card" style="position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(13,17,23,0.7) 100%); border: 1px solid rgba(16,185,129,0.3);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <h3 style="font-size: 1.05rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary);">
                <span style="font-size: 1.2rem;">📸</span> AI Image Food Scanner
              </h3>
              <div style="display: flex; gap: 0.5rem;">
                <button id="tab-btn-scan-image" class="btn active" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; background: var(--accent-health); color: #000; font-weight: 700; border-radius: 6px;">📷 Photo Upload</button>
                <button id="tab-btn-scan-text" class="btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; background: rgba(255,255,255,0.08); color: var(--text-secondary); border-radius: 6px;">💬 Text Description</button>
              </div>
            </div>

            <!-- Mode 1: Image Scanner Card -->
            <div id="ai-food-image-section">
              <form id="ai-food-image-form" style="display: flex; flex-direction: column; gap: 1rem;">
                
                <!-- Drag & Drop Zone -->
                <div id="image-dropzone" style="border: 2px dashed rgba(16,185,129,0.4); border-radius: 12px; padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.25); cursor: pointer; transition: all 0.2s ease;">
                  <input type="file" id="ai-food-image-input" accept="image/*" style="display: none;" />
                  
                  <div id="dropzone-prompt" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                      📷
                    </div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">
                      Drag & Drop your food photo here or <span style="color: var(--accent-health); text-decoration: underline;">Browse Files</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                      Supports JPG, PNG, WebP — Gemini AI auto-detects meal, calories, macros & 6 micronutrients
                    </div>
                  </div>

                  <!-- Image Preview Thumbnail (Hidden initially) -->
                  <div id="image-preview-container" style="display: none; position: relative; max-width: 320px; margin: 0 auto;">
                    <img id="image-preview-img" src="" alt="Food Preview" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-glass);" />
                    <button type="button" id="btn-remove-image" style="position: absolute; top: -8px; right: -8px; background: #EF4444; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">&times;</button>
                    <div id="image-preview-name" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.4rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
                  </div>

                </div>

                <!-- Supporting Text / Ingredients Input -->
                <div style="margin-top: 0.75rem;">
                  <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem; font-weight: 600;">
                    Supporting Details / Custom Notes (Optional)
                  </label>
                  <input type="text" id="ai-food-image-notes" class="form-input" placeholder="e.g. 2 fried eggs cooked in olive oil, sourdough toast, half avocado..." style="padding: 0.55rem 0.75rem; font-size: 0.85rem; background: rgba(22,27,34,0.8); width: 100%;" />
                </div>

                <!-- Controls Row: Meal Hint & Scan Button -->
                <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-top: 0.75rem;">
                  <div style="flex: 1; min-width: 160px;">
                    <select id="ai-food-meal-hint" class="form-input" style="padding: 0.55rem; font-size: 0.85rem; background: rgba(22,27,34,0.8);">
                      <option value="">Auto-detect Meal Type</option>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>

                  <button type="submit" id="ai-food-image-btn" class="btn btn-primary" style="padding: 0.6rem 1.4rem; font-size: 0.85rem; font-weight: 700; white-space: nowrap;" disabled>
                    Scan & Log Meal
                  </button>
                </div>

              </form>

              <div id="ai-food-image-status" style="display: none; font-size: 0.85rem; margin-top: 0.85rem; padding: 0.75rem; border-radius: 8px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);"></div>
            </div>

            <!-- Mode 2: Text Prompt Bar (Hidden by default, toggled via mode buttons) -->
            <div id="ai-food-text-section" style="display: none;">
              <form id="ai-meal-form" class="ai-prompt-bar">
                <input type="text" id="ai-meal-input" class="ai-prompt-input" placeholder="E.g., '2 boiled eggs, whole wheat toast with butter, and black coffee'..." required />
                <button type="submit" id="ai-meal-btn" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
                  Log Meal
                </button>
              </form>
              <div id="ai-meal-status" style="display:none; font-size: 0.85rem; margin-top: 0.75rem; color: var(--accent-health);"></div>
            </div>

          </div>

          <!-- Right Column: Today's Logged Meals List (Positioned Side-by-Side) -->
          <div class="glass-card">
            <h3 style="margin-bottom: 1rem; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Today's Logged Meals</span>
              <span id="food-tab-cals-count" class="text-muted" style="font-size: 0.85rem;"></span>
            </h3>
            <div id="food-tab-meals-list" class="scrollable-timeline" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 500px; overflow-y: auto;">
              <p class="text-muted" style="font-size: 0.85rem;">Loading today's meals...</p>
            </div>
          </div>

        </div>

      </div>
    `;

    this.fetchAndRenderFoodTab();
  }



  static async fetchAndRenderFoodTab() {
    const listEl = document.getElementById('food-tab-meals-list');
    const calsCountEl = document.getElementById('food-tab-cals-count');
    if (!listEl) return;

    try {
      const meals = await APIClient.request(ENDPOINTS.MEALS_TODAY);
      this.cachedMeals = meals || [];
      if (!Array.isArray(meals) || meals.length === 0) {
        listEl.innerHTML = `<p class="text-muted" style="font-size: 0.85rem; padding: 1.5rem; text-align: center;">No meals logged today yet.</p>`;
        if (calsCountEl) calsCountEl.textContent = '0 kcal consumed';
        return;
      }

      const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      if (calsCountEl) calsCountEl.textContent = `${totalCals} kcal consumed today`;

      const inputBadges = {
        ai_vision: '📷 Vision AI',
        ai_nlp: '💬 Text AI',
        manual: '📝 Manual',
      };

      listEl.innerHTML = meals.map(m => `
        <div class="food-meal-card-item" data-id="${m.id}" style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 12px; padding: 0.85rem 1.1rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s ease; position: relative;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-weight: 700; text-transform: capitalize; font-size: 0.9rem; color: var(--accent-health);">${m.meal_type}</span>
              <span style="color: var(--text-primary); font-size: 0.85rem; font-weight: 600;">• ${m.description}</span>
              <span style="font-size: 0.7rem; background: rgba(255,255,255,0.08); color: var(--text-secondary); padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600;" title="Input method: ${m.input_method}">${inputBadges[m.input_method] || '📝 Manual'}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem; display: flex; gap: 0.85rem; flex-wrap: wrap; align-items: center;">
              <span>🥩 P: <b>${m.protein_g}g</b></span>
              <span>🍞 C: <b>${m.carbs_g}g</b></span>
              <span>🥑 F: <b>${m.fat_g}g</b></span>
              <span>🌾 Fiber: <b>${m.fiber_g || 0}g</b></span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.65rem; margin-left: 1rem; flex-shrink: 0; position: relative;">
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-heading); white-space: nowrap;">${m.calories} kcal</span>
            
            <button class="btn-view-meal-detail" data-id="${m.id}" style="background: rgba(16,185,129,0.12); color: var(--accent-health); border: 1px solid rgba(16,185,129,0.25); border-radius: 6px; padding: 0.3rem 0.65rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; transition: all 0.2s ease;">
              🔍 Details
            </button>

            <!-- Inline Delete Trash & Dropdown Confirm Container -->
            <div class="delete-wrapper" style="position: relative;">
              <button class="btn-delete-food-item" data-id="${m.id}" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #EF4444; border-radius: 6px; padding: 0.3rem 0.5rem; cursor: pointer; font-size: 0.85rem; transition: all 0.2s ease;" title="Delete meal">
                🗑️
              </button>

              <!-- Inline Confirmation Popover Dropdown -->
              <div class="delete-confirm-popover" style="display: none; position: absolute; right: 0; top: 125%; background: #161B22; border: 1px solid rgba(239,68,68,0.4); border-radius: 10px; padding: 0.6rem 0.75rem; width: 175px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); z-index: 100; flex-direction: column; gap: 0.45rem; text-align: center;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #EF4444;">Delete this meal?</div>
                <div style="display: flex; gap: 0.4rem; justify-content: center;">
                  <button class="btn-cancel-delete" style="background: rgba(255,255,255,0.08); color: var(--text-secondary); border: none; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">Cancel</button>
                  <button class="btn-confirm-delete" data-id="${m.id}" style="background: #EF4444; color: white; border: none; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Delete</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.food-meal-card-item').forEach(card => {
        card.addEventListener('mouseenter', () => {
          card.style.borderColor = 'rgba(16,185,129,0.4)';
          card.style.background = 'rgba(22,27,34,0.85)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = 'var(--border-glass)';
          card.style.background = 'rgba(22,27,34,0.6)';
        });

        // Clicking row or details button opens modal
        card.addEventListener('click', (e) => {
          if (e.target.closest('.delete-wrapper')) return;
          const id = card.dataset.id;
          const meal = (this.cachedMeals || []).find(x => x.id === id);
          if (meal) {
            LoggingManager.openMealDetailModal(meal);
          }
        });
      });

      // Toggle inline delete confirmation dropdown
      listEl.querySelectorAll('.btn-delete-food-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wrapper = btn.closest('.delete-wrapper');
          const popover = wrapper ? wrapper.querySelector('.delete-confirm-popover') : null;

          // Close all other popovers
          document.querySelectorAll('.delete-confirm-popover').forEach(p => {
            if (p !== popover) p.style.display = 'none';
          });

          if (popover) {
            popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
          }
        });
      });

      // Cancel button inside popover
      listEl.querySelectorAll('.btn-cancel-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const popover = btn.closest('.delete-confirm-popover');
          if (popover) popover.style.display = 'none';
        });
      });

      // Confirm Delete button inside popover
      listEl.querySelectorAll('.btn-confirm-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const popover = btn.closest('.delete-confirm-popover');
          if (popover) popover.style.display = 'none';

          if (id) {
            await APIClient.request(`${ENDPOINTS.MEALS}/${id}`, { method: 'DELETE' });
            window.dispatchEvent(new CustomEvent('meal:logged'));
            this.fetchAndRenderFoodTab();
            DashboardManager.fetchAndRenderData();
          }
        });
      });

      // Close popover when clicking anywhere outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-wrapper')) {
          document.querySelectorAll('.delete-confirm-popover').forEach(p => p.style.display = 'none');
        }
      });
    } catch (err) {
      listEl.innerHTML = `<p class="text-muted" style="color: #EF4444; font-size: 0.85rem;">Failed to load meals.</p>`;
    }
  }



  static async renderExerciseTab(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; width: 100%;">
        
        <!-- Header Strip -->
        <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 1.1rem 1.4rem; margin-bottom: 1.25rem;">
          <div>
            <h2 style="font-family: var(--font-heading); margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 0.5rem;">
              ⚡ Workout & Fitness Center
            </h2>
            <p class="text-muted" style="margin-top: 0.25rem; font-size: 0.85rem;">
              Log Net MET workouts, track active calories, or configure your 7-day routine blueprint.
            </p>
          </div>
          <div>
            <button id="btn-open-workout-plan" class="btn" style="background: rgba(255,255,255,0.06); color: var(--text-primary); border: 1px solid var(--border-glass); padding: 0.55rem 1rem; font-size: 0.8rem; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 0.4rem;">
              Edit Routine Blueprint
            </button>
          </div>
        </div>

        <!-- Tier 1: Primary Functional Category Switcher (Log Workout vs 7-Day Planner) -->
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <button id="ex-primary-tab-logging" type="button" class="btn" style="flex: 1; min-width: 200px; padding: 0.75rem; font-size: 0.9rem; font-weight: 800; border-radius: 12px; background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid var(--accent-workout); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s ease;">
            Log Workout Activity
          </button>
          <button id="ex-primary-tab-planner" type="button" class="btn" style="flex: 1; min-width: 200px; padding: 0.75rem; font-size: 0.9rem; font-weight: 700; border-radius: 12px; background: rgba(15, 23, 42, 0.6); color: var(--text-secondary); border: 1px solid var(--border-glass); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s ease;">
            7-Day Routine Planner
          </button>
        </div>

        <!-- Tier 2: Secondary Logging Mode Sub-Pills (Visible inside "Log Workout Activity" mode) -->
        <div id="ex-logging-mode-bar" style="display: flex; gap: 0.5rem; background: rgba(13, 17, 23, 0.8); border: 1px solid var(--border-glass); padding: 0.35rem; border-radius: 12px; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <button id="ex-subtab-catalog" type="button" style="flex: 1; min-width: 120px; padding: 0.5rem 0.65rem; border-radius: 8px; border: none; font-size: 0.82rem; font-weight: 700; background: var(--accent-workout); color: #fff; cursor: pointer; transition: all 0.2s ease;">
            MET Catalog
          </button>
          <button id="ex-subtab-pose" type="button" style="flex: 1; min-width: 120px; padding: 0.5rem 0.65rem; border-radius: 8px; border: none; font-size: 0.82rem; font-weight: 600; background: transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;">
            AI Pose Counter
          </button>
          <button id="ex-subtab-manual" type="button" style="flex: 1; min-width: 120px; padding: 0.5rem 0.65rem; border-radius: 8px; border: none; font-size: 0.82rem; font-weight: 600; background: transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;">
            Quick Manual Entry
          </button>
        </div>

        <!-- VIEW 1: Main 2-Column Interactive Workout Hub (Catalog / Pose Tracker / Manual Logging + Today's Logged Workouts) -->
        <div id="ex-view-logging-hub" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; align-items: start;">

          <!-- Left Column: Interactive Logging Form (Catalog Mode, Pose Mode, or Manual Mode) -->
          <div class="glass-card" style="padding: 1.25rem;">

            <!-- Sub-Mode 1: Scientific 2-Step Workout Catalog Form (Default Active) -->
            <div id="ex-section-catalog">
              <form id="dash-structured-ex-form" style="display: flex; flex-direction: column; gap: 0.85rem;">
                <div>
                  <label class="form-label" style="font-size: 0.8rem; color: var(--text-secondary);">1. Select Exercise Category</label>
                  <select id="dash-ex-cat-select" class="form-input" style="padding: 0.65rem; font-size: 0.85rem;" required>
                    <option value="">Select Category...</option>
                    <option value="distance">Distance-Based (Running, Cycling, Swimming)</option>
                    <option value="reps">Reps & Sets-Based (Pushups, Squats, Weightlifting)</option>
                    <option value="time">Time & Intensity-Based (Yoga, HIIT, Basketball)</option>
                  </select>
                </div>

                <div id="dash-ex-search-wrapper" style="display: none;">
                  <label class="form-label" style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.35rem;">2. Filter & Select Exercise</label>
                  
                  <!-- Muscle Group Filter Badges -->
                  <div id="dash-ex-muscle-pills" style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                    <button type="button" class="muscle-pill-btn active" data-muscle="all" style="padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--accent-workout); background: var(--accent-workout); color: #fff; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease;">All (33)</button>
                    <button type="button" class="muscle-pill-btn" data-muscle="legs" style="padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">🦵 Legs (10)</button>
                    <button type="button" class="muscle-pill-btn" data-muscle="chest" style="padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">🧱 Chest (4)</button>
                    <button type="button" class="muscle-pill-btn" data-muscle="back" style="padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">🪵 Back (6)</button>
                    <button type="button" class="muscle-pill-btn" data-muscle="shoulders" style="padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">⚡ Shoulders (2)</button>
                    <button type="button" class="muscle-pill-btn" data-muscle="arms" style="padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">🦾 Arms (5)</button>
                    <button type="button" class="muscle-pill-btn" data-muscle="core" style="padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">🎯 Core (6)</button>
                  </div>

                  <input type="text" id="dash-ex-search-input" class="form-input" style="padding: 0.5rem 0.75rem; font-size: 0.8rem; margin-bottom: 0.45rem;" placeholder="🔍 Type exercise name (e.g. 'squat', 'bench', 'curl')..." autocomplete="off" />
                  
                  <!-- Custom Filtered List Box -->
                  <div id="dash-ex-options-list" class="scrollable-timeline" style="max-height: 260px; overflow-y: auto; background: rgba(13, 17, 23, 0.9); border: 1px solid var(--border-glass); border-radius: 8px; display: flex; flex-direction: column; gap: 0.3rem; padding: 0.4rem;"></div>

                  <!-- Hidden native select for form handling -->
                  <select id="dash-ex-item-select" style="display: none;" required>
                    <option value="">Select Specific Exercise...</option>
                  </select>
                </div>

                <div id="dash-ex-dynamic-fields" style="display: none;"></div>

                <button type="submit" id="dash-ex-btn" class="btn btn-cobalt" style="padding: 0.65rem; font-size: 0.85rem; display: none; width: 100%; font-weight: 700;">
                  Calculate & Log Net MET Workout
                </button>
              </form>
              <div id="dash-ex-status" style="display:none; font-size: 0.85rem; margin-top: 0.75rem; color: var(--accent-workout);"></div>
            </div>

            <!-- Sub-Mode 2: AI Camera Motion Pose Tracker -->
            <div id="ex-section-pose-tracker" style="display: none;">
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                
                <!-- Exercise Selectors -->
                <div class="pose-fs-hide">
                  <label style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 700; display: block; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
                    Select Motion Tracked Exercise:
                  </label>
                  <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    <button type="button" class="pose-ex-selector-btn active" data-exercise="squats" style="flex: 1; min-width: 90px; padding: 0.4rem 0.65rem; border-radius: 8px; border: 1px solid var(--accent-workout); background: rgba(56, 189, 248, 0.15); color: #38BDF8; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
                      Squats
                    </button>
                    <button type="button" class="pose-ex-selector-btn" data-exercise="pushups" style="flex: 1; min-width: 90px; padding: 0.4rem 0.65rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                      Push-ups
                    </button>
                    <button type="button" class="pose-ex-selector-btn" data-exercise="bicep_curls" style="flex: 1; min-width: 90px; padding: 0.4rem 0.65rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                      Bicep Curls
                    </button>
                  </div>
                </div>

                <!-- Active Exercise Banner Info & Added Weight Field -->
                <div class="pose-fs-hide" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); padding: 0.75rem 0.85rem; border-radius: 10px; display: flex; flex-direction: column; gap: 0.6rem;">
                  <div>
                    <div id="pose-ex-title" style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.2rem;">Bodyweight Squats</div>
                    <div id="pose-ex-desc" style="font-size: 0.75rem; color: var(--text-secondary);">Stand facing camera. Lower hips until knees reach 90° depth.</div>
                  </div>

                  <!-- Added External Weight Field (Dumbbells, Barbell, Vest) -->
                  <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-glass); padding: 0.45rem 0.65rem; border-radius: 8px;">
                    <label for="pose-added-weight-input" style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem; margin: 0;">
                      <span>🏋️</span> Added Weight (Dumbbells / Barbell):
                    </label>
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                      <input type="number" id="pose-added-weight-input" min="0" step="0.5" value="0" style="width: 70px; padding: 0.25rem 0.45rem; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-glass); border-radius: 6px; color: #38BDF8; font-size: 0.85rem; font-weight: 800; text-align: center;" placeholder="0" />
                      <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">kg</span>
                    </div>
                  </div>
                </div>

                <!-- Camera Viewport with Overlay Canvas & HUD -->
                <div class="pose-camera-viewport" style="position: relative; width: 100%; border-radius: 12px; overflow: hidden; background: #000; border: 1px solid var(--border-glass); aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center;">
                  <video id="pose-video" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);" autoplay playsinline muted></video>
                  <canvas id="pose-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: scaleX(-1); pointer-events: none;"></canvas>
                  
                  <!-- Top Overlay HUD -->
                  <div style="position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; gap: 0.5rem; pointer-events: none; z-index: 10;">
                    <!-- Rep Counter Badge -->
                    <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 10px; padding: 0.4rem 0.75rem; text-align: center;">
                      <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">REPS</div>
                      <div id="pose-hud-rep-count" style="font-size: 1.5rem; font-weight: 900; color: #38BDF8; line-height: 1;">0</div>
                    </div>

                    <!-- Angle Badge -->
                    <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.4rem 0.75rem; text-align: center;">
                      <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">ANGLE</div>
                      <div id="pose-hud-angle" style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); line-height: 1.2;">0°</div>
                    </div>

                    <!-- Stage Badge -->
                    <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.4rem 0.75rem; text-align: center;">
                      <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">STAGE</div>
                      <div id="pose-hud-stage" style="font-size: 1rem; font-weight: 800; color: var(--accent-workout); line-height: 1.3;">UP</div>
                    </div>
                  </div>

                  <!-- Fullscreen Floating Left Dock: Exercise Switcher (Appears in empty side space) -->
                  <div class="pose-fs-side-dock pose-fs-left-dock">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 0.2rem; letter-spacing: 0.05em; text-shadow: 0 1px 4px #000;">EXERCISE</div>
                    <button type="button" class="pose-ex-selector-btn active" data-exercise="squats" style="padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--accent-workout); background: rgba(56, 189, 248, 0.2); color: #38BDF8; font-size: 0.85rem; font-weight: 800; cursor: pointer; text-align: left; backdrop-filter: blur(8px);">
                      🦵 Squats
                    </button>
                    <button type="button" class="pose-ex-selector-btn" data-exercise="pushups" style="padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(15, 23, 42, 0.85); color: var(--text-secondary); font-size: 0.85rem; font-weight: 700; cursor: pointer; text-align: left; backdrop-filter: blur(8px);">
                      🧱 Push-ups
                    </button>
                    <button type="button" class="pose-ex-selector-btn" data-exercise="bicep_curls" style="padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-glass); background: rgba(15, 23, 42, 0.85); color: var(--text-secondary); font-size: 0.85rem; font-weight: 700; cursor: pointer; text-align: left; backdrop-filter: blur(8px);">
                      🦾 Bicep Curls
                    </button>
                  </div>

                  <!-- Fullscreen Floating Right Dock: Added Weight Adjuster (Appears in empty side space) -->
                  <div class="pose-fs-side-dock pose-fs-right-dock">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 0.2rem; letter-spacing: 0.05em; text-shadow: 0 1px 4px #000;">ADDED WEIGHT</div>
                    <div style="display: flex; align-items: center; gap: 0.4rem; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.4rem 0.6rem; box-shadow: 0 4px 16px rgba(0,0,0,0.5);">
                      <button type="button" id="btn-pose-fs-weight-minus" style="background: rgba(255,255,255,0.1); border: 1px solid var(--border-glass); color: #fff; width: 32px; height: 32px; border-radius: 8px; font-size: 1.1rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;" title="Decrease Weight (-2.5 kg)">-</button>
                      <div style="display: flex; align-items: center; gap: 0.2rem;">
                        <input type="number" id="pose-fs-weight-input" min="0" step="0.5" value="0" style="width: 65px; padding: 0.25rem 0.35rem; background: rgba(15, 23, 42, 0.95); border: 1px solid var(--border-glass); border-radius: 6px; color: #38BDF8; font-size: 1rem; font-weight: 900; text-align: center; outline: none;" placeholder="0" />
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 800;">kg</span>
                      </div>
                      <button type="button" id="btn-pose-fs-weight-plus" style="background: rgba(255,255,255,0.1); border: 1px solid var(--border-glass); color: #fff; width: 32px; height: 32px; border-radius: 8px; font-size: 1.1rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;" title="Increase Weight (+2.5 kg)">+</button>
                    </div>
                  </div>

                  <!-- Bottom Overlay Real-time Form Banner -->
                  <div id="pose-form-banner" style="position: absolute; bottom: 12px; left: 12px; right: 12px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.65rem 1rem; text-align: center; font-size: 1.15rem; font-weight: 900; color: var(--text-primary); z-index: 10; letter-spacing: 0.02em; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
                    Get into position & begin!
                  </div>
                </div>

                <!-- Hidden File Input for Uploading Recorded Video -->
                <input type="file" id="pose-video-file-input" accept="video/*" style="display: none;" />

                <!-- Controls Toolbar -->
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button type="button" id="btn-start-pose-cam" class="btn btn-cobalt" style="flex: 1; padding: 0.6rem; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;">
                    📷 Start Camera
                  </button>
                  <button type="button" id="btn-stop-pose-cam" class="btn" style="flex: 1; padding: 0.6rem; font-size: 0.85rem; font-weight: 700; background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.4); display: none; align-items: center; justify-content: center; gap: 0.35rem;">
                    ⏹️ Stop
                  </button>
                  <button type="button" id="btn-trigger-upload-pose-video" class="btn pose-fs-hide" style="flex: 1; padding: 0.6rem; font-size: 0.85rem; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.4); display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; cursor: pointer;">
                    📁 Upload Video
                  </button>
                  <button type="button" id="btn-reset-pose-reps" class="btn" style="padding: 0.6rem 0.85rem; font-size: 0.85rem; background: rgba(255,255,255,0.08); color: var(--text-secondary); border: 1px solid var(--border-glass);" title="Reset Rep Counter">
                    🔄 Reset
                  </button>
                  <button type="button" id="btn-toggle-pose-fullscreen" class="btn" style="padding: 0.6rem 0.85rem; font-size: 0.85rem; background: rgba(255,255,255,0.08); color: var(--text-secondary); border: 1px solid var(--border-glass); cursor: pointer;" title="Toggle Fullscreen View">
                    ⤢ Fullscreen
                  </button>
                </div>

                <!-- Save Set Action Button -->
                <button type="button" id="btn-save-pose-workout" class="btn btn-primary" style="width: 100%; padding: 0.65rem; font-size: 0.85rem; font-weight: 700; opacity: 0.5;" disabled>
                  Save Workout Set (0 Reps)
                </button>
              </div>
            </div>

            <!-- Sub-Mode 3: Quick Manual Entry Form -->
            <div id="ex-section-manual" style="display: none;">
              <form id="tab-manual-exercise-form" style="display: flex; flex-direction: column; gap: 0.85rem;">
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                  Log exact workout calories from Apple Watch, Garmin, Whoop, or unlisted niche activities.
                </p>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.8rem; color: var(--text-secondary);">Exercise Name</label>
                  <input type="text" id="tab-m-ex-name" class="form-input" style="padding: 0.6rem; font-size: 0.85rem;" placeholder="Outdoor Basketball Game" required />
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 0.8rem; color: var(--text-secondary);">Duration (mins)</label>
                    <input type="number" step="0.1" id="tab-m-ex-dur" class="form-input" style="padding: 0.6rem; font-size: 0.85rem;" placeholder="45" required />
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 0.8rem; color: var(--text-secondary);">Calories Burned (kcal)</label>
                    <input type="number" id="tab-m-ex-cals" class="form-input" style="padding: 0.6rem; font-size: 0.85rem;" placeholder="350" required />
                  </div>
                </div>
                <button type="submit" id="tab-m-ex-submit-btn" class="btn btn-cobalt" style="padding: 0.65rem; font-size: 0.85rem; width: 100%; font-weight: 700;">
                  💾 Save Manual Workout
                </button>
              </form>
            </div>

          </div>

          <!-- Right Column: Today's Active Logged Workouts List -->
          <div class="glass-card" style="padding: 1.25rem;">
            <h3 style="margin-bottom: 1rem; font-size: 1.05rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Today's Logged Workouts</span>
              <span id="ex-tab-burn-count" class="text-muted" style="font-size: 0.85rem;"></span>
            </h3>
            <div id="ex-tab-workouts-list" class="scrollable-timeline" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 480px; overflow-y: auto;">
              <p class="text-muted" style="font-size: 0.85rem;">Loading today's workouts...</p>
            </div>
          </div>

        </div>

        <!-- VIEW 2: 7-Day Weekly Routine Blueprint View (Dedicated Sub-Tab View) -->
        <div id="ex-view-weekly-planner" style="display: none;" class="glass-card" style="padding: 1.4rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 style="font-size: 1.1rem; font-family: var(--font-heading); margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                <span>7-Day Routine Blueprint</span>
              </h3>
              <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Your active weekly workout schedule & target exercise blueprint.</p>
            </div>
            <button id="btn-edit-plan-planner" class="btn btn-primary" style="padding: 0.55rem 1.1rem; font-size: 0.8rem; font-weight: 700;">
              Edit 7-Day Blueprint
            </button>
          </div>
          <div id="weekly-plan-schedule-box"></div>
        </div>

      </div>
    `;

    // Bind Tier-1 Primary Category Switcher & Tier-2 Sub-Mode Selector
    const primaryTabLogging = document.getElementById('ex-primary-tab-logging');
    const primaryTabPlanner = document.getElementById('ex-primary-tab-planner');
    const loggingModeBar = document.getElementById('ex-logging-mode-bar');
    const btnOpenPlannerHeader = document.getElementById('btn-open-workout-plan');

    const subtabCatalog = document.getElementById('ex-subtab-catalog');
    const subtabPose = document.getElementById('ex-subtab-pose');
    const subtabManual = document.getElementById('ex-subtab-manual');
    const viewHub = document.getElementById('ex-view-logging-hub');
    const viewPlanner = document.getElementById('ex-view-weekly-planner');
    const secCatalog = document.getElementById('ex-section-catalog');
    const secPose = document.getElementById('ex-section-pose-tracker');
    const secManual = document.getElementById('ex-section-manual');

    const setPrimaryCategory = (category) => {
      if (category === 'logging') {
        if (primaryTabLogging) {
          primaryTabLogging.style.background = 'rgba(56, 189, 248, 0.15)';
          primaryTabLogging.style.color = '#38BDF8';
          primaryTabLogging.style.border = '1px solid var(--accent-workout)';
          primaryTabLogging.style.fontWeight = '800';
        }
        if (primaryTabPlanner) {
          primaryTabPlanner.style.background = 'rgba(15, 23, 42, 0.6)';
          primaryTabPlanner.style.color = 'var(--text-secondary)';
          primaryTabPlanner.style.border = '1px solid var(--border-glass)';
          primaryTabPlanner.style.fontWeight = '700';
        }
        if (loggingModeBar) loggingModeBar.style.display = 'flex';
        if (viewHub) viewHub.style.display = 'grid';
        if (viewPlanner) viewPlanner.style.display = 'none';
      } else {
        if (primaryTabPlanner) {
          primaryTabPlanner.style.background = 'rgba(56, 189, 248, 0.15)';
          primaryTabPlanner.style.color = '#38BDF8';
          primaryTabPlanner.style.border = '1px solid var(--accent-workout)';
          primaryTabPlanner.style.fontWeight = '800';
        }
        if (primaryTabLogging) {
          primaryTabLogging.style.background = 'rgba(15, 23, 42, 0.6)';
          primaryTabLogging.style.color = 'var(--text-secondary)';
          primaryTabLogging.style.border = '1px solid var(--border-glass)';
          primaryTabLogging.style.fontWeight = '700';
        }
        if (loggingModeBar) loggingModeBar.style.display = 'none';
        if (viewHub) viewHub.style.display = 'none';
        if (viewPlanner) viewPlanner.style.display = 'block';
      }
    };

    const setSubtabActive = (activeBtn) => {
      [subtabCatalog, subtabPose, subtabManual].forEach(btn => {
        if (!btn) return;
        if (btn === activeBtn) {
          btn.style.background = 'var(--accent-workout)';
          btn.style.color = '#fff';
          btn.style.fontWeight = '700';
        } else {
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-secondary)';
          btn.style.fontWeight = '600';
        }
      });
    };

    if (primaryTabLogging) {
      primaryTabLogging.addEventListener('click', () => setPrimaryCategory('logging'));
    }

    if (primaryTabPlanner) {
      primaryTabPlanner.addEventListener('click', () => setPrimaryCategory('planner'));
    }

    if (btnOpenPlannerHeader) {
      btnOpenPlannerHeader.addEventListener('click', () => setPrimaryCategory('planner'));
    }

    if (subtabCatalog) {
      subtabCatalog.addEventListener('click', () => {
        setSubtabActive(subtabCatalog);
        setPrimaryCategory('logging');
        if (secCatalog) secCatalog.style.display = 'block';
        if (secPose) secPose.style.display = 'none';
        if (secManual) secManual.style.display = 'none';
      });
    }

    if (subtabPose) {
      subtabPose.addEventListener('click', () => {
        setSubtabActive(subtabPose);
        setPrimaryCategory('logging');
        if (secCatalog) secCatalog.style.display = 'none';
        if (secPose) secPose.style.display = 'block';
        if (secManual) secManual.style.display = 'none';
      });
    }

    if (subtabManual) {
      subtabManual.addEventListener('click', () => {
        setSubtabActive(subtabManual);
        setPrimaryCategory('logging');
        if (secCatalog) secCatalog.style.display = 'none';
        if (secPose) secPose.style.display = 'none';
        if (secManual) secManual.style.display = 'block';
      });
    }

    // Bind Edit Blueprint button inside Planner Sub-Tab
    const btnEditPlanner = document.getElementById('btn-edit-plan-planner');
    if (btnEditPlanner) {
      btnEditPlanner.addEventListener('click', () => {
        if (window.WorkoutPlanManager) {
          WorkoutPlanManager.openSetupModal();
        }
      });
    }

    // Bind Edit Blueprint button at bottom
    const btnEditBottom = document.getElementById('btn-edit-plan-bottom');
    if (btnEditBottom) {
      btnEditBottom.addEventListener('click', () => {
        if (window.WorkoutPlanManager) {
          WorkoutPlanManager.openSetupModal();
        }
      });
    }

    // Bind Tab-Level Quick Manual Exercise Form Submit
    const manualForm = document.getElementById('tab-manual-exercise-form');
    if (manualForm) {
      manualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('tab-m-ex-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '⏳ Saving Workout...';
        }

        try {
          const payload = {
            exercise_name: document.getElementById('tab-m-ex-name').value,
            duration_minutes: parseFloat(document.getElementById('tab-m-ex-dur').value),
            calories_burned: parseInt(document.getElementById('tab-m-ex-cals').value, 10),
            input_method: 'manual',
          };

          await APIClient.request(ENDPOINTS.EXERCISES, { method: 'POST', body: JSON.stringify(payload) });
          manualForm.reset();
          window.dispatchEvent(new CustomEvent('exercise:logged'));
          this.fetchAndRenderExerciseTab();
          DashboardManager.fetchAndRenderData();
        } catch (err) {
          alert(`Error saving workout: ${err.message}`);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Save Manual Workout';
          }
        }
      });
    }

    this.fetchAndRenderExerciseTab();
  }


  static async fetchAndRenderExerciseTab() {
    WorkoutPlanManager.renderScheduleGrid();
    const listEl = document.getElementById('ex-tab-workouts-list');
    const burnCountEl = document.getElementById('ex-tab-burn-count');
    if (!listEl) return;

    try {
      const workouts = await APIClient.request(ENDPOINTS.EXERCISES_TODAY);
      if (!Array.isArray(workouts) || workouts.length === 0) {
        listEl.innerHTML = `<p class="text-muted" style="font-size: 0.85rem; padding: 1.5rem; text-align: center;">No workouts logged today yet.</p>`;
        if (burnCountEl) burnCountEl.textContent = '0 Net kcal burned';
        return;
      }

      const totalBurn = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
      if (burnCountEl) burnCountEl.textContent = `${totalBurn} Net kcal burned today`;

      listEl.innerHTML = workouts.map(w => `
        <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 12px; padding: 0.85rem 1.1rem; display: flex; justify-content: space-between; align-items: center; position: relative;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--accent-workout);">${w.exercise_name}</span>
              <span style="color: var(--text-secondary); font-size: 0.85rem;">• ${w.duration_minutes} mins</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
              <span>MET: ${w.met_value}</span> ${w.notes ? `| <span>${w.notes}</span>` : ''}
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 0.75rem; position: relative;">
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--accent-workout); font-family: var(--font-heading);">${w.calories_burned} Net kcal</span>
            
            <!-- Inline Delete Trash & Dropdown Confirm Container -->
            <div class="delete-ex-wrapper" style="position: relative;">
              <button class="btn-delete-ex-item" data-id="${w.id}" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #EF4444; border-radius: 6px; padding: 0.3rem 0.5rem; cursor: pointer; font-size: 0.85rem; transition: all 0.2s ease;" title="Delete workout">
                🗑️
              </button>

              <!-- Inline Confirmation Popover Dropdown -->
              <div class="delete-ex-confirm-popover" style="display: none; position: absolute; right: 0; top: 125%; background: #161B22; border: 1px solid rgba(239,68,68,0.4); border-radius: 10px; padding: 0.6rem 0.75rem; width: 175px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); z-index: 100; flex-direction: column; gap: 0.45rem; text-align: center;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #EF4444;">Delete this workout?</div>
                <div style="display: flex; gap: 0.4rem; justify-content: center;">
                  <button class="btn-cancel-ex-delete" style="background: rgba(255,255,255,0.08); color: var(--text-secondary); border: none; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">Cancel</button>
                  <button class="btn-confirm-ex-delete" data-id="${w.id}" style="background: #EF4444; color: white; border: none; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Delete</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      `).join('');

      // Toggle inline delete confirmation dropdown
      listEl.querySelectorAll('.btn-delete-ex-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wrapper = btn.closest('.delete-ex-wrapper');
          const popover = wrapper ? wrapper.querySelector('.delete-ex-confirm-popover') : null;

          document.querySelectorAll('.delete-ex-confirm-popover').forEach(p => {
            if (p !== popover) p.style.display = 'none';
          });

          if (popover) {
            popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
          }
        });
      });

      // Cancel button inside popover
      listEl.querySelectorAll('.btn-cancel-ex-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const popover = btn.closest('.delete-ex-confirm-popover');
          if (popover) popover.style.display = 'none';
        });
      });

      // Confirm Delete button inside popover
      listEl.querySelectorAll('.btn-confirm-ex-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const popover = btn.closest('.delete-ex-confirm-popover');
          if (popover) popover.style.display = 'none';

          if (id) {
            await APIClient.request(`${ENDPOINTS.WORKOUTS_BASE}/${id}`, { method: 'DELETE' });
            window.dispatchEvent(new CustomEvent('exercise:logged'));
            this.fetchAndRenderExerciseTab();
            DashboardManager.fetchAndRenderData();
          }
        });
      });

      // Close popover when clicking anywhere outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-ex-wrapper')) {
          document.querySelectorAll('.delete-ex-confirm-popover').forEach(p => p.style.display = 'none');
        }
      });
    } catch (err) {
      listEl.innerHTML = `<p class="text-muted" style="color: #EF4444; font-size: 0.85rem;">Failed to load workouts.</p>`;
    }
  }


  static bindGlobalEvents() {
    window.addEventListener('auth:success', async () => {
      await this.checkStateAndRoute();
    });

    window.addEventListener('auth:unauthorized', async () => {
      await this.checkStateAndRoute();
    });

    window.addEventListener('profile:updated', async () => {
      await this.checkStateAndRoute();
    });

    window.addEventListener('meal:logged', () => {
      if (document.getElementById('food-tab-meals-list')) {
        this.fetchAndRenderFoodTab();
      }
      DashboardManager.fetchAndRenderData();
    });

    window.addEventListener('exercise:logged', () => {
      if (document.getElementById('ex-tab-workouts-list')) {
        this.fetchAndRenderExerciseTab();
      }
      DashboardManager.fetchAndRenderData();
    });

    // Profile Dropdown Actions & Close Outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('profile-dropdown-menu');

      if (dropdown && !e.target.closest('.user-profile-menu-wrapper')) {
        dropdown.style.display = 'none';
      }

      // Menu Actions
      if (e.target.closest('#p-menu-profile') || e.target.closest('#p-header-setup-btn')) {
        ProfileManager.showModal();
        if (dropdown) dropdown.style.display = 'none';
      }

      if (e.target.closest('#p-menu-settings')) {
        SettingsManager.showModal();
        if (dropdown) dropdown.style.display = 'none';
      }

      if (e.target.closest('#p-menu-logout')) {
        if (dropdown) dropdown.style.display = 'none';
        this.showLogoutConfirmModal();
      }
    });
  }

  static renderLandingPage(mainContainer, isAuthWithoutProfile = false) {
    const navTabs = document.getElementById('app-nav-tabs');
    if (navTabs) navTabs.style.display = 'none';

    const buttonText = isAuthWithoutProfile ? '⚡ Set Up Your Physical Profile' : 'Get Started';

    mainContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Personalized Health & Caloric Pace Intelligence</h1>
        <p class="text-muted" style="max-width: 600px; margin: 0 auto 2rem;">
          Track remaining daily calories, macro splits, and Net MET exercise credits with Google Gemini AI natural language parsing.
        </p>
        <button id="hero-get-started-btn" class="btn btn-primary" style="padding: 0.8rem 2rem; font-size: 1rem;">
          ${buttonText}
        </button>
      </div>
    `;

    document.getElementById('hero-get-started-btn')?.addEventListener('click', () => {
      if (APIClient.isAuthenticated()) {
        ProfileManager.showModal();
      } else {
        AuthManager.showModal();
      }
    });
  }

  static async checkStateAndRoute() {
    const mainContainer = document.getElementById('main-content');
    const navTabs = document.getElementById('app-nav-tabs');

    if (!mainContainer) return;

    if (!APIClient.isAuthenticated()) {
      this.renderLandingPage(mainContainer, false);
      await this.updateHeader(false);
      AuthManager.showModal();
      return;
    }

    // Authenticated: check if physical profile exists
    let profile = null;
    try {
      profile = await APIClient.request(ENDPOINTS.PROFILE_ME);
    } catch (err) {
      if (!APIClient.isAuthenticated()) {
        this.renderLandingPage(mainContainer, false);
        await this.updateHeader(false);
        AuthManager.showModal();
        return;
      }
      profile = null;
    }

    if (profile) {
      if (navTabs) navTabs.style.display = 'flex';
      await this.updateHeader(true, profile);
      try {
        await DashboardManager.render(mainContainer);
      } catch (dashErr) {
        console.error('Dashboard render error:', dashErr);
      }
    } else {
      if (navTabs) navTabs.style.display = 'none';
      this.renderLandingPage(mainContainer, true);
      await this.updateHeader(true, null);
      ProfileManager.showModal();
    }
  }

  static async updateHeader(isAuthenticated, profileData = null) {
    const nav = document.getElementById('user-nav');
    if (!nav) return;

    if (isAuthenticated) {
      let userName = 'User';
      let initials = 'U';
      let hasProfile = !!profileData;

      if (!profileData) {
        try {
          profileData = await APIClient.request(ENDPOINTS.PROFILE_ME);
          hasProfile = !!profileData;
        } catch (err) {
          hasProfile = false;
        }
      }

      if (profileData && profileData.name) {
        userName = profileData.name;
        const parts = userName.trim().split(' ');
        initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
      }

      if (hasProfile) {
        nav.innerHTML = `
          <div class="user-profile-menu-wrapper" style="position: relative;">
            <button id="profile-menu-toggle" type="button" style="display: flex; align-items: center; gap: 0.6rem; background: rgba(22, 27, 34, 0.8); border: 1px solid var(--border-glass); padding: 0.35rem 0.85rem; border-radius: 999px; cursor: pointer; color: var(--text-primary); font-family: var(--font-body);">
              <div style="width: 28px; height: 28px; background: var(--accent-health); color: #000; font-weight: 800; font-size: 0.8rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); pointer-events: none;">
                ${initials}
              </div>
              <span style="font-weight: 600; font-size: 0.85rem; pointer-events: none;">${userName}</span>
              <span style="color: var(--text-secondary); font-size: 1rem; margin-left: 0.2rem; pointer-events: none;">&#8942;</span>
            </button>

            <!-- Top Right Profile Glass Dropdown -->
            <div id="profile-dropdown-menu" style="display: none; position: absolute; right: 0; top: 125%; background: #161B22; border: 1px solid var(--border-glass); border-radius: 12px; padding: 0.5rem; min-width: 175px; box-shadow: var(--shadow-card); z-index: 9999;">
              <button id="p-menu-profile" type="button" style="width: 100%; text-align: left; background: transparent; border: none; color: var(--text-primary); padding: 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem;">
                👤 Edit Profile Stats
              </button>
              <button id="p-menu-settings" type="button" style="width: 100%; text-align: left; background: transparent; border: none; color: var(--text-primary); padding: 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem;">
                ⚙️ Settings
              </button>
              <div style="border-top: 1px solid var(--border-glass); margin: 0.35rem 0;"></div>
              <button id="p-menu-logout" type="button" style="width: 100%; text-align: left; background: transparent; border: none; color: #EF4444; padding: 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem;">
                🚪 Log Out
              </button>
            </div>
          </div>
        `;

        const toggleBtn = document.getElementById('profile-menu-toggle');
        const dropdown = document.getElementById('profile-dropdown-menu');
        if (toggleBtn && dropdown) {
          toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const curDisplay = dropdown.style.display;
            dropdown.style.display = (curDisplay === 'block') ? 'none' : 'block';
          };
        }
      } else {
        nav.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button id="p-menu-logout" class="btn" style="padding: 0.4rem 0.75rem; font-size: 0.85rem; color: #EF4444;">
              Log Out
            </button>
          </div>
        `;
      }
    } else {
      nav.innerHTML = ``;
    }
  }

  static renderLogoutConfirmModal() {
    if (document.getElementById('logout-confirm-modal')) return;

    const modalHTML = `
      <div id="logout-confirm-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 420px; text-align: center; padding: 1.75rem; position: relative;">
          
          <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.6rem;">
            🚪
          </div>

          <h3 style="font-family: var(--font-heading); margin-bottom: 0.5rem; font-size: 1.25rem; color: var(--text-primary);">
            Log Out of GetFit?
          </h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">
            Are you sure you want to end your active session? You will need to sign in again to access your dashboard.
          </p>

          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" id="btn-cancel-logout" class="btn" style="flex: 1; padding: 0.6rem; background: rgba(255,255,255,0.08); color: var(--text-primary); border-radius: 8px; font-weight: 600; border: 1px solid var(--border-glass); cursor: pointer;">
              Cancel
            </button>
            <button type="button" id="btn-confirm-logout" class="btn" style="flex: 1; padding: 0.6rem; background: #EF4444; color: #FFF; border-radius: 8px; font-weight: 700; border: none; cursor: pointer;">
              Log Out
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btn-cancel-logout')?.addEventListener('click', () => {
      document.getElementById('logout-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-confirm-logout')?.addEventListener('click', () => {
      document.getElementById('logout-confirm-modal')?.classList.remove('active');
      APIClient.clearTokens();
      this.checkStateAndRoute();
    });
  }

  static showLogoutConfirmModal() {
    this.renderLogoutConfirmModal();
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) modal.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

