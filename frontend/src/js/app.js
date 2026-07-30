/* Main Application Entry Point & State Router */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { AuthManager } from './auth.js';
import { ProfileManager } from './profile.js';
import { DashboardManager } from './dashboard.js';
import { LoggingManager } from './logging.js';
import { AnalyticsManager } from './analytics.js';

export class App {
  static async init() {
    try {
      AuthManager.init();
      ProfileManager.init();
      LoggingManager.init();
      AnalyticsManager.init();
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
      }
    });
  }

  static async renderFoodTab(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto;">
        
        <!-- Header Strip -->
        <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
          <div>
            <h2 style="font-family: var(--font-heading); margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 0.5rem;">
              🥗 Food & Nutrition Center
            </h2>
            <p class="text-muted" style="margin-top: 0.25rem; font-size: 0.85rem;">
              Log meals via Gemini AI natural language or manual entry with automated micronutrient enrichment.
            </p>
          </div>
          <button id="btn-manual-meal" class="btn btn-primary" style="padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
            + Manual Meal Entry
          </button>
        </div>

        <!-- AI Food Logger Card -->
        <div class="glass-card">
          <h3 style="font-size: 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>✨</span> Log Meal with Gemini AI
          </h3>
          <form id="ai-meal-form" class="ai-prompt-bar">
            <input type="text" id="ai-meal-input" class="ai-prompt-input" placeholder="E.g., '2 boiled eggs, whole wheat toast, and black coffee'..." required />
            <button type="submit" id="ai-meal-btn" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
              Log Meal
            </button>
          </form>
          <div id="ai-meal-status" style="display:none; font-size: 0.85rem; margin-top: 0.75rem; color: var(--accent-health);"></div>
        </div>

        <!-- Today's Logged Meals List -->
        <div class="glass-card">
          <h3 style="margin-bottom: 1rem; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
            <span>🥗 Today's Logged Meals</span>
            <span id="food-tab-cals-count" class="text-muted" style="font-size: 0.85rem;"></span>
          </h3>
          <div id="food-tab-meals-list" class="scrollable-timeline" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 450px; overflow-y: auto;">
            <p class="text-muted" style="font-size: 0.85rem;">Loading today's meals...</p>
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
      if (!Array.isArray(meals) || meals.length === 0) {
        listEl.innerHTML = `<p class="text-muted" style="font-size: 0.85rem; padding: 1.5rem; text-align: center;">No meals logged today yet.</p>`;
        if (calsCountEl) calsCountEl.textContent = '0 kcal consumed';
        return;
      }

      const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      if (calsCountEl) calsCountEl.textContent = `${totalCals} kcal consumed today`;

      listEl.innerHTML = meals.map(m => `
        <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-weight: 700; text-transform: capitalize; font-size: 0.9rem; color: var(--accent-health);">${m.meal_type}</span>
              <span style="color: var(--text-secondary); font-size: 0.85rem;">• ${m.description}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <span>🥩 P: ${m.protein_g}g</span>
              <span>🍞 C: ${m.carbs_g}g</span>
              <span>🥑 F: ${m.fat_g}g</span>
              <span>🌾 Fiber: ${m.fiber_g || 0}g</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${m.calories} kcal</span>
            <button class="btn-delete-food-item" data-id="${m.id}" style="background: transparent; border: none; color: #EF4444; cursor: pointer; font-size: 1rem; opacity: 0.7;" title="Delete meal">🗑️</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.btn-delete-food-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          if (confirm('Are you sure you want to delete this meal entry?')) {
            await APIClient.request(`${ENDPOINTS.MEALS}/${id}`, { method: 'DELETE' });
            this.fetchAndRenderFoodTab();
            DashboardManager.fetchAndRenderData();
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<p class="text-muted" style="color: #EF4444; font-size: 0.85rem;">Failed to load meals.</p>`;
    }
  }

  static async renderExerciseTab(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto;">
        
        <!-- Header Strip -->
        <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
          <div>
            <h2 style="font-family: var(--font-heading); margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 0.5rem;">
              ⚡ Workout & Fitness Center
            </h2>
            <p class="text-muted" style="margin-top: 0.25rem; font-size: 0.85rem;">
              Calculate scientific Net MET calorie burns for distance, reps/sets, or time-based sports.
            </p>
          </div>
          <button id="btn-manual-exercise" class="btn btn-cobalt" style="padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
            + Manual Workout Entry
          </button>
        </div>

        <!-- Structured 2-Step Scientific Exercise Logger Card -->
        <div class="glass-card">
          <h3 style="font-size: 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>⚡</span> Structured Workout Logger (Ainsworth MET Engine)
          </h3>
          <form id="dash-structured-ex-form" style="display: flex; flex-direction: column; gap: 0.85rem;">
            <!-- Step 1: Category Selection -->
            <div>
              <label class="form-label" style="font-size: 0.8rem; color: var(--text-secondary);">1. Select Exercise Category</label>
              <select id="dash-ex-cat-select" class="form-input" style="padding: 0.6rem; font-size: 0.85rem;" required>
                <option value="">Select Category...</option>
                <option value="distance">Distance-Based (Running, Cycling, Swimming)</option>
                <option value="reps">Reps & Sets-Based (Pushups, Squats, Weightlifting)</option>
                <option value="time">Time & Intensity-Based (Yoga, HIIT, Basketball)</option>
              </select>
            </div>

            <!-- Step 2: Specific Exercise Selection -->
            <div>
              <select id="dash-ex-item-select" class="form-input" style="padding: 0.6rem; font-size: 0.85rem; display: none;" required>
                <option value="">2. Select Specific Exercise...</option>
              </select>
            </div>

            <!-- Step 3: Dynamic Required Metric Fields -->
            <div id="dash-ex-dynamic-fields" style="display: none;"></div>

            <button type="submit" id="dash-ex-btn" class="btn btn-cobalt" style="padding: 0.6rem; font-size: 0.85rem; display: none;">
              Calculate & Log Workout
            </button>
          </form>
          <div id="dash-ex-status" style="display:none; font-size: 0.85rem; margin-top: 0.75rem; color: var(--accent-workout);"></div>
        </div>

        <!-- Today's Logged Workouts List -->
        <div class="glass-card">
          <h3 style="margin-bottom: 1rem; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
            <span>⚡ Today's Logged Workouts</span>
            <span id="ex-tab-burn-count" class="text-muted" style="font-size: 0.85rem;"></span>
          </h3>
          <div id="ex-tab-workouts-list" class="scrollable-timeline" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 450px; overflow-y: auto;">
            <p class="text-muted" style="font-size: 0.85rem;">Loading today's workouts...</p>
          </div>
        </div>

      </div>
    `;

    this.fetchAndRenderExerciseTab();
  }

  static async fetchAndRenderExerciseTab() {
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
        <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--accent-workout);">${w.exercise_name}</span>
              <span style="color: var(--text-secondary); font-size: 0.85rem;">• ${w.duration_minutes} mins</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
              <span>MET: ${w.met_value}</span> ${w.notes ? `| <span>${w.notes}</span>` : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--accent-workout);">${w.calories_burned} Net kcal</span>
            <button class="btn-delete-ex-item" data-id="${w.id}" style="background: transparent; border: none; color: #EF4444; cursor: pointer; font-size: 1rem; opacity: 0.7;" title="Delete workout">🗑️</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.btn-delete-ex-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          if (confirm('Are you sure you want to delete this workout entry?')) {
            await APIClient.request(`${ENDPOINTS.EXERCISES}/${id}`, { method: 'DELETE' });
            this.fetchAndRenderExerciseTab();
            DashboardManager.fetchAndRenderData();
          }
        });
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

    // Profile Dropdown Toggle & Delegation
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('#profile-menu-toggle');
      const dropdown = document.getElementById('profile-dropdown-menu');

      if (toggleBtn && dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        return;
      }

      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }

      // Menu Actions
      if (e.target.closest('#p-menu-profile') || e.target.closest('#p-header-setup-btn')) {
        ProfileManager.showModal();
        if (dropdown) dropdown.style.display = 'none';
      }

      if (e.target.closest('#p-menu-logout')) {
        APIClient.clearTokens();
        if (dropdown) dropdown.style.display = 'none';
        this.checkStateAndRoute();
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
    let hasProfile = false;
    try {
      await APIClient.request(ENDPOINTS.PROFILE_ME);
      hasProfile = true;
    } catch (err) {
      if (!APIClient.isAuthenticated()) {
        // Session expired or token cleared during request
        this.renderLandingPage(mainContainer, false);
        await this.updateHeader(false);
        AuthManager.showModal();
        return;
      }
      hasProfile = false;
    }

    if (hasProfile) {
      if (navTabs) navTabs.style.display = 'flex';
      await this.updateHeader(true, true);
      try {
        await DashboardManager.render(mainContainer);
      } catch (dashErr) {
        console.error('Dashboard render error:', dashErr);
      }
    } else {
      if (navTabs) navTabs.style.display = 'none';
      this.renderLandingPage(mainContainer, true);
      await this.updateHeader(true, false);
      ProfileManager.showModal();
    }
  }

  static async updateHeader(isAuthenticated, hasProfile = true) {
    const nav = document.getElementById('user-nav');
    if (!nav) return;

    if (isAuthenticated) {
      let userName = 'User';
      let initials = 'U';

      if (hasProfile) {
        try {
          const profile = await APIClient.request(ENDPOINTS.PROFILE_ME);
          userName = profile.name || 'User';
          const parts = userName.trim().split(' ');
          initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
        } catch (err) {
          hasProfile = false;
        }
      }

      if (hasProfile) {
        nav.innerHTML = `
          <div class="user-profile-menu-wrapper" style="position: relative;">
            <button id="profile-menu-toggle" style="display: flex; align-items: center; gap: 0.6rem; background: rgba(22, 27, 34, 0.8); border: 1px solid var(--border-glass); padding: 0.35rem 0.85rem; border-radius: 999px; cursor: pointer; color: var(--text-primary); font-family: var(--font-body);">
              <div style="width: 28px; height: 28px; background: var(--accent-health); color: #000; font-weight: 800; font-size: 0.8rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading);">
                ${initials}
              </div>
              <span style="font-weight: 600; font-size: 0.85rem;">${userName}</span>
              <span style="color: var(--text-secondary); font-size: 1rem; margin-left: 0.2rem;">&#8942;</span>
            </button>

            <!-- Top Right Profile Glass Dropdown -->
            <div id="profile-dropdown-menu" style="display: none; position: absolute; right: 0; top: 120%; background: #161B22; border: 1px solid var(--border-glass); border-radius: 12px; padding: 0.5rem; min-width: 170px; box-shadow: var(--shadow-card); z-index: 1000;">
              <button id="p-menu-profile" style="width: 100%; text-align: left; background: transparent; border: none; color: var(--text-primary); padding: 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem;">
                👤 Edit Profile Stats
              </button>
              <button id="p-menu-settings" style="width: 100%; text-align: left; background: transparent; border: none; color: var(--text-primary); padding: 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem;">
                ⚙️ Settings
              </button>
              <div style="border-top: 1px solid var(--border-glass); margin: 0.35rem 0;"></div>
              <button id="p-menu-logout" style="width: 100%; text-align: left; background: transparent; border: none; color: #EF4444; padding: 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem;">
                🚪 Log Out
              </button>
            </div>
          </div>
        `;
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
}

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
