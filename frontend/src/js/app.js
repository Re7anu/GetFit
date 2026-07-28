/* GetFit Web Application Main Orchestrator Module */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { AuthManager } from './auth.js';
import { ProfileManager } from './profile.js';
import { DashboardManager } from './dashboard.js';
import { LoggingManager } from './logging.js';

class App {
  static async init() {
    console.log('[GetFit] App initializing...');
    
    // Initialize component managers
    AuthManager.init();
    ProfileManager.init();
    LoggingManager.init();

    this.bindGlobalEvents();
    await this.checkStateAndRoute();
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

    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'logout-btn') {
        e.preventDefault();
        APIClient.clearTokens();
        window.location.reload();
      }
    });
  }

  static async checkStateAndRoute() {
    const mainContainer = document.getElementById('main-content');

    if (!APIClient.isAuthenticated()) {
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
      // Profile exists: Render Main Hero Dashboard
      await DashboardManager.render(mainContainer);
      this.updateHeader(true);
    } catch (err) {
      // Profile required or 404
      this.updateHeader(true);
      ProfileManager.showModal();
    }
  }

  static updateHeader(isAuthenticated) {
    const nav = document.getElementById('user-nav');
    if (!nav) return;

    if (isAuthenticated) {
      nav.innerHTML = `
        <button id="logout-btn" class="btn" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">
          Log Out
        </button>
      `;
    } else {
      nav.innerHTML = ``;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
