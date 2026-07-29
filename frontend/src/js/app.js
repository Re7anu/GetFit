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

  static renderFoodTab(container) {
    container.innerHTML = `
      <div class="glass-card" style="max-width: 600px; margin: 2rem auto;">
        <h3>🥗 Log Daily Meals & Nutrition</h3>
        <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.9rem;">
          Log your meals using natural language prompts powered by Google Gemini AI, or enter structured items manually.
        </p>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
          <button id="tab-ai-meal-btn" class="btn btn-primary" style="flex:1;">Log with Gemini AI</button>
          <button id="tab-manual-meal-btn" class="btn" style="flex:1;">+ Manual Meal Entry</button>
        </div>
      </div>
    `;

    document.getElementById('tab-ai-meal-btn')?.addEventListener('click', () => {
      const input = document.getElementById('ai-meal-input');
      if (input) input.focus();
    });

    document.getElementById('tab-manual-meal-btn')?.addEventListener('click', () => {
      document.getElementById('btn-manual-meal')?.click();
    });
  }

  static renderExerciseTab(container) {
    container.innerHTML = `
      <div class="glass-card" style="max-width: 600px; margin: 2rem auto;">
        <h3>⚡ Structured & AI Exercise Logger</h3>
        <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.9rem;">
          Log distance running, rep-based workouts with added weight, or continuous activities using Net MET calculations.
        </p>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
          <button id="tab-structured-ex-btn" class="btn btn-cobalt" style="flex:1;">Select Exercise Catalog</button>
          <button id="tab-manual-ex-btn" class="btn" style="flex:1;">+ Manual Exercise Entry</button>
        </div>
      </div>
    `;

    document.getElementById('tab-structured-ex-btn')?.addEventListener('click', () => {
      const catSelect = document.getElementById('dash-ex-cat-select');
      if (catSelect) catSelect.focus();
    });

    document.getElementById('tab-manual-ex-btn')?.addEventListener('click', () => {
      document.getElementById('btn-manual-exercise')?.click();
    });
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
