/**
 * FitBot AI Coach Chatbot Frontend Controller Module
 */

import { APIClient } from './api_client.js';

class FitBotController {
  constructor() {
    this.activeSessionId = null;
    this.sessions = [];
    this.isDrawerOpen = false;
    this.initialized = false;
  }

  /**
   * Initializes FitBot UI elements and event listeners.
   */
  async init() {
    if (this.initialized) return;

    this.renderFloatingTrigger();
    this.renderDrawerWidget();
    this.bindEvents();

    this.initialized = true;
  }

  /**
   * Renders the persistent bottom-right floating trigger button.
   */
  renderFloatingTrigger() {
    if (document.getElementById('fitbot-trigger')) return;

    const btn = document.createElement('button');
    btn.id = 'fitbot-trigger';
    btn.className = 'fitbot-floating-trigger';
    btn.innerHTML = `🤖<span class="fitbot-floating-badge">AI</span>`;
    btn.title = "Ask FitBot AI Coach";
    btn.addEventListener('click', () => this.toggleDrawer());
    document.body.appendChild(btn);
  }

  /**
   * Renders the floating Glassmorphism drawer modal container.
   */
  renderDrawerWidget() {
    if (document.getElementById('fitbot-drawer-window')) return;

    const drawer = document.createElement('div');
    drawer.id = 'fitbot-drawer-window';
    drawer.className = 'fitbot-drawer-window';
    drawer.innerHTML = `
      <div class="fitbot-drawer-header">
        <div class="fitbot-header-title">
          <span>🤖 FitBot AI Coach</span>
        </div>
        <button id="fitbot-drawer-close" class="fitbot-close-btn" title="Close">✕</button>
      </div>
      <div id="fitbot-drawer-messages" class="fitbot-message-feed">
        <div class="fitbot-message-wrapper assistant">
          <div class="fitbot-bubble">
            👋 Hi! I'm FitBot, your AI Fitness & Nutrition Coach. How can I help you reach your goals today?
          </div>
          <div class="fitbot-quick-replies-container">
            <button class="fitbot-quick-reply-pill" data-prompt="How many calories do I have remaining today?">🔥 Calories Remaining Today</button>
            <button class="fitbot-quick-reply-pill" data-prompt="How can I hit my protein target?">🥩 Protein Goal Advice</button>
            <button class="fitbot-quick-reply-pill" data-prompt="Suggest a quick 15-minute workout">🏋️ Quick Workout Recommendation</button>
          </div>
        </div>
      </div>
      <div class="fitbot-input-bar">
        <input type="text" id="fitbot-drawer-input" class="fitbot-text-input" placeholder="Ask FitBot anything..." />
        <button id="fitbot-drawer-send" class="fitbot-send-btn" title="Send">➤</button>
      </div>
    `;
    document.body.appendChild(drawer);

    document.getElementById('fitbot-drawer-close').addEventListener('click', () => this.toggleDrawer(false));
    
    const input = document.getElementById('fitbot-drawer-input');
    const sendBtn = document.getElementById('fitbot-drawer-send');

    const handleSend = () => {
      const txt = input.value.trim();
      if (txt) {
        this.sendMessage(txt, 'drawer');
        input.value = '';
      }
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }

  /**
   * Toggles the floating drawer widget visibility.
   */
  toggleDrawer(show = null) {
    const drawer = document.getElementById('fitbot-drawer-window');
    if (!drawer) return;

    this.isDrawerOpen = show !== null ? show : !this.isDrawerOpen;
    if (this.isDrawerOpen) {
      drawer.classList.add('active');
      document.getElementById('fitbot-drawer-input')?.focus();
    } else {
      drawer.classList.remove('active');
    }
  }

  /**
   * Renders the dedicated full-page Navbar Tab view.
   */
  async renderFullPageView(container) {
    container.innerHTML = `
      <div class="fitbot-page-container">
        <!-- Sidebar Sessions -->
        <aside class="fitbot-sidebar">
          <button id="fitbot-new-chat-page-btn" class="fitbot-new-chat-btn">
            <span>+</span> New Chat Session
          </button>
          <div id="fitbot-sessions-list" class="fitbot-session-list">
            <div style="color: #9ca3af; font-size: 0.85rem; padding: 10px;">Loading sessions...</div>
          </div>
        </aside>

        <!-- Main Chat Canvas -->
        <main class="fitbot-chat-canvas">
          <div id="fitbot-page-messages" class="fitbot-message-feed">
            <div class="fitbot-message-wrapper assistant">
              <div class="fitbot-bubble">
                👋 Welcome to your FitBot AI Coach workspace! Ask me anything about your nutritional macro targets, workout plans, or app features.
              </div>
              <div class="fitbot-quick-replies-container">
                <button class="fitbot-quick-reply-pill" data-prompt="Am I on track for my target weight?">🎯 Am I on track for my target weight?</button>
                <button class="fitbot-quick-reply-pill" data-prompt="What should I eat for post-workout recovery?">🥗 Post-workout recovery meals</button>
                <button class="fitbot-quick-reply-pill" data-prompt="Show me my workout burn today">🔥 Today's workout burn</button>
              </div>
            </div>
          </div>

          <div class="fitbot-input-bar">
            <input type="text" id="fitbot-page-input" class="fitbot-text-input" placeholder="Ask FitBot a question..." />
            <button id="fitbot-page-send" class="fitbot-send-btn" title="Send">➤</button>
          </div>
        </main>
      </div>
    `;

    document.getElementById('fitbot-new-chat-page-btn').addEventListener('click', () => this.createNewSession());

    const input = document.getElementById('fitbot-page-input');
    const sendBtn = document.getElementById('fitbot-page-send');

    const handleSend = () => {
      const txt = input.value.trim();
      if (txt) {
        this.sendMessage(txt, 'page');
        input.value = '';
      }
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    await this.loadSessions();
  }

  /**
   * Fetches user's chat sessions from backend.
   */
  async loadSessions() {
    try {
      const res = await APIClient.request('/api/v1/fitbot/sessions');
      this.sessions = (res && res.sessions) || [];
      this.renderSessionList();

      if (this.sessions.length > 0 && !this.activeSessionId) {
        this.selectSession(this.sessions[0].id);
      }
    } catch (err) {
      console.error('Failed to load FitBot sessions:', err);
    }
  }

  /**
   * Renders session list items in full-page view sidebar.
   */
  renderSessionList() {
    const listEl = document.getElementById('fitbot-sessions-list');
    if (!listEl) return;

    if (this.sessions.length === 0) {
      listEl.innerHTML = `<div style="color: #9ca3af; font-size: 0.85rem; padding: 10px;">No prior chats yet.</div>`;
      return;
    }

    listEl.innerHTML = this.sessions
      .map(
        (s) => `
      <div class="fitbot-session-item ${s.id === this.activeSessionId ? 'active' : ''}" data-id="${s.id}">
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">💬 ${this.escapeHtml(s.title)}</span>
        <span class="fitbot-delete-session-icon" data-delete-id="${s.id}" title="Delete session">🗑️</span>
      </div>
    `
      )
      .join('');

    listEl.querySelectorAll('.fitbot-session-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('fitbot-delete-session-icon')) {
          e.stopPropagation();
          const delId = e.target.getAttribute('data-delete-id');
          this.deleteSession(delId);
        } else {
          const id = item.getAttribute('data-id');
          this.selectSession(id);
        }
      });
    });
  }

  /**
   * Switches active chat session.
   */
  async selectSession(sessionId) {
    this.activeSessionId = sessionId;
    this.renderSessionList();
    await this.loadSessionMessages(sessionId);
  }

  /**
   * Creates a new chat session.
   */
  async createNewSession() {
    try {
      const newSession = await APIClient.request('/api/v1/fitbot/sessions?title=New%20Chat', { method: 'POST' });
      this.activeSessionId = newSession.id;
      await this.loadSessions();
      
      const feed = document.getElementById('fitbot-page-messages');
      if (feed) {
        feed.innerHTML = `
          <div class="fitbot-message-wrapper assistant">
            <div class="fitbot-bubble">
              👋 Started a new conversation! What would you like to focus on?
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }

  /**
   * Deletes a chat session.
   */
  async deleteSession(sessionId) {
    try {
      await APIClient.request(`/api/v1/fitbot/sessions/${sessionId}`, { method: 'DELETE' });
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
      }
      await this.loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }

  /**
   * Fetches and displays messages for a session.
   */
  async loadSessionMessages(sessionId) {
    const feed = document.getElementById('fitbot-page-messages');
    if (!feed) return;

    try {
      const messages = await APIClient.request(`/api/v1/fitbot/sessions/${sessionId}/messages`);
      feed.innerHTML = '';
      if (Array.isArray(messages)) {
        messages.forEach((m) => this.appendMessageToFeed(feed, m));
      }
      feed.scrollTop = feed.scrollHeight;
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  }

  /**
   * Sends a user prompt to FitBot.
   */
  async sendMessage(text, mode = 'page') {
    const feed = mode === 'drawer' ? document.getElementById('fitbot-drawer-messages') : document.getElementById('fitbot-page-messages');
    if (!feed) return;

    // 1. Append user message bubble
    const userMsg = {
      role: 'user',
      message: text,
      created_at: new Date().toISOString(),
    };
    this.appendMessageToFeed(feed, userMsg);
    feed.scrollTop = feed.scrollHeight;

    // 2. Show typing indicator
    const typingIndicator = this.createTypingIndicator();
    feed.appendChild(typingIndicator);
    feed.scrollTop = feed.scrollHeight;

    try {
      const payload = {
        message: text,
        session_id: this.activeSessionId,
      };
      const response = await APIClient.request('/api/v1/fitbot/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Remove typing indicator
      typingIndicator.remove();

      this.activeSessionId = response.session_id;

      // 3. Append assistant response bubble
      const assistantMsg = {
        role: 'assistant',
        message: response.reply,
        suggested_quick_replies: response.suggested_quick_replies,
        navigation: response.navigation,
        created_at: response.created_at,
      };
      this.appendMessageToFeed(feed, assistantMsg);
      feed.scrollTop = feed.scrollHeight;

      if (mode === 'page') {
        this.loadSessions();
      }
    } catch (err) {
      typingIndicator.remove();
      this.appendMessageToFeed(feed, {
        role: 'assistant',
        message: '⚠️ Sorry, FitBot is temporarily unavailable. Please try again in a moment.',
        created_at: new Date().toISOString(),
      });
      feed.scrollTop = feed.scrollHeight;
    }
  }

  /**
   * Appends a message bubble to the designated feed container.
   */
  appendMessageToFeed(feed, msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `fitbot-message-wrapper ${msg.role}`;

    const bubble = document.createElement('div');
    bubble.className = 'fitbot-bubble';
    bubble.textContent = msg.message;

    wrapper.appendChild(bubble);

    // Quick replies pills
    if (msg.suggested_quick_replies && msg.suggested_quick_replies.length > 0) {
      const repliesContainer = document.createElement('div');
      repliesContainer.className = 'fitbot-quick-replies-container';

      msg.suggested_quick_replies.forEach((promptText) => {
        const pill = document.createElement('button');
        pill.className = 'fitbot-quick-reply-pill';
        pill.textContent = promptText;
        pill.addEventListener('click', () => {
          this.sendMessage(promptText, feed.id.includes('drawer') ? 'drawer' : 'page');
        });
        repliesContainer.appendChild(pill);
      });

      wrapper.appendChild(repliesContainer);
    }

    // App Navigation Action Button
    if (msg.navigation && msg.navigation.target_tab) {
      const navBtn = document.createElement('button');
      navBtn.className = 'fitbot-nav-action-btn';
      const icon = this.getTabIcon(msg.navigation.target_tab);
      navBtn.innerHTML = `${icon} ${msg.navigation.action_label || 'Go to Page'}`;
      navBtn.addEventListener('click', () => {
        this.navigateToTab(msg.navigation.target_tab);
      });
      wrapper.appendChild(navBtn);
    }

    feed.appendChild(wrapper);
  }

  /**
   * Switches app active navigation tab.
   */
  navigateToTab(tabName) {
    // Map backend targets to frontend tab names
    const targetMap = {
      dashboard: 'dashboard',
      nutrition: 'food',
      workouts: 'exercise',
      analytics: 'analytics',
      profile: 'profile',
      fitbot: 'fitbot',
    };

    const targetTab = targetMap[tabName] || tabName;
    const btn = document.querySelector(`.nav-tab-btn[data-tab="${targetTab}"]`);
    if (btn) {
      btn.click();
      if (this.isDrawerOpen) {
        this.toggleDrawer(false);
      }
    }
  }

  getTabIcon(tabName) {
    switch (tabName) {
      case 'nutrition':
      case 'food':
        return '🥗';
      case 'workouts':
      case 'exercise':
        return '🏋️';
      case 'analytics':
        return '📊';
      case 'profile':
        return '⚙️';
      default:
        return '📍';
    }
  }

  createTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'fitbot-message-wrapper assistant';
    el.innerHTML = `
      <div class="fitbot-bubble">
        <div class="fitbot-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    return el;
  }

  bindEvents() {
    // Global delegation for quick reply pills inside feed
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('fitbot-quick-reply-pill') && e.target.hasAttribute('data-prompt')) {
        const prompt = e.target.getAttribute('data-prompt');
        this.sendMessage(prompt, this.isDrawerOpen ? 'drawer' : 'page');
      }
    });
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const fitbotController = new FitBotController();
