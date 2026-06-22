/**
 * Dashboard Authentication Module
 * ===================================
 * Simplified wrapper that delegates to unified auth system
 * 
 * Uses:
 * - AuthManager for session management
 * - APIClient for API calls
 * 
 * This module provides backward compatibility for dashboard code
 * while using the centralized auth system.
 */

import { AuthManager } from '/assets/js/modules/unified-auth.js';
import APIClient from '/assets/js/modules/unified-api.js';

export class DashboardAuth {
  static RETURN_TO_KEY = 'dashboard_return_to';

  /**
   * Get current logged-in user from unified AuthManager
   * @returns {Object|null} User object or null if not logged in
   */
  static getCurrentUser() {
    return AuthManager.getCurrentUser();
  }

  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  static isLoggedIn() {
    return AuthManager.isLoggedIn();
  }

  /**
   * Get user ID
   * @returns {string|null}
   */
  static getUserId() {
    const user = this.getCurrentUser();
    return user?.userId || null;
  }

  /**
   * Logout - uses unified AuthManager
   */
  static logout() {
    try {
      AuthManager.clearSession();
      sessionStorage.removeItem(this.RETURN_TO_KEY);
      sessionStorage.removeItem('checkoutState');
      window.location.href = '/auth/';
    } catch (error) {
      console.error('[DashboardAuth] Logout error:', error);
      window.location.href = '/auth/';
    }
  }

  /**
   * Update current user session
   * @param {Object} user - Updated user details
   */
  static updateSession(user) {
    AuthManager.updateUser(user);
  }

  /**
   * Set return-to URL (untuk redirect setelah action tertentu)
   * @param {string} url
   */
  static setReturnTo(url) {
    sessionStorage.setItem(this.RETURN_TO_KEY, url);
  }

  /**
   * Get and clear return-to URL
   * @returns {string|null}
   */
  static getReturnTo() {
    const url = sessionStorage.getItem(this.RETURN_TO_KEY);
    sessionStorage.removeItem(this.RETURN_TO_KEY);
    return url;
  }

  // ============================================================================
  // API DELEGATES - Forward to unified APIClient
  // ============================================================================

  /**
   * Email/Password Login - delegates to APIClient
   */
  static async login(email, password) {
    const result = await APIClient.loginUser(email, password);
    if (result.success) {
      AuthManager.saveSession(result.data);
    }
    return result;
  }

  /**
   * Register new user - delegates to APIClient
   */
  static async register(email, password, displayName, whatsapp) {
    return await APIClient.registerUser(email, password, displayName, whatsapp);
  }

  /**
   * Verify Google token - delegates to APIClient
   */
  static async verifyGoogle(token) {
    const result = await APIClient.verifyGoogleToken(token);
    if (result.success) {
      AuthManager.saveSession(result.data);
    }
    return result;
  }

  /**
   * Verify email token - delegates to APIClient
   */
  static async verifyEmail(token) {
    return await APIClient.verifyEmailToken(token);
  }

  /**
   * Request password reset - delegates to APIClient
   */
  static async requestPasswordReset(email) {
    return await APIClient.requestPasswordReset(email);
  }

  /**
   * Reset password - delegates to APIClient
   */
  static async resetPassword(token, newPassword) {
    return await APIClient.resetPassword(token, newPassword);
  }

  /**
   * Change password - delegates to APIClient
   */
  static async changePassword(userId, oldPassword, newPassword) {
    return await APIClient.changePassword(userId, oldPassword, newPassword);
  }

  /**
   * Update user profile - delegates to APIClient
   */
  static async updateProfile(userId, displayName, whatsapp) {
    return await APIClient.updateUserProfile(userId, displayName, whatsapp);
  }
}
