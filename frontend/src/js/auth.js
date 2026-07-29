/* Authentication UI Handler Module */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';

export class AuthManager {
  static init() {
    this.renderAuthModal();
    this.bindEvents();
  }

  static renderAuthModal() {
    const modalHTML = `
      <div id="auth-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="auth-modal-title">Welcome to GetFit</h2>
          </div>
          
          <div id="auth-error" class="text-danger" style="display:none; margin-bottom:1rem; font-size:0.85rem; color:#EF4444;"></div>

          <form id="auth-form">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="auth-email" class="form-input" placeholder="you@example.com" required />
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="auth-password" class="form-input" placeholder="••••••••" required />
            </div>

            <button type="submit" id="auth-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
              Sign In
            </button>
          </form>

          <div style="margin-top: 1.5rem; text-align: center; font-size: 0.85rem; color: var(--text-secondary);">
            <span id="auth-toggle-prompt">Don't have an account?</span>
            <a href="#" id="auth-toggle-link" style="color: var(--accent-health); font-weight: 600; text-decoration: none; margin-left: 0.35rem;">Sign Up</a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static bindEvents() {
    let isSignUp = false;

    const modal = document.getElementById('auth-modal');
    const form = document.getElementById('auth-form');
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const togglePrompt = document.getElementById('auth-toggle-prompt');
    const toggleLink = document.getElementById('auth-toggle-link');
    const errorBox = document.getElementById('auth-error');

    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = !isSignUp;
      errorBox.style.display = 'none';

      if (isSignUp) {
        title.textContent = 'Create GetFit Account';
        submitBtn.textContent = 'Sign Up';
        togglePrompt.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign In';
      } else {
        title.textContent = 'Welcome Back';
        submitBtn.textContent = 'Sign In';
        togglePrompt.textContent = "Don't have an account?";
        toggleLink.textContent = 'Sign Up';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = isSignUp ? 'Creating Account...' : 'Signing In...';

      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      try {
        if (isSignUp) {
          // Register
          await APIClient.request(ENDPOINTS.REGISTER, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
        }

        // Login
        const loginData = await APIClient.request(ENDPOINTS.LOGIN, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        APIClient.setTokens(loginData.access_token, loginData.refresh_token);
        modal.classList.remove('active');
        window.dispatchEvent(new Event('auth:success'));
      } catch (err) {
        errorBox.innerText = err.message;
        errorBox.style.whiteSpace = 'pre-line';
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
      }
    });
  }

  static showModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('active');
  }
}
