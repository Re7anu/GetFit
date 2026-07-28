/* Physical Profile Onboarding & Target Pace Calculator Module */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';

export class ProfileManager {
  static init() {
    this.renderOnboardingModal();
    this.bindEvents();
  }

  static renderOnboardingModal() {
    const modalHTML = `
      <div id="profile-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2>Set Up Your Physical Profile</h2>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            We calculate your BMR, TDEE, and exact daily caloric pace automatically based on your physical metrics.
          </p>

          <div id="profile-error" style="display:none; margin-bottom:1rem; font-size:0.85rem; color:#EF4444;"></div>

          <form id="profile-form">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="prof-name" class="form-input" placeholder="Alex Morgan" required />
              </div>

              <div class="form-group">
                <label class="form-label">Biological Sex</label>
                <select id="prof-sex" class="form-input" required>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Birth Date</label>
                <input type="date" id="prof-birthdate" class="form-input" required />
              </div>

              <div class="form-group">
                <label class="form-label">Height (cm)</label>
                <input type="number" step="0.1" id="prof-height" class="form-input" placeholder="175" required />
              </div>

              <div class="form-group">
                <label class="form-label">Current Weight (kg)</label>
                <input type="number" step="0.1" id="prof-weight" class="form-input" placeholder="80" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Target Weight (kg)</label>
                <input type="number" step="0.1" id="prof-target-weight" class="form-input" placeholder="75" required />
              </div>

              <div class="form-group">
                <label class="form-label">Timeline (Weeks)</label>
                <input type="number" min="1" max="52" id="prof-timeline" class="form-input" placeholder="10" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Activity Level</label>
              <select id="prof-activity" class="form-input" required>
                <option value="sedentary">Sedentary (Office job, little exercise)</option>
                <option value="lightly_active">Lightly Active (1-3 days/week exercise)</option>
                <option value="moderately_active">Moderately Active (3-5 days/week exercise)</option>
                <option value="very_active">Very Active (6-7 days/week hard exercise)</option>
                <option value="extra_active">Extra Active (Physical job or 2x daily workouts)</option>
              </select>
            </div>

            <button type="submit" id="prof-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
              Save Physical Profile & Target Budget
            </button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static bindEvents() {
    const modal = document.getElementById('profile-modal');
    const form = document.getElementById('profile-form');
    const submitBtn = document.getElementById('prof-submit-btn');
    const errorBox = document.getElementById('profile-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Calculating Targets...';

      const payload = {
        name: document.getElementById('prof-name').value.trim(),
        sex: document.getElementById('prof-sex').value,
        birth_date: document.getElementById('prof-birthdate').value,
        height_cm: parseFloat(document.getElementById('prof-height').value),
        weight_kg: parseFloat(document.getElementById('prof-weight').value),
        target_weight_kg: parseFloat(document.getElementById('prof-target-weight').value),
        timeline_weeks: parseInt(document.getElementById('prof-timeline').value, 10),
        activity_level: document.getElementById('prof-activity').value,
      };

      try {
        await APIClient.request(ENDPOINTS.PROFILE, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        modal.classList.remove('active');
        window.dispatchEvent(new Event('profile:updated'));
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Physical Profile & Target Budget';
      }
    });
  }

  static showModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('active');
  }
}
