/* Authentication UI Handler Module with Live Password Constraints Tooltip */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';

export class AuthManager {
  static init() {
    this.renderAuthModal();
    this.bindEvents();
  }

  static renderAuthModal() {
    if (document.getElementById('auth-modal')) return;

    const modalHTML = `
      <div id="auth-modal" class="modal-overlay">
        <div class="modal-content" style="position: relative;">
          <div class="modal-header">
            <h2 id="auth-modal-title">Welcome to GetFit</h2>
          </div>
          
          <div id="auth-error" class="text-danger" style="display:none; margin-bottom:1rem; font-size:0.85rem; color:#EF4444;"></div>

          <form id="auth-form">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="auth-email" class="form-input" placeholder="you@example.com" required />
            </div>

            <div class="form-group" style="position: relative;">
              <label class="form-label">Password</label>
              <input type="password" id="auth-password" class="form-input" placeholder="••••••••" required />
              
              <!-- In-Flow Password Requirements Card -->
              <div id="password-tooltip" class="password-requirements-card" style="display: none;">
                <div style="font-weight: 700; font-size: 0.75rem; color: var(--accent-health); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
                  Password Requirements
                </div>
                <div class="req-item" id="req-length"><span>⚪</span> Minimum 8 characters</div>
                <div class="req-item" id="req-upper"><span>⚪</span> At least 1 uppercase letter (A-Z)</div>
                <div class="req-item" id="req-lower"><span>⚪</span> At least 1 lowercase letter (a-z)</div>
                <div class="req-item" id="req-number"><span>⚪</span> At least 1 number (0-9)</div>
                <div class="req-item" id="req-special"><span>⚪</span> At least 1 special character (!@#$%^&*)</div>
              </div>
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
    const passInput = document.getElementById('auth-password');
    const tooltip = document.getElementById('password-tooltip');

    // Real-time Live Password Validation Checkers
    passInput.addEventListener('input', () => {
      if (!isSignUp) return;
      const val = passInput.value;

      const updateRule = (id, isValid) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isValid) {
          el.classList.add('met');
          el.querySelector('span').textContent = '✔';
        } else {
          el.classList.remove('met');
          el.querySelector('span').textContent = '⚪';
        }
      };

      updateRule('req-length', val.length >= 8);
      updateRule('req-upper', /[A-Z]/.test(val));
      updateRule('req-lower', /[a-z]/.test(val));
      updateRule('req-number', /[0-9]/.test(val));
      updateRule('req-special', /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(val));
    });

    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = !isSignUp;
      errorBox.style.display = 'none';

      if (isSignUp) {
        title.textContent = 'Create GetFit Account';
        submitBtn.textContent = 'Sign Up';
        togglePrompt.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign In';
        if (tooltip) tooltip.style.display = 'block';
        passInput.dispatchEvent(new Event('input'));
      } else {
        title.textContent = 'Welcome Back';
        submitBtn.textContent = 'Sign In';
        togglePrompt.textContent = "Don't have an account?";
        toggleLink.textContent = 'Sign Up';
        if (tooltip) tooltip.style.display = 'none';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = isSignUp ? 'Creating Account...' : 'Signing In...';

      const email = document.getElementById('auth-email').value.trim();
      const password = passInput.value;

      try {
        if (isSignUp) {
          // Register account
          try {
            await APIClient.request(ENDPOINTS.REGISTER, {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            });
          } catch (regErr) {
            // If email already exists, continue to login instead of throwing 500/400
            if (!regErr.message.includes('already exists')) {
              throw regErr;
            }
          }
        }

        // Login to issue JWT access & refresh tokens
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
