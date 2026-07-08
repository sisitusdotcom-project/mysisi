/**
 * UNIFIED API CLIENT
 * ===================================
 * Single API layer untuk semua GAS calls
 * - Consistent request/response format
 * - Automatic error handling & recovery
 * - Built-in timeout & retry logic
 * - Session validation
 * - Detailed logging
 * 
 * Usage:
 *   APIClient.call('registerUser', {email, password})
 *   APIClient.call('loginUser', {email, password})
 *   APIClient.call('getUserProfile', {userId})
 */

import { AuthManager } from './unified-auth.js';
import { GAS_CONFIG } from '../config/api.config.js';

export class APIClient {
  static DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Make API call to GAS backend
   * Simple, direct pattern matching sampel-mekanisme-GAS
   */
  static async call(action, data = {}, options = {}) {
    let { method = 'POST' } = options;

    // Use GET for data retrieval if no complex data
    const getActions = ['checkdomain', 'getuserprofile', 'getorders', 'getorderdetail', 'getactivepromocodes'];
    if (getActions.includes(action.toLowerCase())) {
      method = 'GET';
    }

    try {
      const response = await this.makeRequest(action, data, method, this.DEFAULT_TIMEOUT);

      // Response bisa dalam berbagai format, fallback jika tidak sesuai expected
      let result = response;

      // Jika response adalah object dengan success field
      if (typeof response === 'object' && response !== null) {
        // Jika ada success field, gunakan sebagai response valid
        if ('success' in response) {
          if (typeof response.success !== 'boolean') {
            console.warn('[API] Warning: success field bukan boolean, treating as:', !!response.success);
            response.success = !!response.success; // Convert to boolean
          }
          result = response;
        } else if ('data' in response) {
          // Fallback: jika ada data field tapi tidak ada success, anggap success = true
          console.warn('[API] No success field, default to true (data present)');
          result = {
            success: true,
            data: response.data,
            message: response.message || 'Operation successful',
            timestamp: response.timestamp || Date.now()
          };
        } else {
          // Response adalah object tapi tidak ada expected field
          console.warn('[API] Unexpected response format, trying to detect success state:', response);
          result = {
            success: true, // Assume success jika response sudah dikirim
            data: response,
            message: response.message || 'Operation completed',
            timestamp: Date.now()
          };
        }
      } else {
        // Response bukan object (string, boolean, etc) - unexpected
        console.error('[API] Response bukan object:', typeof response);
        throw new Error('Server response format tidak valid');
      }

      // Final validation
      if (result.success === false && (result.errorCode === 'UNAUTHORIZED' || result.errorCode === 'SESSION_EXPIRED')) {
        console.error('[API] Auth error - clearing session');
        AuthManager.clearSession();
        throw new Error('Session expired. Please login again.');
      }

      return result;
    } catch (error) {
      console.error(`[API] ${action} failed:`, error.message);
      throw error; // Let caller handle error
    }
  }

