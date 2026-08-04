/* Settings & Preferences Modal Handler Module */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';

export class SettingsManager {
  static init() {
    this.renderModal();
    this.bindEvents();
  }

  static renderModal() {
    if (document.getElementById('settings-modal')) return;

    const modalHTML = `
      <div id="settings-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 580px; width: 94%; max-height: 90vh; padding: 1.5rem; position: relative;">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <h2 style="margin: 0; font-size: 1.2rem; font-family: var(--font-heading); display: flex; align-items: center; gap: 0.5rem;">
              ⚙️ App Settings & Preferences
            </h2>
            <button type="button" id="close-settings-modal" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-glass); color: var(--text-primary); font-size: 1.25rem; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" title="Close Modal">&times;</button>
          </div>

          <div id="settings-error" style="display:none; margin-bottom:0.75rem; font-size:0.8rem; color:#EF4444;"></div>
          <div id="settings-success" style="display:none; margin-bottom:0.75rem; font-size:0.8rem; color:#10B981;"></div>

          <form id="settings-form">
            
            <!-- Section 1: Nightly Email Report & Notification Preferences -->
            <div style="background: rgba(15, 23, 42, 0.5); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-glass); margin-bottom: 1.25rem;">
              
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <h3 style="font-size: 0.95rem; font-family: var(--font-heading); margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                    <span>✉️</span> Nightly Email Summary & AI Insights
                  </h3>
                  <span style="font-size: 0.75rem; color: var(--text-secondary);">Automated daily HTML report delivered to your inbox</span>
                </div>
                
                <button type="button" id="btn-settings-send-test" class="btn" style="padding: 0.3rem 0.75rem; font-size: 0.75rem; background: rgba(99, 102, 241, 0.2); color: #818CF8; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; font-weight: 700; transition: all 0.2s;">
                  <span>⚡</span> Send Test Report Now
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.85rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.85rem;">
                
                <!-- Toggle Switch -->
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <label for="set-enable-email" style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); cursor: pointer; display: block;">Enable Daily Email Summary</label>
                    <span style="font-size: 0.72rem; color: var(--text-secondary);">Receive nightly macro stats & personalized Gemini AI coaching insights</span>
                  </div>
                  <label class="toggle-switch-container">
                    <input type="checkbox" id="set-enable-email" class="switch-input" checked />
                  </label>
                </div>

                <!-- Preferred Delivery Time (Freeform Time Input) -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.75rem; margin-bottom: 0.25rem;">Preferred Email Delivery Time</label>
                  <input type="time" id="set-email-time" class="form-input" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" value="21:00" required />
                  <span style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem; display: block;">Pick any custom dispatch time (24-hour precision)</span>
                </div>

              </div>

              <div id="settings-test-status" style="display: none; font-size: 0.75rem; margin-top: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 6px; font-weight: 600;"></div>
            </div>

            <!-- Section 2: Day Cutoff / Night Owl Rollover Time -->
            <div style="background: rgba(15, 23, 42, 0.5); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-glass); margin-bottom: 1.25rem;">
              <h3 style="font-size: 0.95rem; font-family: var(--font-heading); margin: 0 0 0.4rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                <span>🌙</span> Day Rollover / Night Owl Cutoff Time
              </h3>
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem; line-height: 1.35;">
                If you sleep past midnight (e.g., 2:00 AM or 3:00 AM), set your cutoff time here. Any meals or workouts logged before your cutoff time will count towards yesterday's daily budget!
              </p>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.75rem; margin-bottom: 0.25rem;">Fitness Day Cutoff Time</label>
                <input type="time" id="set-day-cutoff" class="form-input" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" value="00:00" required />
                <span style="font-size: 0.7rem; color: var(--accent-health); margin-top: 0.25rem; display: block; font-weight: 600;">
                  💡 Example: Setting 03:00 AM keeps late 1:30 AM snacks on yesterday's log!
                </span>
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
              <button type="button" id="btn-cancel-settings" class="btn" style="flex: 1; padding: 0.55rem; font-size: 0.85rem;">Cancel</button>
              <button type="submit" id="settings-submit-btn" class="btn btn-primary" style="flex: 2; padding: 0.55rem; font-size: 0.85rem;">
                Save Settings
              </button>
            </div>
          </form>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static bindEvents() {
    const closeModal = () => {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.remove('active');
    };

    document.addEventListener('click', async (e) => {
      if (e.target && (e.target.id === 'close-settings-modal' || e.target.id === 'btn-cancel-settings' || e.target.closest('#close-settings-modal') || e.target.closest('#btn-cancel-settings'))) {
        closeModal();
      }

      // Handle ⚡ Send Test Report Now button click
      const sendTestBtn = e.target.closest('#btn-settings-send-test');
      if (sendTestBtn) {
        e.preventDefault();
        const statusBox = document.getElementById('settings-test-status');
        sendTestBtn.disabled = true;
        sendTestBtn.style.opacity = '0.6';
        if (statusBox) {
          statusBox.style.display = 'block';
          statusBox.style.background = 'rgba(99, 102, 241, 0.15)';
          statusBox.style.color = '#818CF8';
          statusBox.style.border = '1px solid rgba(99, 102, 241, 0.3)';
          statusBox.textContent = '⏳ Generating and sending HTML email report via Resend...';
        }

        try {
          const res = await APIClient.request(ENDPOINTS.SEND_DAILY_REPORT, {
            method: 'POST',
          });
          if (statusBox) {
            statusBox.style.background = 'rgba(16, 185, 129, 0.15)';
            statusBox.style.color = '#10B981';
            statusBox.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            const recipient = res.recipient || 'your registered email';
            statusBox.textContent = `✅ Test report sent to ${recipient}! Check your inbox.`;
          }
        } catch (err) {
          if (statusBox) {
            statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBox.style.color = '#EF4444';
            statusBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            statusBox.textContent = `❌ Failed to send email report: ${err.message}`;
          }
        } finally {
          sendTestBtn.disabled = false;
          sendTestBtn.style.opacity = '1';
        }
      }
    });

    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'settings-form') {
        e.preventDefault();
        const submitBtn = document.getElementById('settings-submit-btn');
        const errorBox = document.getElementById('settings-error');
        const successBox = document.getElementById('settings-success');

        if (errorBox) errorBox.style.display = 'none';
        if (successBox) successBox.style.display = 'none';
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Settings...';

        const payload = {
          enable_daily_email_report: document.getElementById('set-enable-email').checked,
          preferred_email_time: document.getElementById('set-email-time').value,
          day_cutoff_time: document.getElementById('set-day-cutoff').value,
        };

        try {
          await APIClient.request(`${ENDPOINTS.PROFILE}/me`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });

          if (successBox) {
            successBox.textContent = 'Settings saved successfully!';
            successBox.style.display = 'block';
          }
          setTimeout(() => closeModal(), 600);
        } catch (err) {
          if (errorBox) {
            errorBox.textContent = err.message;
            errorBox.style.display = 'block';
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Settings';
        }
      }
    });
  }

  static async showModal() {
    this.renderModal();
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('active');

    if (APIClient.isAuthenticated()) {
      try {
        const profile = await APIClient.request(ENDPOINTS.PROFILE_ME);
        if (profile) {
          if (document.getElementById('set-enable-email')) {
            document.getElementById('set-enable-email').checked = profile.enable_daily_email_report !== false;
          }
          if (document.getElementById('set-email-time')) {
            document.getElementById('set-email-time').value = profile.preferred_email_time || '21:00';
          }
          if (document.getElementById('set-day-cutoff')) {
            document.getElementById('set-day-cutoff').value = profile.day_cutoff_time || '00:00';
          }
        }
      } catch (err) {
        console.warn('[SettingsManager] Failed to load user profile preferences:', err.message);
      }
    }
  }
}
