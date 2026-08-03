import { APIClient } from './api_client.js';
import { ENDPOINTS } from './config.js';
import { DashboardManager } from './dashboard.js';
import { App } from './app.js';

const FALLBACK_EXERCISE_CATALOG = [
  // Distance-Based
  { id: 'running_outdoor', name: 'Outdoor Running', category: 'distance', met: 8.0 },
  { id: 'running_treadmill', name: 'Treadmill Running', category: 'distance', met: 7.5 },
  { id: 'cycling_outdoor', name: 'Outdoor Cycling', category: 'distance', met: 7.5 },
  { id: 'cycling_stationary', name: 'Stationary Bike', category: 'distance', met: 6.8 },
  { id: 'walking_normal', name: 'Normal Walking', category: 'distance', met: 3.5 },
  { id: 'walking_brisk', name: 'Brisk Walking', category: 'distance', met: 4.3 },
  { id: 'walking_hiking', name: 'Hiking / Trail Walking', category: 'distance', met: 6.0 },
  { id: 'rowing_machine', name: 'Rowing Machine', category: 'distance', met: 7.0 },
  { id: 'swimming_laps', name: 'Lap Swimming', category: 'distance', met: 8.0 },

  // Reps & Sets-Based
  { id: 'pushups', name: 'Push-ups', category: 'reps', met: 3.8, default_sets: 3, default_reps: 15 },
  { id: 'pullups', name: 'Pull-ups / Chin-ups', category: 'reps', met: 8.0, default_sets: 3, default_reps: 8 },
  { id: 'squats_bodyweight', name: 'Bodyweight Squats', category: 'reps', met: 5.0, default_sets: 3, default_reps: 20 },
  { id: 'squats_barbell', name: 'Barbell Squats', category: 'reps', met: 6.0, default_sets: 4, default_reps: 10 },
  { id: 'bench_press', name: 'Bench Press', category: 'reps', met: 5.5, default_sets: 4, default_reps: 10 },
  { id: 'deadlift', name: 'Deadlift', category: 'reps', met: 6.0, default_sets: 4, default_reps: 8 },
  { id: 'leg_press', name: 'Leg Press', category: 'reps', met: 4.5, default_sets: 4, default_reps: 12 },
  { id: 'lunges', name: 'Walking Lunges', category: 'reps', met: 4.5, default_sets: 3, default_reps: 16 },
  { id: 'dips', name: 'Tricep Dips', category: 'reps', met: 4.0, default_sets: 3, default_reps: 12 },
  { id: 'crunches', name: 'Abdominal Crunches / Sit-ups', category: 'reps', met: 3.5, default_sets: 3, default_reps: 25 },
  { id: 'leg_raises', name: 'Hanging Leg Raises', category: 'reps', met: 4.5, default_sets: 3, default_reps: 12 },
  { id: 'russian_twists', name: 'Russian Twists', category: 'reps', met: 4.0, default_sets: 3, default_reps: 20 },
  { id: 'mountain_climbers', name: 'Mountain Climbers', category: 'reps', met: 8.0, default_sets: 3, default_reps: 30 },
  { id: 'calf_raises', name: 'Calf Raises', category: 'reps', met: 3.5, default_sets: 3, default_reps: 20 },
  { id: 'burpees', name: 'Burpees', category: 'reps', met: 8.0, default_sets: 3, default_reps: 12 },
  { id: 'bicep_curls', name: 'Dumbbell Bicep Curls', category: 'reps', met: 3.5, default_sets: 3, default_reps: 12 },
  { id: 'shoulder_press', name: 'Overhead Shoulder Press', category: 'reps', met: 4.5, default_sets: 3, default_reps: 10 },
  { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', category: 'reps', met: 5.5, default_sets: 3, default_reps: 10 },
  { id: 'leg_extension', name: 'Leg Extension', category: 'reps', met: 4.0, default_sets: 3, default_reps: 12 },
  { id: 'leg_curl', name: 'Leg Curl', category: 'reps', met: 4.0, default_sets: 3, default_reps: 12 },
  { id: 'standing_calf_raise', name: 'Standing Calf Raise', category: 'reps', met: 3.5, default_sets: 3, default_reps: 15 },
  { id: 'seated_calf_raise', name: 'Seated Calf Raise', category: 'reps', met: 3.2, default_sets: 3, default_reps: 15 },
  { id: 'chest_fly', name: 'Chest Fly', category: 'reps', met: 4.0, default_sets: 3, default_reps: 12 },
  { id: 'lat_pulldown', name: 'Lat Pull-down', category: 'reps', met: 4.5, default_sets: 3, default_reps: 12 },
  { id: 'bent_over_row', name: 'Bent-over Row', category: 'reps', met: 5.0, default_sets: 3, default_reps: 10 },
  { id: 'upright_row', name: 'Upright Row', category: 'reps', met: 4.5, default_sets: 3, default_reps: 10 },
  { id: 'lateral_raise', name: 'Lateral Raise', category: 'reps', met: 3.5, default_sets: 3, default_reps: 15 },
  { id: 'shoulder_shrug', name: 'Shoulder Shrug', category: 'reps', met: 3.5, default_sets: 3, default_reps: 15 },
  { id: 'tricep_pushdown', name: 'Triceps Push-down', category: 'reps', met: 4.0, default_sets: 3, default_reps: 12 },
  { id: 'lying_triceps_extension', name: 'Lying Triceps Extension (Skullcrusher)', category: 'reps', met: 4.2, default_sets: 3, default_reps: 10 },
  { id: 'overhead_triceps_extension', name: 'Overhead Triceps Extension', category: 'reps', met: 4.0, default_sets: 3, default_reps: 12 },
  { id: 'hammer_curl', name: 'Hammer Curl', category: 'reps', met: 3.5, default_sets: 3, default_reps: 12 },
  { id: 'back_extension', name: 'Back Extension', category: 'reps', met: 4.0, default_sets: 3, default_reps: 12 },

  // Time & Intensity-Based
  { id: 'football', name: 'Football', category: 'time', default_duration_min: 60.0 },
  { id: 'cricket', name: 'Cricket', category: 'time', default_duration_min: 90.0 },
  { id: 'padel', name: 'Padel', category: 'time', default_duration_min: 60.0 },
  { id: 'yoga', name: 'Yoga', category: 'time', default_duration_min: 45.0 },
  { id: 'basketball', name: 'Basketball', category: 'time', default_duration_min: 60.0 },
  { id: 'tennis', name: 'Tennis', category: 'time', default_duration_min: 60.0 },
  { id: 'rock_climbing', name: 'Rock Climbing / Bouldering', category: 'time', default_duration_min: 45.0 },
  { id: 'plank_hold', name: 'Plank Isometric Hold', category: 'time', default_duration_min: 3.0 },
];

export class LoggingManager {
  static init() {
    if (this.initialized) return;
    this.initialized = true;

    this.catalog = [...FALLBACK_EXERCISE_CATALOG];
    this.selectedFoodImageFile = null;
    this.currentDetailMeal = null;
    this.isSubmittingWorkout = false;
    this.isSubmittingManualWorkout = false;
    this.bindAIFoodForm();
    this.bindAIFoodImageScanner();
    this.bindStructuredExerciseCard();
    this.renderMealDetailModal();
    this.renderManualMealModal();
    this.renderManualExerciseModal();
    this.bindManualEvents();
    this.bindEditEvent();
    this.loadExerciseCatalog();
  }

  static async loadExerciseCatalog() {
    try {
      const fetched = await APIClient.request(ENDPOINTS.EXERCISES_CATALOG);
      if (Array.isArray(fetched) && fetched.length > 0) {
        const mergedMap = new Map();
        FALLBACK_EXERCISE_CATALOG.forEach(item => mergedMap.set(item.id, item));
        fetched.forEach(item => mergedMap.set(item.id, item));
        this.catalog = Array.from(mergedMap.values());
      }
    } catch (err) {
      console.warn('Using fallback exercise catalog:', err);
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
        btn.textContent = '✨ Analyzing...';
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
          window.dispatchEvent(new CustomEvent('meal:logged'));
          await DashboardManager.fetchAndRenderData();
          if (App && typeof App.fetchAndRenderFoodTab === 'function') {
            App.fetchAndRenderFoodTab();
          }
        } catch (err) {
          statusBox.style.color = '#EF4444';
          statusBox.textContent = `Error: ${err.message}`;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Log Meal';
        }
      }
    });
  }

  static bindAIFoodImageScanner() {
    // 1. Toggle Mode Buttons (Photo Upload vs Text Description)
    document.addEventListener('click', (e) => {
      const btnImage = e.target.closest('#tab-btn-scan-image');
      const btnText = e.target.closest('#tab-btn-scan-text');

      if (btnImage) {
        document.getElementById('ai-food-image-section').style.display = 'block';
        document.getElementById('ai-food-text-section').style.display = 'none';
        btnImage.style.background = 'var(--accent-health)';
        btnImage.style.color = '#000';
        btnImage.style.fontWeight = '700';
        const tBtn = document.getElementById('tab-btn-scan-text');
        if (tBtn) {
          tBtn.style.background = 'rgba(255,255,255,0.08)';
          tBtn.style.color = 'var(--text-secondary)';
          tBtn.style.fontWeight = 'normal';
        }
      }

      if (btnText) {
        document.getElementById('ai-food-image-section').style.display = 'none';
        document.getElementById('ai-food-text-section').style.display = 'block';
        btnText.style.background = 'var(--accent-health)';
        btnText.style.color = '#000';
        btnText.style.fontWeight = '700';
        const iBtn = document.getElementById('tab-btn-scan-image');
        if (iBtn) {
          iBtn.style.background = 'rgba(255,255,255,0.08)';
          iBtn.style.color = 'var(--text-secondary)';
          iBtn.style.fontWeight = 'normal';
        }
      }

      // Dropzone click trigger
      const dropzone = e.target.closest('#image-dropzone');
      const removeBtn = e.target.closest('#btn-remove-image');

      if (dropzone && !removeBtn) {
        const fileInput = document.getElementById('ai-food-image-input');
        if (fileInput && e.target !== fileInput) {
          fileInput.click();
        }
      }

      // Remove Image button
      if (removeBtn) {
        e.stopPropagation();
        this.clearSelectedImage();
      }
    });

    // 2. Drag & Drop Handlers
    document.addEventListener('dragover', (e) => {
      const dropzone = e.target.closest('#image-dropzone');
      if (dropzone) {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-health)';
        dropzone.style.background = 'rgba(16,185,129,0.12)';
      }
    });

    document.addEventListener('dragleave', (e) => {
      const dropzone = e.target.closest('#image-dropzone');
      if (dropzone) {
        dropzone.style.borderColor = 'rgba(16,185,129,0.4)';
        dropzone.style.background = 'rgba(0,0,0,0.25)';
      }
    });

    document.addEventListener('drop', (e) => {
      const dropzone = e.target.closest('#image-dropzone');
      if (dropzone) {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(16,185,129,0.4)';
        dropzone.style.background = 'rgba(0,0,0,0.25)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      }
    });

    // 3. File Input Change Handler
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'ai-food-image-input') {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelected(e.target.files[0]);
        }
      }
    });

    // 4. Image Scanner Form Submission
    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'ai-food-image-form') {
        e.preventDefault();
        if (!this.selectedFoodImageFile) return;

        const submitBtn = document.getElementById('ai-food-image-btn');
        const statusBox = document.getElementById('ai-food-image-status');
        const hintVal = document.getElementById('ai-food-meal-hint')?.value || '';

        submitBtn.disabled = true;
        submitBtn.textContent = '✨ Scanning with Gemini Vision...';
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(16,185,129,0.1)';
        statusBox.style.borderColor = 'rgba(16,185,129,0.3)';
        statusBox.style.color = 'var(--text-primary)';
        statusBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.2rem; animation: spin 1s infinite linear;">⚡</span>
            <div>
              <div style="font-weight: 700; color: var(--accent-health);">Analyzing Food Image with Gemini AI...</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Extracting calories, macronutrients (P/C/F) & essential micronutrients...</div>
            </div>
          </div>
        `;

        try {
          const formData = new FormData();
          formData.append('file', this.selectedFoodImageFile);
          if (hintVal) {
            formData.append('meal_type_hint', hintVal);
          }
          const notesVal = document.getElementById('ai-food-image-notes')?.value?.trim();
          if (notesVal) {
            formData.append('notes', notesVal);
          }

          const result = await APIClient.request(ENDPOINTS.MEALS_AI_SCAN_IMAGE, {
            method: 'POST',
            body: formData,
          });

          const descLower = (result.description || '').toLowerCase();
          if (result.calories === 0 || descLower.includes('no food') || descLower.includes('not food') || descLower.includes('non-food')) {
            statusBox.style.background = 'rgba(239,68,68,0.15)';
            statusBox.style.borderColor = 'rgba(239,68,68,0.3)';
            statusBox.style.color = '#EF4444';
            statusBox.innerHTML = `
              <div style="font-weight: 700; font-size: 0.9rem;">⚠️ No Edible Food Detected</div>
              <div style="font-size: 0.82rem; margin-top: 0.25rem; color: #FCA5A5;">"${result.description}"</div>
            `;
            return;
          }

          statusBox.style.background = 'rgba(16,185,129,0.15)';
          statusBox.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; font-size: 0.95rem; color: var(--accent-health);">✅ Meal Successfully Scanned & Logged!</span>
                <span style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">${result.calories} kcal</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">"${result.description}"</div>
              <div style="display: flex; gap: 0.85rem; font-size: 0.75rem; color: var(--text-secondary); flex-wrap: wrap; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.4rem; margin-top: 0.2rem;">
                <span>🥩 P: <b>${result.protein_g}g</b></span>
                <span>🍞 C: <b>${result.carbs_g}g</b></span>
                <span>🥑 F: <b>${result.fat_g}g</b></span>
                <span>🌾 Fiber: <b>${result.fiber_g || 0}g</b></span>
                <span>🧂 Sodium: <b>${result.sodium_mg || 0}mg</b></span>
                <span>🍌 Potassium: <b>${result.potassium_mg || 0}mg</b></span>
              </div>
            </div>
          `;

          this.clearSelectedImage();
          window.dispatchEvent(new CustomEvent('meal:logged'));
          await DashboardManager.fetchAndRenderData();
          if (App && typeof App.fetchAndRenderFoodTab === 'function') {
            App.fetchAndRenderFoodTab();
          }
        } catch (err) {
          statusBox.style.background = 'rgba(239,68,68,0.1)';
          statusBox.style.borderColor = 'rgba(239,68,68,0.3)';
          statusBox.style.color = '#EF4444';
          statusBox.innerHTML = `<b>Scan Error:</b> ${err.message}`;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '✨ Scan & Log Meal Image';
        }
      }
    });
  }

  static handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    this.selectedFoodImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.getElementById('image-preview-img');
      const previewContainer = document.getElementById('image-preview-container');
      const promptBox = document.getElementById('dropzone-prompt');
      const previewName = document.getElementById('image-preview-name');
      const submitBtn = document.getElementById('ai-food-image-btn');

      if (previewImg) previewImg.src = e.target.result;
      if (previewName) previewName.textContent = `📷 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      if (previewContainer) previewContainer.style.display = 'block';
      if (promptBox) promptBox.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  static clearSelectedImage() {
    this.selectedFoodImageFile = null;
    const fileInput = document.getElementById('ai-food-image-input');
    const previewContainer = document.getElementById('image-preview-container');
    const promptBox = document.getElementById('dropzone-prompt');
    const submitBtn = document.getElementById('ai-food-image-btn');

    if (fileInput) fileInput.value = '';
    const notesInput = document.getElementById('ai-food-image-notes');
    if (notesInput) notesInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (promptBox) promptBox.style.display = 'flex';
    if (submitBtn) submitBtn.disabled = true;
  }


  static bindStructuredExerciseCard() {
    let selectedMuscleFilter = 'all';

    const muscleGroupMap = {
      legs: ['squats_bodyweight', 'squats_barbell', 'bulgarian_split_squat', 'leg_press', 'lunges', 'deadlift', 'leg_extension', 'leg_curl', 'standing_calf_raise', 'seated_calf_raise', 'calf_raises'],
      chest: ['bench_press', 'chest_fly', 'pushups', 'dips'],
      back: ['lat_pulldown', 'pullups', 'bent_over_row', 'upright_row', 'shoulder_shrug', 'back_extension'],
      shoulders: ['shoulder_press', 'lateral_raise'],
      arms: ['bicep_curls', 'hammer_curl', 'tricep_pushdown', 'lying_triceps_extension', 'overhead_triceps_extension'],
      core: ['crunches', 'russian_twists', 'leg_raises', 'mountain_climbers', 'burpees'],
    };

    const populateItemOptions = (cat, filterQuery = '') => {
      const optionsList = document.getElementById('dash-ex-options-list');
      const itemSelect = document.getElementById('dash-ex-item-select');
      const musclePillsContainer = document.getElementById('dash-ex-muscle-pills');
      if (!optionsList || !itemSelect) return;

      if (musclePillsContainer) {
        musclePillsContainer.style.display = cat === 'reps' ? 'flex' : 'none';
      }

      const q = filterQuery.toLowerCase().trim();
      let filtered = (this.catalog || []).filter(x => x.category === cat);

      if (cat === 'reps' && selectedMuscleFilter !== 'all') {
        const allowedIds = muscleGroupMap[selectedMuscleFilter] || [];
        filtered = filtered.filter(x => allowedIds.includes(x.id));
      }

      if (q) {
        filtered = filtered.filter(x => x.name.toLowerCase().includes(q));
      }
      filtered.sort((a, b) => a.name.localeCompare(b.name));

      // Keep hidden select options up to date for form handling
      itemSelect.innerHTML = `<option value="">Select Exercise...</option>` +
        (this.catalog || []).map(x => `<option value="${x.id}">${x.name}</option>`).join('');

      if (filtered.length === 0) {
        optionsList.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.75rem; text-align: center;">No exercises found matching filter.</div>`;
        return;
      }

      const selectedId = itemSelect.value;
      optionsList.innerHTML = filtered.map(x => {
        const isSelected = x.id === selectedId;
        return `
          <button type="button" class="ex-option-item-btn" data-id="${x.id}" style="text-align: left; background: ${isSelected ? 'var(--accent-workout)' : 'rgba(255,255,255,0.04)'}; color: ${isSelected ? '#fff' : 'var(--text-primary)'}; border: 1px solid ${isSelected ? 'var(--accent-workout)' : 'var(--border-glass)'}; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.82rem; font-weight: ${isSelected ? '700' : '500'}; cursor: pointer; transition: all 0.15s ease; display: flex; justify-content: space-between; align-items: center;">
            <span>⚡ ${x.name}</span>
            ${isSelected ? '<span style="font-size: 0.75rem;">✓ Selected</span>' : ''}
          </button>
        `;
      }).join('');

      // Add click listener to options
      optionsList.querySelectorAll('.ex-option-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const exId = btn.getAttribute('data-id');
          itemSelect.value = exId;
          populateItemOptions(cat, filterQuery);
          itemSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    };

    document.addEventListener('click', (e) => {
      const pillBtn = e.target.closest('.muscle-pill-btn');
      if (pillBtn) {
        document.querySelectorAll('.muscle-pill-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'rgba(255,255,255,0.05)';
          b.style.borderColor = 'var(--border-glass)';
          b.style.color = 'var(--text-secondary)';
          b.style.fontWeight = '600';
        });
        pillBtn.classList.add('active');
        pillBtn.style.background = 'var(--accent-workout)';
        pillBtn.style.borderColor = 'var(--accent-workout)';
        pillBtn.style.color = '#fff';
        pillBtn.style.fontWeight = '700';

        selectedMuscleFilter = pillBtn.getAttribute('data-muscle') || 'all';
        const cat = document.getElementById('dash-ex-cat-select')?.value;
        const searchInput = document.getElementById('dash-ex-search-input');
        if (cat) {
          populateItemOptions(cat, searchInput?.value || '');
        }
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'dash-ex-search-input') {
        const cat = document.getElementById('dash-ex-cat-select')?.value;
        if (cat) {
          populateItemOptions(cat, e.target.value);
        }
      }
    });

    document.addEventListener('change', (e) => {
      // Step 1: Category Changed
      if (e.target && e.target.id === 'dash-ex-cat-select') {
        const cat = e.target.value;
        const searchWrapper = document.getElementById('dash-ex-search-wrapper');
        const searchInput = document.getElementById('dash-ex-search-input');
        const dynamicFields = document.getElementById('dash-ex-dynamic-fields');
        const submitBtn = document.getElementById('dash-ex-btn');

        if (!cat) {
          if (searchWrapper) searchWrapper.style.display = 'none';
          dynamicFields.style.display = 'none';
          submitBtn.style.display = 'none';
          return;
        }

        if (searchInput) searchInput.value = '';
        const itemSelect = document.getElementById('dash-ex-item-select');
        if (itemSelect) itemSelect.value = '';

        populateItemOptions(cat, '');

        if (searchWrapper) searchWrapper.style.display = 'block';
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
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Sets</label>
                <input type="number" id="dash-reps-sets" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" value="${item.default_sets || 3}" required />
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Reps / Set</label>
                <input type="number" id="dash-reps-count" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" value="${item.default_reps || 15}" required />
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary);">Added Weight (kg)</label>
                <input type="number" step="0.5" min="0" id="dash-reps-weight" class="form-input" style="padding: 0.4rem; font-size: 0.85rem;" value="0" placeholder="+kg" />
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
        if (this.isSubmittingWorkout) return;
        this.isSubmittingWorkout = true;

        const exId = document.getElementById('dash-ex-item-select')?.value;
        const btn = document.getElementById('dash-ex-btn');
        const statusBox = document.getElementById('dash-ex-status');

        if (!exId) {
          this.isSubmittingWorkout = false;
          return;
        }

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
          additional_weight_kg: parseFloat(document.getElementById('dash-reps-weight')?.value) || 0.0,
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
          window.dispatchEvent(new CustomEvent('exercise:logged'));
        } catch (err) {
          statusBox.style.color = '#EF4444';
          statusBox.textContent = `Error: ${err.message}`;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Calculate & Log Workout';
          this.isSubmittingWorkout = false;
        }
      }
    });

  }

  static renderMealDetailModal() {
    if (document.getElementById('meal-detail-modal')) return;

    const modalHTML = `
      <div id="meal-detail-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 520px; border: 1px solid var(--border-glass-glow); background: rgba(13, 17, 23, 0.95); backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 16px;">
          
          <div class="modal-header" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span id="detail-meal-type-icon" style="font-size: 1.3rem;">🥗</span>
                <h2 id="detail-meal-title" style="margin: 0; font-size: 1.2rem; font-family: var(--font-heading); text-transform: capitalize; color: var(--accent-health);">
                  Meal Details
                </h2>
              </div>
              <div id="detail-meal-subtitle" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;"></div>
            </div>
            <button class="close-btn" id="close-meal-detail-modal" style="background: transparent; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; padding: 0 0.5rem;">&times;</button>
          </div>

          <div style="padding-top: 1rem; display: flex; flex-direction: column; gap: 1.2rem;">
            
            <!-- Energy & Input Badge Header -->
            <div style="background: linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(22,27,34,0.8) 100%); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Total Caloric Energy</div>
                <div id="detail-meal-cals" style="font-size: 1.8rem; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading); line-height: 1.1; margin-top: 0.2rem;">
                  0 kcal
                </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
                <div id="detail-meal-badge" style="background: rgba(16,185,129,0.2); color: var(--accent-health); font-size: 0.75rem; padding: 0.25rem 0.65rem; border-radius: 20px; font-weight: 700;">
                  📷 Gemini Vision AI
                </div>
                <div id="detail-meal-time" style="font-size: 0.75rem; color: var(--text-muted);">
                  Logged today
                </div>
              </div>
            </div>

            <!-- Macronutrient Split -->
            <div>
              <h4 style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">
                Macronutrient Breakdown
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
                
                <div style="background: rgba(22,27,34,0.7); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.75rem; text-align: center;">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">🥩 Protein</div>
                  <div id="detail-protein-val" style="font-size: 1.1rem; font-weight: 800; color: #60A5FA; margin-top: 0.2rem;">0g</div>
                  <div id="detail-protein-cals" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.15rem;">0 kcal</div>
                </div>

                <div style="background: rgba(22,27,34,0.7); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.75rem; text-align: center;">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">🍞 Carbs</div>
                  <div id="detail-carbs-val" style="font-size: 1.1rem; font-weight: 800; color: #FBBF24; margin-top: 0.2rem;">0g</div>
                  <div id="detail-carbs-cals" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.15rem;">0 kcal</div>
                </div>

                <div style="background: rgba(22,27,34,0.7); border: 1px solid var(--border-glass); border-radius: 10px; padding: 0.75rem; text-align: center;">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">🥑 Fat</div>
                  <div id="detail-fat-val" style="font-size: 1.1rem; font-weight: 800; color: #F87171; margin-top: 0.2rem;">0g</div>
                  <div id="detail-fat-cals" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.15rem;">0 kcal</div>
                </div>

              </div>
            </div>

            <!-- Micronutrient Profile -->
            <div>
              <h4 style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">
                Essential Micronutrient Intelligence
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                
                <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.8rem; color: #34D399; font-weight: 600;">🌾 Fiber</span>
                  <span id="detail-fiber-val" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">0g</span>
                </div>

                <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.8rem; color: #FBBF24; font-weight: 600;">🧂 Sodium</span>
                  <span id="detail-sodium-val" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">0mg</span>
                </div>

                <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.8rem; color: #60A5FA; font-weight: 600;">🍌 Potassium</span>
                  <span id="detail-potassium-val" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">0mg</span>
                </div>

                <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.8rem; color: #F472B6; font-weight: 600;">🍊 Vitamin C</span>
                  <span id="detail-vitc-val" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">0mg</span>
                </div>

                <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.8rem; color: #E5E7EB; font-weight: 600;">🥛 Calcium</span>
                  <span id="detail-calcium-val" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">0mg</span>
                </div>

                <div style="background: rgba(22,27,34,0.6); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.8rem; color: #C084FC; font-weight: 600;">🥩 Iron</span>
                  <span id="detail-iron-val" style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">0mg</span>
                </div>

              </div>
            </div>

          </div>

          <!-- Modal Action Footer -->
          <div style="margin-top: 1.2rem; border-top: 1px solid var(--border-glass); padding-top: 0.85rem; display: flex; justify-content: space-between; align-items: center; position: relative;">
            
            <div style="position: relative;">
              <button id="btn-delete-detail-meal" class="btn" style="background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 600;">
                🗑️ Delete Meal
              </button>

              <!-- Inline Delete Confirm Popover -->
              <div id="detail-delete-popover" style="display: none; position: absolute; left: 0; bottom: 125%; background: #161B22; border: 1px solid rgba(239,68,68,0.4); border-radius: 10px; padding: 0.6rem 0.75rem; width: 175px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); z-index: 100; flex-direction: column; gap: 0.45rem; text-align: center;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #EF4444;">Delete this meal?</div>
                <div style="display: flex; gap: 0.4rem; justify-content: center;">
                  <button id="btn-cancel-detail-delete" style="background: rgba(255,255,255,0.08); color: var(--text-secondary); border: none; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">Cancel</button>
                  <button id="btn-confirm-detail-delete" style="background: #EF4444; color: white; border: none; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Delete</button>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 0.6rem;">
              <button id="btn-edit-detail-meal" class="btn" style="background: rgba(255,255,255,0.08); color: var(--text-primary); padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 600;">
                ✏️ Edit Entry
              </button>
              <button id="btn-close-detail-modal-action" class="btn btn-primary" style="padding: 0.45rem 1.1rem; font-size: 0.8rem; font-weight: 700;">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event Listeners for closing, editing, deleting detail modal
    document.addEventListener('click', async (e) => {
      const modal = document.getElementById('meal-detail-modal');
      if (!modal || !modal.classList.contains('active')) return;

      const popover = document.getElementById('detail-delete-popover');

      if (e.target && (e.target.id === 'close-meal-detail-modal' || e.target.id === 'btn-close-detail-modal-action' || e.target === modal)) {
        if (popover) popover.style.display = 'none';
        modal.classList.remove('active');
      }

      if (e.target && e.target.id === 'btn-edit-detail-meal') {
        const meal = this.currentDetailMeal;
        if (popover) popover.style.display = 'none';
        modal.classList.remove('active');
        if (meal) {
          this.openEditMealModal(meal);
        }
      }

      if (e.target && e.target.id === 'btn-delete-detail-meal') {
        e.stopPropagation();
        if (popover) {
          popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
        }
      }

      if (e.target && e.target.id === 'btn-cancel-detail-delete') {
        e.stopPropagation();
        if (popover) popover.style.display = 'none';
      }

      if (e.target && e.target.id === 'btn-confirm-detail-delete') {
        e.stopPropagation();
        const meal = this.currentDetailMeal;
        if (popover) popover.style.display = 'none';

        if (meal) {
          try {
            await APIClient.request(`${ENDPOINTS.MEALS}/${meal.id}`, { method: 'DELETE' });
            modal.classList.remove('active');
            window.dispatchEvent(new CustomEvent('meal:logged'));
            await DashboardManager.fetchAndRenderData();
            if (App && typeof App.fetchAndRenderFoodTab === 'function') {
              App.fetchAndRenderFoodTab();
            }
          } catch (err) {
            alert(`Failed to delete meal: ${err.message}`);
          }
        }
      }
    });
  }


  static openMealDetailModal(meal) {
    if (!meal) return;
    this.currentDetailMeal = meal;

    this.renderMealDetailModal();

    const icons = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🥩',
      snack: '🍎',
    };

    const inputBadges = {
      ai_vision: '📷 Gemini 2.5 Vision AI',
      ai_nlp: '💬 Gemini Text AI',
      manual: '📝 Manual Entry',
    };

    const iconEl = document.getElementById('detail-meal-type-icon');
    if (iconEl) iconEl.textContent = icons[meal.meal_type?.toLowerCase()] || '🥗';
    
    const titleEl = document.getElementById('detail-meal-title');
    if (titleEl) titleEl.textContent = `${meal.meal_type} — ${meal.description}`;
    
    const timeStr = meal.logged_at ? new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
    const qtyStr = meal.quantity_g ? ` • ${meal.quantity_g}g portion` : '';
    const subtitleEl = document.getElementById('detail-meal-subtitle');
    if (subtitleEl) subtitleEl.textContent = `Logged ${timeStr}${qtyStr}`;

    const calsEl = document.getElementById('detail-meal-cals');
    if (calsEl) calsEl.textContent = `${meal.calories} kcal`;

    const badgeEl = document.getElementById('detail-meal-badge');
    if (badgeEl) badgeEl.textContent = inputBadges[meal.input_method] || '📝 Manual Entry';

    // Macronutrient breakdown
    const pVal = document.getElementById('detail-protein-val');
    if (pVal) pVal.textContent = `${meal.protein_g}g`;
    const pCals = document.getElementById('detail-protein-cals');
    if (pCals) pCals.textContent = `${Math.round(meal.protein_g * 4)} kcal`;

    const cVal = document.getElementById('detail-carbs-val');
    if (cVal) cVal.textContent = `${meal.carbs_g}g`;
    const cCals = document.getElementById('detail-carbs-cals');
    if (cCals) cCals.textContent = `${Math.round(meal.carbs_g * 4)} kcal`;

    const fVal = document.getElementById('detail-fat-val');
    if (fVal) fVal.textContent = `${meal.fat_g}g`;
    const fCals = document.getElementById('detail-fat-cals');
    if (fCals) fCals.textContent = `${Math.round(meal.fat_g * 9)} kcal`;

    // Micronutrient profile
    const fibVal = document.getElementById('detail-fiber-val');
    if (fibVal) fibVal.textContent = `${meal.fiber_g || 0}g`;
    const sodVal = document.getElementById('detail-sodium-val');
    if (sodVal) sodVal.textContent = `${meal.sodium_mg || 0}mg`;
    const potVal = document.getElementById('detail-potassium-val');
    if (potVal) potVal.textContent = `${meal.potassium_mg || 0}mg`;
    const vitVal = document.getElementById('detail-vitc-val');
    if (vitVal) vitVal.textContent = `${meal.vitamin_c_mg || 0}mg`;
    const calcVal = document.getElementById('detail-calcium-val');
    if (calcVal) calcVal.textContent = `${meal.calcium_mg || 0}mg`;
    const ironVal = document.getElementById('detail-iron-val');
    if (ironVal) ironVal.textContent = `${meal.iron_mg || 0}mg`;

    const modal = document.getElementById('meal-detail-modal');
    if (modal) modal.classList.add('active');
  }

  static openEditMealModal(meal) {
    document.getElementById('meal-modal-title').textContent = 'Edit Logged Meal';
    document.getElementById('m-meal-type').value = meal.meal_type;
    document.getElementById('m-meal-desc').value = meal.description;
    document.getElementById('m-meal-cals').value = meal.calories;
    document.getElementById('m-meal-protein').value = meal.protein_g;
    document.getElementById('m-meal-carbs').value = meal.carbs_g;
    document.getElementById('m-meal-fat').value = meal.fat_g;
    document.getElementById('m-meal-fiber').value = meal.fiber_g || '';
    document.getElementById('m-meal-sodium').value = meal.sodium_mg || '';
    document.getElementById('m-meal-potassium').value = meal.potassium_mg || '';
    document.getElementById('m-meal-vitc').value = meal.vitamin_c_mg || '';
    document.getElementById('m-meal-calcium').value = meal.calcium_mg || '';
    document.getElementById('m-meal-iron').value = meal.iron_mg || '';

    const form = document.getElementById('manual-meal-form');
    form.setAttribute('data-editing-id', meal.id);
    document.getElementById('manual-meal-modal').classList.add('active');
  }

  static renderManualMealModal() {
    const modalHTML = `
      <div id="manual-meal-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="meal-modal-title">Log Meal</h2>
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

            <!-- Optional Micronutrient Fields (Left blank = Auto AI enriched) -->
            <details style="margin-top: 1rem; background: rgba(22,27,34,0.7); border: 1px solid var(--border-glass-glow); padding: 0.85rem; border-radius: 10px;">
              <summary style="font-size: 0.85rem; font-weight: 700; color: var(--accent-health); cursor: pointer; display: flex; align-items: center; gap: 0.5rem; user-select: none;">
                <span>🧪 Optional: Enter Micronutrients Manually</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: auto;">(Click to expand)</span>
              </summary>
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; margin-bottom: 0.75rem;">
                Leave blank to automatically let Gemini AI calculate micronutrients from your food description.
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Fiber (g)</label>
                  <input type="number" step="0.1" id="m-meal-fiber" class="form-input" style="padding: 0.35rem; font-size: 0.8rem;" placeholder="Auto AI" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Sodium (mg)</label>
                  <input type="number" step="0.1" id="m-meal-sodium" class="form-input" style="padding: 0.35rem; font-size: 0.8rem;" placeholder="Auto AI" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Potassium (mg)</label>
                  <input type="number" step="0.1" id="m-meal-potassium" class="form-input" style="padding: 0.35rem; font-size: 0.8rem;" placeholder="Auto AI" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Vitamin C (mg)</label>
                  <input type="number" step="0.1" id="m-meal-vitc" class="form-input" style="padding: 0.35rem; font-size: 0.8rem;" placeholder="Auto AI" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Calcium (mg)</label>
                  <input type="number" step="0.1" id="m-meal-calcium" class="form-input" style="padding: 0.35rem; font-size: 0.8rem;" placeholder="Auto AI" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.7rem;">Iron (mg)</label>
                  <input type="number" step="0.1" id="m-meal-iron" class="form-input" style="padding: 0.35rem; font-size: 0.8rem;" placeholder="Auto AI" />
                </div>
              </div>
            </details>

            <button type="submit" id="m-meal-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Save Meal</button>
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
            <h2 id="ex-modal-title">Log Workout</h2>
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
                <label class="form-label">Calories Burned (kcal)</label>
                <input type="number" id="m-ex-cals" class="form-input" placeholder="350" required />
              </div>
            </div>
            <button type="submit" id="m-ex-submit-btn" class="btn btn-cobalt" style="width: 100%; margin-top: 1rem;">Save Workout</button>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static bindEditEvent() {
    window.addEventListener('activity:edit', (e) => {
      const { id, type, meals, workouts } = e.detail;

      if (type === 'meal') {
        const meal = (meals || []).find(m => m.id === id);
        if (!meal) return;

        document.getElementById('meal-modal-title').textContent = 'Edit Logged Meal';
        document.getElementById('m-meal-type').value = meal.meal_type.toLowerCase();
        document.getElementById('m-meal-desc').value = meal.description;
        document.getElementById('m-meal-cals').value = meal.calories;
        document.getElementById('m-meal-protein').value = meal.protein_g;
        document.getElementById('m-meal-carbs').value = meal.carbs_g;
        document.getElementById('m-meal-fat').value = meal.fat_g;
        document.getElementById('m-meal-fiber').value = meal.fiber_g || '';
        document.getElementById('m-meal-sodium').value = meal.sodium_mg || '';
        document.getElementById('m-meal-potassium').value = meal.potassium_mg || '';
        document.getElementById('m-meal-vitc').value = meal.vitamin_c_mg || '';
        document.getElementById('m-meal-calcium').value = meal.calcium_mg || '';
        document.getElementById('m-meal-iron').value = meal.iron_mg || '';

        const form = document.getElementById('manual-meal-form');
        form.setAttribute('data-editing-id', id);
        document.getElementById('manual-meal-modal').classList.add('active');
      }

      if (type === 'workout') {
        const workout = (workouts || []).find(w => w.id === id);
        if (!workout) return;

        document.getElementById('ex-modal-title').textContent = 'Edit Logged Workout';
        document.getElementById('m-ex-name').value = workout.exercise_name;
        document.getElementById('m-ex-dur').value = workout.duration_minutes;
        document.getElementById('m-ex-cals').value = workout.calories_burned || '';

        const form = document.getElementById('manual-exercise-form');
        form.setAttribute('data-editing-id', id);
        document.getElementById('manual-exercise-modal').classList.add('active');
      }
    });
  }

  static bindManualEvents() {
    // Automatically scroll to Save Meal button when optional micronutrients details expand
    document.addEventListener('toggle', (e) => {
      if (e.target && e.target.tagName === 'DETAILS' && e.target.open) {
        const submitBtn = document.getElementById('m-meal-submit-btn');
        if (submitBtn) {
          setTimeout(() => {
            submitBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 120);
        }
      }
    }, true);

    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'btn-manual-meal') {
        const form = document.getElementById('manual-meal-form');
        form.removeAttribute('data-editing-id');
        form.reset();
        document.getElementById('meal-modal-title').textContent = 'Log Manual Meal';
        document.getElementById('manual-meal-modal').classList.add('active');
      }
      if (e.target && e.target.id === 'close-meal-modal') {
        document.getElementById('manual-meal-modal').classList.remove('active');
      }
      if (e.target && e.target.id === 'btn-manual-exercise') {
        const form = document.getElementById('manual-exercise-form');
        form.removeAttribute('data-editing-id');
        form.reset();
        document.getElementById('ex-modal-title').textContent = 'Log Manual Workout';
        document.getElementById('manual-exercise-modal').classList.remove('active');
        document.getElementById('manual-exercise-modal').classList.add('active');
      }
      if (e.target && e.target.id === 'close-exercise-modal') {
        document.getElementById('manual-exercise-modal').classList.remove('active');
      }
    });


    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'manual-meal-form') {
        e.preventDefault();
        const submitBtn = document.getElementById('m-meal-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '⏳ Saving Meal & Enriched Micros...';
        }

        try {
          const editingId = e.target.getAttribute('data-editing-id');
          const payload = {
            meal_type: document.getElementById('m-meal-type').value,
            description: document.getElementById('m-meal-desc').value,
            calories: parseInt(document.getElementById('m-meal-cals').value, 10),
            protein_g: parseFloat(document.getElementById('m-meal-protein').value),
            carbs_g: parseFloat(document.getElementById('m-meal-carbs').value),
            fat_g: parseFloat(document.getElementById('m-meal-fat').value),
            fiber_g: parseFloat(document.getElementById('m-meal-fiber')?.value || 0),
            sodium_mg: parseFloat(document.getElementById('m-meal-sodium')?.value || 0),
            potassium_mg: parseFloat(document.getElementById('m-meal-potassium')?.value || 0),
            vitamin_c_mg: parseFloat(document.getElementById('m-meal-vitc')?.value || 0),
            calcium_mg: parseFloat(document.getElementById('m-meal-calcium')?.value || 0),
            iron_mg: parseFloat(document.getElementById('m-meal-iron')?.value || 0),
          };

          if (editingId) {
            await APIClient.request(`${ENDPOINTS.MEALS}/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
            e.target.removeAttribute('data-editing-id');
          } else {
            await APIClient.request(ENDPOINTS.MEALS, { method: 'POST', body: JSON.stringify(payload) });
          }

          document.getElementById('manual-meal-modal').classList.remove('active');
          window.dispatchEvent(new CustomEvent('meal:logged'));
          await DashboardManager.fetchAndRenderData();
        } catch (err) {
          alert(`Error saving meal: ${err.message}`);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Meal';
          }
        }
      }

      if (e.target && e.target.id === 'manual-exercise-form') {
        e.preventDefault();
        if (this.isSubmittingManualWorkout) return;
        this.isSubmittingManualWorkout = true;

        const submitBtn = document.getElementById('m-ex-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '⏳ Saving Workout...';
        }

        try {
          const editingId = e.target.getAttribute('data-editing-id');
          const payload = {
            exercise_name: document.getElementById('m-ex-name').value,
            duration_minutes: parseFloat(document.getElementById('m-ex-dur').value),
            calories_burned: parseInt(document.getElementById('m-ex-cals').value, 10),
            input_method: 'manual',
          };

          if (editingId) {
            await APIClient.request(`${ENDPOINTS.WORKOUTS_BASE}/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
            e.target.removeAttribute('data-editing-id');
          } else {
            await APIClient.request(ENDPOINTS.EXERCISES, { method: 'POST', body: JSON.stringify(payload) });
          }

          document.getElementById('manual-exercise-modal').classList.remove('active');
          window.dispatchEvent(new CustomEvent('exercise:logged'));
        } catch (err) {
          alert(`Error saving workout: ${err.message}`);
        } finally {
          this.isSubmittingManualWorkout = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Workout';
          }
        }
      }

    });
  }
}