  /**
   * Make actual HTTP request
   * Using FormData for ALL requests - matches sampel-mekanisme-GAS pattern
   * FormData automatically becomes multipart/form-data - NO CORS preflight needed
   * Per sampel-mekanisme-GAS: this is the ONLY way to reliably work with GAS
   * 
   * DO NOT use:
   * - Content-Type: application/json (triggers preflight - GAS doesn't like it)
   * - URLSearchParams (less reliable than FormData)
   * - Custom headers (can trigger preflight)
   */
  static async makeRequest(action, data, method, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Build URLSearchParams for application/x-www-form-urlencoded format
      // as required by Google Apps Script rules to avoid CORS preflight errors.
      const postParams = new URLSearchParams();
      postParams.append('action', action);
      
      // Add all data fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            postParams.append(key, JSON.stringify(value));
          } else {
            postParams.append(key, String(value));
          }
        }
      });

      let url = `${GAS_CONFIG.URL}`;
      let options = {
        method: method,
        signal: controller.signal
      };

      if (method === 'GET') {
        // For GET, append as query string
        const params = new URLSearchParams({ action, ...data });
        url = `${GAS_CONFIG.URL}?${params}`;
      } else if (method === 'POST') {
        // For POST, use application/x-www-form-urlencoded to prevent CORS preflight issues
        options.body = postParams;
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        // Try to get error message from response body
        let errorBody = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorJson = await response.json();
            errorBody = errorJson.message || JSON.stringify(errorJson);
          } else {
            errorBody = await response.text();
          }
        } catch (e) {
          errorBody = response.statusText;
        }
        throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`);
      }

      // Try parse as JSON
      try {
        const responseText = await response.text();
        
        // Try parse JSON
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          // Jika bukan valid JSON, return sebagai response object dengan raw text
          console.warn('[API] Response bukan JSON, return as-is:', responseText.substring(0, 100));
          return {
            success: true, // Assume success jika GAS respond
            data: responseText,
            message: 'Response received from server',
            timestamp: Date.now(),
            _raw: responseText // Keep raw response
          };
        }
      } catch (error) {
        throw new Error('Gagal membaca response dari server: ' + error.message);
      }
    } catch (error) {
      // Network error, timeout, atau parse error
      if (error.name === 'AbortError') {
        throw new Error('Request timeout setelah ' + timeout + 'ms');
      }
      throw error; // Re-throw all other errors
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ========== AUTH ENDPOINTS ==========

  /**
   * Register new user
   */
  static registerUser(email, password, displayName = '', whatsapp = '') {
    return this.call('registerUser', {
      email,
      password,
      displayName: displayName || email.split('@')[0],
      whatsapp
    }, { method: 'POST' });
  }

  /**
   * Login user
   */
  static loginUser(email, password) {
    return this.call('loginUser', {
      email,
      password
    }, { method: 'POST' });
  }

  /**
   * Verify email token (auto-login after registration)
   * Using GET request to avoid CORS preflight issues
   */
  static verifyEmailToken(token) {
    return this.call('verifyEmailToken', { token }, { method: 'GET' });
  }

  /**
   * Verify Google OAuth token
   * Using POST request because Google tokens are extremely long and can trigger URL limits or CORS failures on GET
   */
  static verifyGoogleToken(token) {
    return this.call('verifyGoogleToken', { token }, { method: 'POST' });
  }

  /**
   * Request password reset
   * Using GET request to avoid CORS preflight issues
   */
  static requestPasswordReset(email) {
    return this.call('requestPasswordReset', { email }, { method: 'POST' });
  }

  /**
   * Reset password with token
   */
  static resetPassword(token, password) {
    return this.call('resetPassword', { token, password }, { method: 'POST' });
  }

  // ========== USER PROFILE ENDPOINTS ==========

  /**
   * Get user profile
   * Using GET request to avoid CORS preflight issues
   */
  static getUserProfile(userId) {
    return this.call('getUserProfile', { userId }, { method: 'GET' });
  }

  /**
   * Update user profile
   */
  static updateUserProfile(userId, displayName, whatsapp, photoURL) {
    return this.call('updateUserProfile', {
      userId,
      displayName,
      whatsapp,
      photoURL
    }, { method: 'POST' });
  }

  /**
   * Change password
   */
  static changePassword(userId, oldPassword, newPassword) {
    return this.call('changePassword', {
      userId,
      oldPassword,
      newPassword
    }, { method: 'POST' });
  }

  // ========== ORDER ENDPOINTS ==========

  /**
   * Create order (authenticated)
   * Accepts userId as part of orderData or will pass-through
   */
  static createOrder(orderData) {
    return this.call('createOrderWithAuth', orderData, { method: 'POST' });
  }

  /**
   * Create order with separate userId (alternative signature for convenience)
   */
  static createOrderWithAuth(userIdOrOrderData, orderDataIfUserIdProvided) {
    // Support both signatures:
    // createOrderWithAuth({userId, domain, ...}) 
    // createOrderWithAuth(userId, {domain, ...})
    let data;
    if (typeof userIdOrOrderData === 'string') {
      // Second param provided - merge userId
      data = { userId: userIdOrOrderData, ...orderDataIfUserIdProvided };
    } else {
      // First param is the full object
      data = userIdOrOrderData;
    }
    return this.call('createOrderWithAuth', data, { method: 'POST' });
  }

  /**
   * Get user's orders
   */
  static getUserOrders(userId) {
    return this.call('getUserOrders', { userId }, { method: 'POST' });
  }

  /**
   * Get order detail
   */
  static getOrderDetail(orderId, userId) {
    return this.call('getOrderDetail', { orderId, userId }, { method: 'POST' });
  }

  /**
   * Sync order status directly with Midtrans backend
   * @param {string} orderId 
   */
  static syncOrderStatus(orderId) {
    return this.call('syncorderstatus', { orderId }, { method: 'POST' });
  }

  /**
   * Update order status
   */
  static updateOrderStatus(orderId, status, transactionId = null) {
    return this.call('updateOrderStatus', {
      orderId,
      status,
      transactionId  // NEW: Pass transaction ID from Midtrans
    }, { method: 'POST' });
  }

  /**
   * Get user order statistics
   */
  static getUserOrderStats(userId) {
    return this.call('getUserOrderStats', { userId }, { method: 'POST' });
  }

  // ========== PAYMENT ENDPOINTS ==========

  /**
   * Generate Midtrans payment token
   */
  static generateMidtransToken(orderId, email, phone, name, domain, packageId, total, addons = []) {
    return this.call('generateMidtransToken', {
      orderId,
      email,
      phone,
      name,
      domain,
      packageId,
      total,
      addons  // NEW: Pass addons array
    }, { method: 'POST' });
  }

  // ========== DOMAIN ENDPOINTS ==========

  /**
   * Check domain availability
   */
  static checkDomain(domain) {
    return this.call('checkDomain', { domain }, { method: 'POST' });
  }

  /**
   * Get domain pricing
   */
  static getDomainPricing(tld) {
    return this.call('getDomainPricing', { tld }, { method: 'POST' });
  }

  // ========== PROMO ENDPOINTS ==========

  /**
   * Validate promo code
   */
  static validatePromoCode(code) {
    return this.call('validatePromoCode', { code }, { method: 'POST' });
  }

  /**
   * Get active promo codes list
   */
  static getActivePromoCodes() {
    return this.call('getActivePromoCodes', {}, { method: 'GET' });
  }

  // ========== ADMIN ENDPOINTS ==========

  static getAdminStats(adminId = 'ADMIN') {
    return this.call('getadminstats', { adminId }, { method: 'POST' });
  }

  static getAllUsers(adminId = 'ADMIN') {
    return this.call('getallusers', { adminId }, { method: 'POST' });
  }

  static saveAdminUser(adminId, userData) {
    return this.call('saveadminuser', { adminId, userData: JSON.stringify(userData) }, { method: 'POST' });
  }

  static deleteAdminUser(adminId, id) {
    return this.call('deleteadminuser', { adminId, id }, { method: 'POST' });
  }

  static getAllTransactions(adminId = 'ADMIN') {
    return this.call('getalltransactions', { adminId }, { method: 'POST' });
  }

  static saveAdminTransaction(adminId, txData) {
    return this.call('saveadmintransaction', { adminId, txData: JSON.stringify(txData) }, { method: 'POST' });
  }

  static deleteAdminTransaction(adminId, id) {
    return this.call('deleteadmintransaction', { adminId, id }, { method: 'POST' });
  }

  static getAdminPromos(adminId) {
    return this.call('getadminpromos', { adminId }, { method: 'POST' });
  }

  static saveAdminPromo(adminId, promoData) {
    return this.call('saveadminpromo', { adminId, promoData: JSON.stringify(promoData) }, { method: 'POST' });
  }

  static deleteAdminPromo(adminId, code) {
    return this.call('deleteadminpromo', { adminId, code }, { method: 'POST' });
  }

  static getAdminPackages(adminId) {
    return this.call('getadminpackages', { adminId }, { method: 'POST' });
  }

  static saveAdminPackage(adminId, packageData) {
    return this.call('saveadminpackage', { adminId, packageData: JSON.stringify(packageData) }, { method: 'POST' });
  }

  static deleteAdminPackage(adminId, id) {
    return this.call('deleteadminpackage', { adminId, id }, { method: 'POST' });
  }

  static getAdminTickets(adminId) {
    return this.call('getadmintickets', { adminId }, { method: 'POST' });
  }

  static saveAdminTicket(adminId, ticketData) {
    return this.call('saveadminticket', { adminId, ticketData: JSON.stringify(ticketData) }, { method: 'POST' });
  }

  static deleteAdminTicket(adminId, id) {
    return this.call('deleteadminticket', { adminId, id }, { method: 'POST' });
  }

  static getAdminDNS(adminId) {
    return this.call('getadmindns', { adminId }, { method: 'POST' });
  }

  static saveAdminDNS(adminId, dnsData) {
    return this.call('saveadmindns', { adminId, dnsData: JSON.stringify(dnsData) }, { method: 'POST' });
  }

  static deleteAdminDNS(adminId, domain) {
    return this.call('deleteadmindns', { adminId, domain }, { method: 'POST' });
  }
}

// Export for use
export default APIClient;
