/* API Client Wrapper handling JWT Bearer Tokens & Error Toast Notifications */
import { ENDPOINTS } from './config.js';

export class APIClient {
  static getAccessToken() {
    return localStorage.getItem('getfit_access_token');
  }

  static getRefreshToken() {
    return localStorage.getItem('getfit_refresh_token');
  }

  static setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem('getfit_access_token', accessToken);
    if (refreshToken) localStorage.setItem('getfit_refresh_token', refreshToken);
  }

  static clearTokens() {
    localStorage.removeItem('getfit_access_token');
    localStorage.removeItem('getfit_refresh_token');
  }

  static isAuthenticated() {
    return !!this.getAccessToken();
  }

  static async request(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, config);

      // Handle 401 Unauthorized (attempt token refresh)
      if (response.status === 401 && this.getRefreshToken()) {
        const refreshed = await this.refreshSession();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
          response = await fetch(url, { ...options, headers });
        } else {
          this.clearTokens();
          window.dispatchEvent(new Event('auth:unauthorized'));
          throw new Error('Session expired. Please log in again.');
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = this.formatErrorMessage(errData, response.status);
        throw new Error(message);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`[API Client Error] ${url}:`, error.message);
      throw error;
    }
  }

  static async refreshSession() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(ENDPOINTS.REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch (err) {
      return false;
    }
  }

  static formatErrorMessage(errData, status) {
    if (!errData) return `HTTP Error ${status}`;

    // 1. Direct string detail
    if (typeof errData.detail === 'string') {
      return errData.detail;
    }

    // 2. Single detail object: { msg: "..." } or { loc: [...], msg: "..." }
    if (errData.detail && typeof errData.detail === 'object' && !Array.isArray(errData.detail)) {
      let msg = errData.detail.msg || errData.detail.message || JSON.stringify(errData.detail);
      if (typeof msg === 'string' && msg.startsWith('Value error, ')) {
        msg = msg.replace('Value error, ', '');
      }
      return msg;
    }

    // 3. Array of detail objects: [{ msg: "..." }, ...]
    if (Array.isArray(errData.detail)) {
      return errData.detail
        .map(item => {
          if (typeof item === 'string') return item;
          let msg = item.msg || item.message || 'Invalid input value';
          if (typeof msg === 'string' && msg.startsWith('Value error, ')) {
            msg = msg.replace('Value error, ', '');
          }
          const field = item.loc ? item.loc[item.loc.length - 1] : '';
          const fieldName = (field && field !== 'body') ? field.charAt(0).toUpperCase() + field.slice(1) : '';
          return fieldName ? `${fieldName}: ${msg}` : msg;
        })
        .join('\n');
    }

    // 4. Other string error properties
    if (typeof errData.message === 'string') return errData.message;
    if (typeof errData.error === 'string') return errData.error;

    return `HTTP Error ${status}`;
  }
}
