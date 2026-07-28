/* GetFit Web Application Main Orchestrator Module */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { AuthManager } from './auth.js';
import { ProfileManager } from './profile.js';
import { DashboardManager } from './dashboard.js';
import { LoggingManager } from './logging.js';
import { AnalyticsManager } from './analytics.js';

class App {
  static async init() {
    console.log('[GetFit] App initializing...');
    
    // Render Modals into DOM
    this.renderModals();

    // Initialize component managers
    AuthManager.init();
    ProfileManager.init();
    LoggingManager.init();

    this.bindGlobalEvents();
    await this.checkStateAndRoute();
  }

  static renderModals() {
    // Render Themed Logout Confirm Modal & Settings Placeholder Modal
    const modalHTML = `
      <!-- Themed Logout Confirmation Modal -->
      <div id="logout-confirm-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2rem 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🚪</div>
          <h3 style="font-size: 1.25rem; font-family: var(--font-heading); margin-bottom: 0.5rem;">Confirm Log Out</h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">
            Are you sure you want to log out of GetFit? Your session will be safely ended.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button id="btn-cancel-logout" class="btn" style="flex: 1; padding: 0.6rem;">Cancel</button>
            <button id="btn-confirm-logout" class="btn" style="flex: 1; padding: 0.6rem; background: #EF4444; color: white; border: none; font-weight: 600;">Log Out</button>
          </div>
        </div>
      </div>

      <!-- Settings Placeholder Modal -->
      <div id="settings-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 420px; text-align: center; padding: 2rem 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚙️</div>
          <h3 style="font-size: 1.25rem; font-family: var(--font-heading); margin-bottom: 0.5rem;">GetFit Settings</h3>
          <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">
            App theme, notifications, unit preferences, and API integrations coming soon!
          </p>
          <button id="btn-close-settings" class="btn btn-primary" style="width: 100%; padding: 0.6rem;">Close</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static bindGlobalEvents() {
    window.addEventListener('auth:success', async () => {
      await this.checkStateAndRoute();
    });

    window.addEventListener('auth:unauthorized', () => {
      AuthManager.showModal();
    });

    window.addEventListener('profile:updated', async () => {
      await this.checkStateAndRoute();
    });

    // Navigation Tab Switching Handlers
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.nav-tab-btn');
        if (!tabBtn) return;

        document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        const tab = tabBtn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Profile Dropdown & Modal Events
    document.addEventListener('click', (e) => {
      // Toggle Top-Right Profile Dropdown Menu
      const toggle = e.target.closest('#profile-menu-toggle');
      const menu = document.getElementById('profile-dropdown-menu');

      if (toggle && menu) {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        return;
      }

      if (menu && !e.target.closest('#profile-dropdown-menu')) {
        menu.style.display = 'none';
      }

      // Handle Dropdown Actions
      if (e.target.closest('#p-menu-profile')) {
        if (menu) menu.style.display = 'none';
        ProfileManager.showModal();
      }

      if (e.target.closest('#p-menu-settings')) {
        if (menu) menu.style.display = 'none';
        document.getElementById('settings-modal').classList.add('active');
      }

      if (e.target.closest('#btn-close-settings')) {
        document.getElementById('settings-modal').classList.remove('active');
      }

      if (e.target.closest('#p-menu-logout')) {
        if (menu) menu.style.display = 'none';
        document.getElementById('logout-confirm-modal').classList.add('active');
      }

      if (e.target.closest('#btn-cancel-logout')) {
        document.getElementById('logout-confirm-modal').classList.remove('active');
      }

      if (e.target.closest('#btn-confirm-logout')) {
        APIClient.clearTokens();
        window.location.reload();
      }
    });
  }

  static async switchTab(tabName) {
    const mainContainer = document.getElementById('main-content');
    if (!mainContainer) return;

    if (tabName === 'dashboard') {
      await DashboardManager.render(mainContainer);
    } else if (tabName === 'food') {
      mainContainer.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 4rem 1rem; max-width: 800px; margin: 2rem auto;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🥗</div>
          <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem; font-family: var(--font-heading);">Food & Nutrition Module</h2>
          <p class="text-muted" style="max-width: 500px; margin: 0 auto 1.5rem;">
            Detailed meal breakdown, micro-nutrient tracking, and AI recipe generator coming soon!
          </p>
          <button class="btn btn-primary" onclick="document.querySelector('[data-tab=dashboard]').click()">Back to Dashboard</button>
        </div>
      `;
    } else if (tabName === 'exercise') {
      mainContainer.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 4rem 1rem; max-width: 800px; margin: 2rem auto;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚡</div>
          <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem; font-family: var(--font-heading);">Exercise & Workout Module</h2>
          <p class="text-muted" style="max-width: 500px; margin: 0 auto 1.5rem;">
            Ainsworth catalog explorer, set/rep cadence tracking, and workout logs coming soon!
          </p>
          <button class="btn btn-cobalt" onclick="document.querySelector('[data-tab=dashboard]').click()">Back to Dashboard</button>
        </div>
      `;
    } else if (tabName === 'analytics') {
      await AnalyticsManager.render(mainContainer);
    }
  }

  static async checkStateAndRoute() {
    const mainContainer = document.getElementById('main-content');
    const navTabs = document.getElementById('app-nav-tabs');

    if (!APIClient.isAuthenticated()) {
      if (navTabs) navTabs.style.display = 'none';
      mainContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Personalized Health & Caloric Pace Intelligence</h1>
          <p class="text-muted" style="max-width: 600px; margin: 0 auto 2rem;">
            Track remaining daily calories, macro splits, and Net MET exercise credits with Google Gemini AI natural language parsing.
          </p>
          <button id="hero-get-started-btn" class="btn btn-primary" style="padding: 0.8rem 2rem; font-size: 1rem;">
            Get Started
          </button>
        </div>
      `;

      document.getElementById('hero-get-started-btn')?.addEventListener('click', () => {
        AuthManager.showModal();
      });

      AuthManager.showModal();
      return;
    }

    // Authenticated: check if physical profile exists
    try {
      await APIClient.request(ENDPOINTS.PROFILE_ME);
      if (navTabs) navTabs.style.display = 'flex';
      // Profile exists: Render Main Hero Dashboard
      await DashboardManager.render(mainContainer);
      await this.updateHeader(true);
    } catch (err) {
      if (navTabs) navTabs.style.display = 'none';
      await this.updateHeader(true);
      ProfileManager.showModal();
    }
  }

  static async updateHeader(isAuthenticated) {
    const nav = document.getElementById('user-nav');
    if (!nav) return;

    if (isAuthenticated) {
      let userName = 'User';
      let initials = 'U';

      try {
        const profile = await APIClient.request(ENDPOINTS.PROFILE_ME);
        userName = profile.name || 'User';
        const parts = userName.trim().split(' ');
        initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
      } catch (err) {
        // Fallback
      }

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
      nav.innerHTML = ``;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
