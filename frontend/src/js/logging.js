/* Logging Manager: Gemini AI Food Logger, 2-Step Structured Exercise Engine & Manual Modals */
import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { DashboardManager } from './dashboard.js';

export class LoggingManager {
  static init() {
    this.catalog = [];
    this.bindAIFoodForm();
    this.bindStructuredExerciseCard();
    this.renderManualMealModal();
    this.renderManualExerciseModal();
    this.bindManualEvents();
    this.loadExerciseCatalog();
  }

  static async loadExerciseCatalog() {
    try {
      this.catalog = await APIClient.request(ENDPOINTS.EXERCISES_CATALOG);
    } catch (err) {
      console.error('Failed to load exercise catalog:', err);
    }
  }

  static bindAIFoodForm() {
    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'ai-meal-form') {
        e.preventDefault();
        const input = document.getElementById('ai-meal-input');
        const btn = document.getElementById('ai-meal-btn');
        const statusBox = document.getElementById('ai-meal-status');
        const prompt = input.value.trim();

        if (!prompt) return;

        btn.disabled = true;
        btn.textContent = '✨ Parsing...';
        statusBox.style.display = 'block';
        statusBox.style.color = 'var(--accent-health)';
        statusBox.textContent = 'Asking Gemini AI...';

        try {
          const result = await APIClient.request(ENDPOINTS.MEALS_AI, {
            method: 'POST',
            body: JSON.stringify({ text_prompt: prompt }),
          });

          statusBox.textContent = `Logged meal: "${result.description}" (${result.calories} kcal)`;
          input.value = '';
          await DashboardManager.fetchAndRenderData();
        } catch (err) {
          statusBox.style.color = '#EF4444';
          statusBox.textContent = `Error: ${err.message}`;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Parse Meal';
        }
      }
    });
  }

  static bindStructuredExerciseCard() {
    document.addEventListener('change', (e) => {
      // Step 1: Category Changed
      if (e.target && e.target.id === 'dash-ex-cat-select') {
        const cat = e.target.value;
        const itemSelect = document.getElementById('dash-ex-item-select');
        const dynamicFields = document.getElementById('dash-ex-dynamic-fields');
        const submitBtn = document.getElementById('dash-ex-btn');

        if (!cat) {
          itemSelect.style.display = 'none';
          dynamicFields.style.display = 'none';
          submitBtn.style.display = 'none';
          return;
        }

        const filtered = (this.catalog || []).filter(x => x.category === cat);
        itemSelect.innerHTML = `<option value="">2. Select Specific Exercise...</option>` +
          filtered.map(x => `<option value="${x.id}">${x.name}</option>`).join('');

        itemSelect.style.display = 'block';
        dynamicFields.style.display = 'none';
        submitBtn.style.display = 'none';
      }

      // Step 2: Specific Exercise Item Changed
      if (e.target && e.target.id === 'dash-ex-item-select') {
        const exId = e.target.value;
        const dynamicFields = document.getElementById('dash-ex-dynamic-fields');
        const submitBtn = document.getElementById('dash-ex-btn');

        if (!exId) {
          dynamicFields.style.display = 'none';
          submitBtn.style.display = 'none';
          return;
        }

        const item = (this.catalog || []).find(x => x.id === exId);
        if (!item) return;

        if (item.category === 'distance') {
          dynamicFields.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Distance (km)</label>
                <input type="number" step="0.1" id="dash-dist-km" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" placeholder="5.0" required />
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Duration (mins, opt)</label>
                <input type="number" step="0.1" id="dash-dist-mins" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" placeholder="Auto" />
              </div>
            </div>
          `;
        } else if (item.category === 'reps') {
          dynamicFields.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Sets</label>
                <input type="number" id="dash-reps-sets" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" value="${item.default_sets || 3}" required />
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Reps / Set</label>
                <input type="number" id="dash-reps-count" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" value="${item.default_reps || 15}" required />
              </div>
            </div>
          `;
        } else {
          dynamicFields.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Duration (mins)</label>
                <input type="number" step="0.1" id="dash-time-mins" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" value="${item.default_duration_min || 30.0}" required />
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Intensity</label>
                <select id="dash-time-intensity" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;">
                  <option value="moderate">Moderate</option>
                  <option value="low">Low Light</option>
                  <option value="high">Vigorous / High</option>
                </select>
              </div>
            </div>
          `;
        }

        dynamicFields.style.display = 'block';
        submitBtn.style.display = 'block';
      }
    });

    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'dash-structured-ex-form') {
        e.preventDefault();
        const exId = document.getElementById('dash-ex-item-select')?.value;
        const btn = document.getElementById('dash-ex-btn');
        const statusBox = document.getElementById('dash-ex-status');

        if (!exId) return;

        btn.disabled = true;
        btn.textContent = 'Calculating MET calories...';
        statusBox.style.display = 'block';
        statusBox.style.color = 'var(--accent-workout)';
        statusBox.textContent = 'Calculating Net MET calories...';

        const payload = {
          exercise_id: exId,
          distance_km: parseFloat(document.getElementById('dash-dist-km')?.value) || null,
          sets: parseInt(document.getElementById('dash-reps-sets')?.value, 10) || null,
          reps: parseInt(document.getElementById('dash-reps-count')?.value, 10) || null,
          duration_minutes: parseFloat(document.getElementById('dash-time-mins')?.value || document.getElementById('dash-dist-mins')?.value) || null,
          intensity: document.getElementById('dash-time-intensity')?.value || 'moderate',
        };

        try {
          const result = await APIClient.request(ENDPOINTS.EXERCISES_STRUCTURED, {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          statusBox.textContent = `Logged: "${result.exercise_name}" (${result.calories_burned} Net kcal burned)`;
          document.getElementById('dash-ex-cat-select').value = '';
          document.getElementById('dash-ex-item-select').style.display = 'none';
          document.getElementById('dash-ex-dynamic-fields').style.display = 'none';
          btn.style.display = 'none';
          await DashboardManager.fetchAndRenderData();
        } catch (err) {
          statusBox.style.color = '#EF4444';
          statusBox.textContent = `Error: ${err.message}`;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Calculate & Log Workout';
        }
      }
    });
  }

  static renderManualMealModal() {
    const modalHTML = `
      <div id="manual-meal-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Log Manual Meal</h2>
            <button class="close-btn" id="close-meal-modal">&times;</button>
          </div>
          <form id="manual-meal-form">
            <div class="form-group">
              <label class="form-label">Meal Type</label>
              <select id="m-meal-type" class="form-input" required>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" id="m-meal-desc" class="form-input" placeholder="Grilled Chicken Breast" required />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Calories (kcal)</label>
                <input type="number" id="m-meal-cals" class="form-input" placeholder="450" required />
              </div>
              <div class="form-group">
                <label class="form-label">Protein (g)</label>
                <input type="number" step="0.1" id="m-meal-protein" class="form-input" placeholder="35" required />
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Carbs (g)</label>
                <input type="number" step="0.1" id="m-meal-carbs" class="form-input" placeholder="40" required />
              </div>
              <div class="form-group">
                <label class="form-label">Fat (g)</label>
                <input type="number" step="0.1" id="m-meal-fat" class="form-input" placeholder="10" required />
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Save Meal</button>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static renderManualExerciseModal() {
    const modalHTML = `
      <div id="manual-exercise-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Log 100% Manual Workout</h2>
            <button class="close-btn" id="close-exercise-modal">&times;</button>
          </div>
          <form id="manual-exercise-form">
            <div class="form-group">
              <label class="form-label">Exercise Name</label>
              <input type="text" id="m-ex-name" class="form-input" placeholder="Outdoor Basketball Game" required />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Duration (mins)</label>
                <input type="number" step="0.1" id="m-ex-dur" class="form-input" placeholder="45" required />
              </div>
              <div class="form-group">
                <label class="form-label">MET Value (e.g. 7.0)</label>
                <input type="number" step="0.1" id="m-ex-met" class="form-input" placeholder="7.0" value="7.0" required />
              </div>
            </div>
            <button type="submit" class="btn btn-cobalt" style="width: 100%; margin-top: 1rem;">Save Manual Workout</button>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static bindManualEvents() {
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'btn-manual-meal') {
        document.getElementById('manual-meal-modal').classList.add('active');
      }
      if (e.target && e.target.id === 'close-meal-modal') {
        document.getElementById('manual-meal-modal').classList.remove('active');
      }
      if (e.target && e.target.id === 'btn-manual-exercise') {
        document.getElementById('manual-exercise-modal').classList.add('active');
      }
      if (e.target && e.target.id === 'close-exercise-modal') {
        document.getElementById('manual-exercise-modal').classList.remove('active');
      }
    });

    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'manual-meal-form') {
        e.preventDefault();
        const payload = {
          meal_type: document.getElementById('m-meal-type').value,
          description: document.getElementById('m-meal-desc').value,
          calories: parseInt(document.getElementById('m-meal-cals').value, 10),
          protein_g: parseFloat(document.getElementById('m-meal-protein').value),
          carbs_g: parseFloat(document.getElementById('m-meal-carbs').value),
          fat_g: parseFloat(document.getElementById('m-meal-fat').value),
        };
        await APIClient.request(ENDPOINTS.MEALS, { method: 'POST', body: JSON.stringify(payload) });
        document.getElementById('manual-meal-modal').classList.remove('active');
        await DashboardManager.fetchAndRenderData();
      }

      if (e.target && e.target.id === 'manual-exercise-form') {
        e.preventDefault();
        const payload = {
          exercise_name: document.getElementById('m-ex-name').value,
          duration_minutes: parseFloat(document.getElementById('m-ex-dur').value),
          met_value: parseFloat(document.getElementById('m-ex-met').value),
          input_method: 'manual',
        };
        await APIClient.request(ENDPOINTS.EXERCISES, { method: 'POST', body: JSON.stringify(payload) });
        document.getElementById('manual-exercise-modal').classList.remove('active');
        await DashboardManager.fetchAndRenderData();
      }
    });
  }
}
