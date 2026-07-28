/* Analytics Manager: Goal Success Calendar, Interactive Day Details & Caloric Line Graph */
import { APIClient } from './api_client.js';
import { ENDPOINTS, API_BASE_URL } from './config.js';

export class AnalyticsManager {
  static initEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    // View Switching & Timeframe Selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('#an-view-cal')) {
        this.currentView = 'calendar';
        this.updateToggleUI();
        this.renderView();
      }
      if (e.target.closest('#an-view-graph')) {
        this.currentView = 'graph';
        this.updateToggleUI();
        this.renderView();
      }

      // Day Card Click -> Open Detail Modal
      const dayTile = e.target.closest('.analytics-day-tile');
      if (dayTile) {
        const dateStr = dayTile.getAttribute('data-date');
        if (dateStr) {
          this.showDayDetailModal(dateStr);
        }
      }

      // Close Detail Modal
      if (e.target.closest('#btn-close-day-modal') || e.target.id === 'day-detail-modal') {
        const modal = document.getElementById('day-detail-modal');
        if (modal) modal.classList.remove('active');
      }
    });

    document.addEventListener('change', async (e) => {
      const select = e.target.closest('#an-timeframe');
      if (select) {
        this.days = parseInt(select.value, 10);
        await this.fetchAndRender();
      }
    });
  }

  static async render(container) {
    if (!this.currentView) this.currentView = 'calendar';
    if (!this.days) this.days = 30;
    this.historyData = [];

    this.initEvents();
    this.ensureModalDOM();

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 1100px; margin: 0 auto;">
        
        <!-- Header & Control Bar -->
        <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-family: var(--font-heading); margin-bottom: 0.25rem;">
              📊 Health Analytics & Goal History
            </h2>
            <p class="text-muted" style="font-size: 0.85rem;">
              Click on any day card in the calendar to inspect full meal and exercise details.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <!-- View Mode Switch -->
            <div style="background: rgba(9, 12, 16, 0.7); border: 1px solid var(--border-glass); padding: 0.25rem; border-radius: 999px; display: flex;">
              <button id="an-view-cal" class="btn" style="padding: 0.4rem 0.85rem; font-size: 0.8rem; border-radius: 999px; background: ${this.currentView === 'calendar' ? 'var(--accent-health)' : 'transparent'}; color: ${this.currentView === 'calendar' ? '#000' : 'var(--text-secondary)'}; font-weight: 700;">
                📅 Calendar
              </button>
              <button id="an-view-graph" class="btn" style="padding: 0.4rem 0.85rem; font-size: 0.8rem; border-radius: 999px; background: ${this.currentView === 'graph' ? 'var(--accent-health)' : 'transparent'}; color: ${this.currentView === 'graph' ? '#000' : 'var(--text-secondary)'}; font-weight: 700;">
                📈 Line Graph
              </button>
            </div>

            <!-- Timeframe Filter -->
            <select id="an-timeframe" class="form-input" style="padding: 0.4rem 0.75rem; font-size: 0.8rem; width: auto; cursor: pointer;">
              <option value="30" ${this.days === 30 ? 'selected' : ''}>Past 30 Days (Monthly)</option>
              <option value="7" ${this.days === 7 ? 'selected' : ''}>Past 7 Days (Weekly)</option>
            </select>
          </div>
        </div>

        <!-- Dynamic Content Container -->
        <div id="analytics-content-box">
          <div class="glass-card" style="text-align: center; padding: 3rem 1rem;">
            <p class="text-muted">Loading analytics history...</p>
          </div>
        </div>

      </div>
    `;

    await this.fetchAndRender();
  }

  static ensureModalDOM() {
    if (document.getElementById('day-detail-modal')) return;

    const modalHTML = `
      <div id="day-detail-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 650px; width: 90%; max-height: 85vh; overflow-y: auto;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2 id="day-modal-title" style="font-size: 1.25rem; font-family: var(--font-heading);">
              📅 Daily Breakdown
            </h2>
            <button id="btn-close-day-modal" class="btn" style="background: transparent; border: none; font-size: 1.5rem; color: var(--text-secondary); cursor: pointer;">×</button>
          </div>

          <div id="day-modal-body" style="margin-top: 1rem;">
            <p class="text-muted" style="text-align: center; padding: 2rem;">Loading details...</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  static updateToggleUI() {
    const calBtn = document.getElementById('an-view-cal');
    const graphBtn = document.getElementById('an-view-graph');
    if (!calBtn || !graphBtn) return;

    if (this.currentView === 'calendar') {
      calBtn.style.background = 'var(--accent-health)';
      calBtn.style.color = '#000';
      calBtn.style.fontWeight = '700';
      graphBtn.style.background = 'transparent';
      graphBtn.style.color = 'var(--text-secondary)';
      graphBtn.style.fontWeight = '600';
    } else {
      graphBtn.style.background = 'var(--accent-health)';
      graphBtn.style.color = '#000';
      graphBtn.style.fontWeight = '700';
      calBtn.style.background = 'transparent';
      calBtn.style.color = 'var(--text-secondary)';
      calBtn.style.fontWeight = '600';
    }
  }

  static async fetchAndRender() {
    const box = document.getElementById('analytics-content-box');
    if (box) {
      box.innerHTML = `<div class="glass-card" style="text-align: center; padding: 3rem 1rem;"><p class="text-muted">Loading analytics data...</p></div>`;
    }

    try {
      const historyUrl = (ENDPOINTS && ENDPOINTS.NUTRITION_HISTORY) ? ENDPOINTS.NUTRITION_HISTORY : `${API_BASE_URL}/nutrition/history`;
      this.historyData = await APIClient.request(`${historyUrl}?days=${this.days}`);
      this.renderView();
    } catch (err) {
      console.error('Failed to fetch analytics history:', err);
      if (box) {
        box.innerHTML = `
          <div class="glass-card text-danger" style="text-align: center; padding: 2rem;">
            Failed to load analytics history: ${err.message}
          </div>
        `;
      }
    }
  }

  static renderView() {
    const box = document.getElementById('analytics-content-box');
    if (!box) return;

    if (this.currentView === 'calendar') {
      this.renderCalendarView(box);
    } else {
      this.renderGraphView(box);
    }
  }

  static renderCalendarView(container) {
    const totalDays = this.historyData.length;
    const goalsHit = this.historyData.filter(x => x.is_goal_hit).length;
    const successRate = totalDays > 0 ? Math.round((goalsHit / totalDays) * 100) : 0;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Performance Overview Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
          <div class="glass-card" style="text-align: center; padding: 1.25rem;">
            <div class="text-muted" style="font-size: 0.8rem; text-transform: uppercase;">Goal Success Rate</div>
            <div style="font-size: 2rem; font-family: var(--font-heading); font-weight: 800; color: var(--accent-health); margin-top: 0.25rem;">
              ${successRate}%
            </div>
          </div>
          <div class="glass-card" style="text-align: center; padding: 1.25rem;">
            <div class="text-muted" style="font-size: 0.8rem; text-transform: uppercase;">Days Goal Hit</div>
            <div style="font-size: 2rem; font-family: var(--font-heading); font-weight: 800; color: var(--accent-health); margin-top: 0.25rem;">
              ${goalsHit} / ${totalDays}
            </div>
          </div>
          <div class="glass-card" style="text-align: center; padding: 1.25rem;">
            <div class="text-muted" style="font-size: 0.8rem; text-transform: uppercase;">Goal Rule</div>
            <div style="font-size: 0.85rem; font-weight: 600; margin-top: 0.5rem; color: var(--text-primary);">
              Protein Met & Caloric Target Respected
            </div>
          </div>
        </div>

        <!-- Calendar History Grid -->
        <div class="glass-card">
          <h3 style="font-size: 1rem; font-family: var(--font-heading); margin-bottom: 1rem;">
            📅 Daily Performance History (${this.days} Days) — <span style="font-size: 0.8rem; color: var(--accent-health); font-weight: normal;">Click any day to view details</span>
          </h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
            ${this.historyData.map(day => {
              const d = new Date(day.date + 'T00:00:00');
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              const isSuccess = day.is_goal_hit;
              const borderColor = isSuccess ? 'var(--accent-health)' : 'rgba(239, 68, 68, 0.4)';
              const bgGlow = isSuccess ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.05)';
              const badgeBg = isSuccess ? 'var(--accent-health)' : '#EF4444';

              return `
                <div class="analytics-day-tile" data-date="${day.date}" style="background: ${bgGlow}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; position: relative; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" title="Click to view full logs for ${dateStr}">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; font-size: 0.85rem;">${dateStr}</span>
                    <span style="background: ${badgeBg}; color: ${isSuccess ? '#000' : '#fff'}; font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 999px;">
                      ${isSuccess ? '✔' : '✖'}
                    </span>
                  </div>

                  <div style="font-size: 0.75rem; margin-top: 0.25rem;">
                    <div style="color: var(--text-secondary);">Cals: <span style="font-weight:600; color:var(--text-primary);">${day.consumed_calories} / ${day.adjusted_calorie_target}</span></div>
                    <div style="color: var(--text-secondary);">Prot: <span style="font-weight:600; color:var(--text-primary);">${day.consumed_protein_g}g / ${day.target_protein_g}g</span></div>
                  </div>

                  <!-- Goal Status Caption -->
                  <div style="font-size: 0.65rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${day.status_reason}">
                    ${day.status_reason}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }

  static renderGraphView(container) {
    if (!this.historyData || this.historyData.length === 0) {
      container.innerHTML = `<div class="glass-card" style="text-align: center; padding: 2rem;">No data available for line graph.</div>`;
      return;
    }

    const data = this.historyData;
    const maxVal = Math.max(...data.map(d => Math.max(d.consumed_calories, d.adjusted_calorie_target)), 2500) * 1.15;
    
    const svgWidth = 800;
    const svgHeight = 350;
    const padding = { top: 30, right: 40, bottom: 50, left: 60 };
    const chartW = svgWidth - padding.left - padding.right;
    const chartH = svgHeight - padding.top - padding.bottom;

    // Build SVG coordinates
    const pointsTarget = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - (d.adjusted_calorie_target / maxVal) * chartH;
      return { x, y, val: d.adjusted_calorie_target, date: d.date };
    });

    const pointsActual = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - (d.consumed_calories / maxVal) * chartH;
      return { x, y, val: d.consumed_calories, date: d.date };
    });

    const pathTargetD = pointsTarget.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const pathActualD = pointsActual.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    container.innerHTML = `
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1rem; font-family: var(--font-heading);">
            📈 Daily Caloric Goal vs Actual Consumed (${this.days} Days)
          </h3>

          <!-- Graph Legend -->
          <div style="display: flex; gap: 1rem; font-size: 0.8rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="display: inline-block; width: 16px; height: 3px; background: var(--accent-health); border-radius: 2px;"></span>
              <span>Goal Target Budget</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="display: inline-block; width: 16px; height: 3px; background: #3B82F6; border-radius: 2px;"></span>
              <span>Actual Consumed</span>
            </div>
          </div>
        </div>

        <!-- SVG Line Chart -->
        <div style="width: 100%; overflow-x: auto;">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: auto; font-family: var(--font-body);">
            <!-- Background Grid Lines -->
            <line x1="${padding.left}" y1="${padding.top}" x2="${svgWidth - padding.right}" y2="${padding.top}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
            <line x1="${padding.left}" y1="${padding.top + chartH / 2}" x2="${svgWidth - padding.right}" y2="${padding.top + chartH / 2}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
            <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${svgWidth - padding.right}" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

            <!-- Y-Axis Labels -->
            <text x="${padding.left - 10}" y="${padding.top + 4}" fill="var(--text-secondary)" font-size="10" text-anchor="end">${Math.round(maxVal)} kcal</text>
            <text x="${padding.left - 10}" y="${padding.top + chartH / 2 + 4}" fill="var(--text-secondary)" font-size="10" text-anchor="end">${Math.round(maxVal / 2)} kcal</text>
            <text x="${padding.left - 10}" y="${padding.top + chartH + 4}" fill="var(--text-secondary)" font-size="10" text-anchor="end">0 kcal</text>

            <!-- Line 1: Goal Target Budget (Emerald Green) -->
            <path d="${pathTargetD}" fill="none" stroke="var(--accent-health)" stroke-width="2.5" stroke-dasharray="6,4" />

            <!-- Line 2: Actual Consumed (Cobalt Blue) -->
            <path d="${pathActualD}" fill="none" stroke="#3B82F6" stroke-width="3" />

            <!-- Actual Consumed Interactive Dots -->
            ${pointsActual.map(p => `
              <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#3B82F6" stroke="#090C10" stroke-width="2">
                <title>${p.date}: ${p.val} kcal consumed</title>
              </circle>
            `).join('')}

            <!-- X-Axis Date Labels -->
            ${pointsTarget.filter((_, idx) => idx % Math.ceil(data.length / 7) === 0 || idx === data.length - 1).map(p => {
              const d = new Date(p.date + 'T00:00:00');
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return `
                <text x="${p.x}" y="${svgHeight - 15}" fill="var(--text-secondary)" font-size="10" text-anchor="middle">${dateStr}</text>
              `;
            }).join('')}
          </svg>
        </div>
      </div>
    `;
  }

  static async showDayDetailModal(dateStr) {
    this.ensureModalDOM();
    const modal = document.getElementById('day-detail-modal');
    const title = document.getElementById('day-modal-title');
    const body = document.getElementById('day-modal-body');

    if (!modal || !body) return;

    const d = new Date(dateStr + 'T00:00:00');
    const dateFormatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    title.textContent = `📅 Breakdown for ${dateFormatted}`;
    body.innerHTML = `<p class="text-muted" style="text-align: center; padding: 2rem;">Loading details for ${dateStr}...</p>`;
    modal.classList.add('active');

    try {
      const detailUrl = (ENDPOINTS && ENDPOINTS.DAY_DETAIL) ? ENDPOINTS.DAY_DETAIL : `${API_BASE_URL}/nutrition/day-detail`;
      const data = await APIClient.request(`${detailUrl}?target_date=${dateStr}`);

      const isSuccess = data.is_goal_hit;
      const statusBg = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const statusColor = isSuccess ? 'var(--accent-health)' : '#EF4444';
      const statusBadge = isSuccess ? '✔ Goal Hit' : '✖ Goal Missed';

      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Status Banner -->
          <div style="background: ${statusBg}; border: 1px solid ${statusColor}; padding: 0.85rem 1rem; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
            <div>
              <span style="background: ${statusColor}; color: ${isSuccess ? '#000' : '#fff'}; font-weight: 800; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 999px;">
                ${statusBadge}
              </span>
              <div style="font-size: 0.85rem; margin-top: 0.4rem; color: var(--text-primary); font-weight: 500;">
                ${data.status_reason}
              </div>
            </div>
          </div>

          <!-- Daily Macro & Energy Snapshot Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div style="background: rgba(22, 27, 34, 0.6); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-glass);">
              <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Calorie Budget</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-top: 0.2rem;">
                ${data.consumed_calories} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-secondary);">/ ${data.adjusted_calorie_target} kcal</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                Net Exercise Burn: +${data.exercise_net_calories_burned} kcal
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.6); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-glass);">
              <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Protein Target</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-health); margin-top: 0.2rem;">
                ${data.consumed_protein_g}g <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-secondary);">/ ${data.target_protein_g}g</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                Carbs: ${data.consumed_carb_g}g | Fat: ${data.consumed_fat_g}g
              </div>
            </div>
          </div>

          <!-- Logged Meals Section -->
          <div>
            <h4 style="font-size: 0.95rem; font-family: var(--font-heading); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              🥗 Logged Meals (${data.meals.length})
            </h4>
            ${data.meals.length === 0 ? `
              <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; background: rgba(22,27,34,0.3); padding: 0.75rem; border-radius: 8px;">
                No meals logged on this date.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto;">
                ${data.meals.map(m => `
                  <div style="background: rgba(22, 27, 34, 0.6); border: 1px solid var(--border-glass); padding: 0.65rem 0.85rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: rgba(59,130,246,0.15); color: #3B82F6; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.4rem; border-radius: 4px;">
                          ${m.meal_type}
                        </span>
                        <span style="font-weight: 600; font-size: 0.85rem;">${m.description}</span>
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                        Logged at ${m.time} • P: ${m.protein_g}g | C: ${m.carbs_g}g | F: ${m.fat_g}g
                      </div>
                    </div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: var(--accent-health);">
                      ${m.calories} kcal
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Logged Workouts Section -->
          <div>
            <h4 style="font-size: 0.95rem; font-family: var(--font-heading); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              ⚡ Logged Workouts (${data.workouts.length})
            </h4>
            ${data.workouts.length === 0 ? `
              <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; background: rgba(22,27,34,0.3); padding: 0.75rem; border-radius: 8px;">
                No workouts logged on this date.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 180px; overflow-y: auto;">
                ${data.workouts.map(w => `
                  <div style="background: rgba(22, 27, 34, 0.6); border: 1px solid var(--border-glass); padding: 0.65rem 0.85rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 600; font-size: 0.85rem;">⚡ ${w.exercise_name}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                        Duration: ${w.duration_minutes} mins • Logged at ${w.time}
                      </div>
                    </div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: #3B82F6;">
                      +${w.calories_burned} kcal
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>
      `;
    } catch (err) {
      body.innerHTML = `<div class="text-danger" style="text-align: center; padding: 2rem;">Failed to load details: ${err.message}</div>`;
    }
  }
}
