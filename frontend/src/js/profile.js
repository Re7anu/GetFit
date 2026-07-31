/* Physical Profile Onboarding & Target Pace Calculator Module */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';

export class ProfileManager {
  static init() {
    this.renderModal();
    this.bindEvents();
  }

  static renderModal() {
    if (document.getElementById('profile-modal')) return;

    const modalHTML = `
      <div id="profile-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 600px; position: relative;">
          
          <!-- Header with High-Visibility Circle Close Button -->
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <h2 id="profile-modal-title" style="margin: 0; font-size: 1.25rem; font-family: var(--font-heading);">Physical Profile & Caloric Pace</h2>
            <button type="button" id="close-profile-modal" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-glass); color: var(--text-primary); font-size: 1.25rem; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" title="Close Modal">&times;</button>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
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
                <label class="form-label">Gender</label>
                <select id="prof-gender" class="form-input" required>
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
              <label class="form-label">Daily Lifestyle / Occupation (Excludes Workouts)</label>
              <select id="prof-activity" class="form-input" required>
                <option value="sedentary">Sedentary (Desk job, office worker, student, mostly sitting)</option>
                <option value="lightly_active">Lightly Active (Teacher, retail, standing & walking throughout day)</option>
                <option value="moderately_active">Moderately Active (Waiter, nurse, delivery driver, active on feet)</option>
                <option value="very_active">Very Active (Construction worker, farmer, physical labor)</option>
                <option value="extra_active">Extra Active (Heavy manual labor, professional athlete)</option>
              </select>
              <p class="text-muted" style="font-size: 0.75rem; margin-top: 0.35rem; color: var(--accent-health);">
                💡 Do NOT include gym or sports workouts here—log workouts separately for 100% Net MET accuracy!
              </p>
            </div>

            <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
              <button type="button" id="btn-cancel-profile" class="btn" style="flex: 1; padding: 0.6rem;">Cancel</button>
              <button type="submit" id="prof-submit-btn" class="btn btn-primary" style="flex: 2; padding: 0.6rem;">
                Save Physical Profile
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
      const modal = document.getElementById('profile-modal');
      if (modal) modal.classList.remove('active');
    };

    document.addEventListener('click', (e) => {
      if (e.target && (e.target.id === 'close-profile-modal' || e.target.id === 'btn-cancel-profile' || e.target.closest('#close-profile-modal') || e.target.closest('#btn-cancel-profile'))) {
        closeModal();
      }
    });

    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'profile-form') {
        e.preventDefault();
        const form = e.target;
        const submitBtn = document.getElementById('prof-submit-btn');
        const errorBox = document.getElementById('profile-error');

        errorBox.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Calculating Targets...';

        const isEdit = form.getAttribute('data-is-edit') === 'true';

        const payload = {
          name: document.getElementById('prof-name').value.trim(),
          gender: document.getElementById('prof-gender').value,
          birth_date: document.getElementById('prof-birthdate').value,
          height_cm: parseFloat(document.getElementById('prof-height').value),
          weight_kg: parseFloat(document.getElementById('prof-weight').value),
          target_weight_kg: parseFloat(document.getElementById('prof-target-weight').value),
          timeline_weeks: parseInt(document.getElementById('prof-timeline').value, 10),
          activity_level: document.getElementById('prof-activity').value,
        };

        try {
          if (isEdit) {
            await APIClient.request(`${ENDPOINTS.PROFILE}/me`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
          } else {
            await APIClient.request(ENDPOINTS.PROFILE, {
              method: 'POST',
              body: JSON.stringify(payload),
            });
          }

          closeModal();
          window.dispatchEvent(new Event('profile:updated'));
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Physical Profile';
        }
      }
    });
  }

  static async showModal() {
    this.renderModal();
    const modal = document.getElementById('profile-modal');
    const form = document.getElementById('profile-form');

    if (modal) modal.classList.add('active');

    // Fetch and pre-populate existing details
    if (APIClient.isAuthenticated()) {
      try {
        const profile = await APIClient.request(ENDPOINTS.PROFILE_ME);
        if (profile && form) {
        document.getElementById('prof-name').value = profile.name || '';
        document.getElementById('prof-gender').value = profile.gender || profile.sex || 'male';
        if (profile.birth_date) {
          document.getElementById('prof-birthdate').value = String(profile.birth_date).substring(0, 10);
        }
        document.getElementById('prof-height').value = profile.height_cm || '';
        document.getElementById('prof-weight').value = profile.weight_kg || '';
        document.getElementById('prof-target-weight').value = profile.target_weight_kg || '';
        document.getElementById('prof-timeline').value = profile.timeline_weeks || '';
        document.getElementById('prof-activity').value = profile.activity_level || 'sedentary';

        form.setAttribute('data-is-edit', 'true');
        const titleEl = document.getElementById('profile-modal-title');
        if (titleEl) titleEl.textContent = 'Edit Physical Profile';
      }
    } catch (err) {
      console.warn('First time profile setup or load error:', err.message);
      if (form) form.removeAttribute('data-is-edit');
      const titleEl = document.getElementById('profile-modal-title');
      if (titleEl) titleEl.textContent = 'Set Up Your Physical Profile';
    }
    }
  }
}
