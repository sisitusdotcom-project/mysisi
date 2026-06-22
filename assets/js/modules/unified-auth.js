/**
 * UNIFIED AUTH MANAGER
 * ===================================
 * Single source of truth untuk authentication state
 * - Centralized session management
 * - Event-driven updates
 * - Automatic multi-tab sync
 * - Session timeout support
 * - No duplication with dashboard module
 * 
 * Usage:
 *   AuthManager.login(email, password)
 *   AuthManager.logout()
 *   AuthManager.isLoggedIn()
 *   AuthManager.getCurrentUser()
 *   AuthManager.on('authChanged', handler)
 */

export class AuthManager {
  static SESSION_KEY = 'sisitus_user';
  static SESSION_VERSION = 2;
  static SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  static STORAGE_TYPE = 'localStorage'; // Use localStorage for cross-tab persistence

  // State
  static state = {
    user: null,
    isLoggedIn: false,
    lastActivity: null,
    expiresAt: null
  };

  // Event listeners
  static listeners = {
    authChanged: [],
    authError: [],
    sessionExpired: []
  };

  /**
   * Initialize auth manager
   * - Check if user is logged in
   * - Setup session timeout
   * - Setup storage listener
   */
  static init() {
    // Load saved session
    this.loadSession();

    // Setup session timeout
    this.setupSessionTimeout();

    // Setup storage listener for multi-tab sync
    this.setupStorageListener();

    // Setup activity tracker
    this.setupActivityTracker();
  }

  /**
   * Load session from storage
   */
  static loadSession() {
    try {
      const stored = window[this.STORAGE_TYPE].getItem(this.SESSION_KEY);
      
      if (!stored) {
        this.state = {
          user: null,
          isLoggedIn: false,
          lastActivity: Date.now(),
          expiresAt: null
        };
        return;
      }

      const data = JSON.parse(stored);

      // Validate version
      if (data.version !== this.SESSION_VERSION) {
        console.warn('[AuthManager] Session version mismatch, clearing');
        this.clearSession();
        return;
      }

      // Check expiration
      if (data.expiresAt && Date.now() > data.expiresAt) {
        console.warn('[AuthManager] Session expired');
        this.clearSession();
        this.emit('sessionExpired');
        return;
      }

      // Validate user data structure
      if (data.user && typeof data.user === 'object') {
        this.state = {
          user: this.validateUserData(data.user),
          isLoggedIn: !!data.user,
          lastActivity: data.lastActivity || Date.now(),
          expiresAt: data.expiresAt
        };
      }
    } catch (error) {
      console.error('[AuthManager] Error loading session:', error);
      this.clearSession();
    }
  }

  /**
   * Validate user data structure
   * Ensure required fields exist
   */
  static validateUserData(user) {
    const required = ['userId', 'email', 'displayName'];
    
    for (const field of required) {
      if (!user[field]) {
        console.warn(`[AuthManager] Missing required field: ${field}`);
        return null;
      }
    }

    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified || false,
      photoURL: user.photoURL || this.getDefaultAvatar(),
      whatsapp: user.whatsapp || '',
      authMethod: user.authMethod || 'email',
      verifiedAt: user.verifiedAt || Date.now()
    };
  }

  /**
   * Save session to storage
   */
  static saveSession(user) {
    try {
      if (!user) {
        this.clearSession();
        return;
      }

      const validatedUser = this.validateUserData(user);
      if (!validatedUser) {
        throw new Error('Invalid user data');
      }

      const expiresAt = Date.now() + this.SESSION_TIMEOUT;

      const data = {
        version: this.SESSION_VERSION,
        user: validatedUser,
        lastActivity: Date.now(),
        expiresAt
      };

      window[this.STORAGE_TYPE].setItem(this.SESSION_KEY, JSON.stringify(data));

      this.state = {
        user: validatedUser,
        isLoggedIn: true,
        lastActivity: Date.now(),
        expiresAt
      };

      this.emit('authChanged', validatedUser);
    } catch (error) {
      console.error('[AuthManager] Error saving session:', error);
      this.emit('authError', error);
    }
  }

  /**
   * Clear session
   */
  static clearSession() {
    window[this.STORAGE_TYPE].removeItem(this.SESSION_KEY);
    this.state = {
      user: null,
      isLoggedIn: false,
      lastActivity: null,
      expiresAt: null
    };
    this.emit('authChanged', null);
  }

  /**
   * Get current logged-in user
   */
  static getCurrentUser() {
    if (this.state.user && this.state.user.displayName && typeof this.state.user.displayName === 'string' && this.state.user.displayName.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(this.state.user.displayName);
        if (parsed.displayName) {
          this.state.user.displayName = parsed.displayName;
        }
        if (parsed.whatsapp) {
          this.state.user.whatsapp = parsed.whatsapp;
        }
      } catch (e) {}
    }
    return this.state.user;
  }

  /**
   * CRITICAL: Refresh user data from storage (NEW)
   * Call this when returning from email verification or other auth operations
   * to ensure you have the latest user data
   */
  static refreshUserData() {
    console.log('[AuthManager] Refreshing user data from storage...');
    this.loadSession();
    if (this.state.user && this.state.user.emailVerified) {
      console.log('✅ User verification status updated:', this.state.user);
      this.emit('authChanged', { user: this.state.user, isLoggedIn: true });
    }
    return this.state.user;
  }

  /**
   * Check if user is logged in
   */
  static isLoggedIn() {
    return this.state.isLoggedIn && this.state.user !== null;
  }

  /**
   * Get user ID
   */
  static getUserId() {
    return this.state.user?.userId || null;
  }

  /**
   * Update user data (after profile updates)
   */
  static updateUser(updates) {
    if (!this.isLoggedIn()) {
      throw new Error('No user logged in');
    }

    const updatedUser = {
      ...this.state.user,
      ...updates
    };

    this.saveSession(updatedUser);
  }

  /**
   * Setup session timeout
   */
  static setupSessionTimeout() {
    // Check expiration periodically (every 5 minutes)
    setInterval(() => {
      if (this.isLoggedIn() && this.state.expiresAt) {
        if (Date.now() > this.state.expiresAt) {
          this.clearSession();
          this.emit('sessionExpired');
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Setup activity tracker to extend session
   */
  static setupActivityTracker() {
    const updateActivity = () => {
      if (this.isLoggedIn()) {
        this.state.lastActivity = Date.now();
        // Extend expiration
        this.state.expiresAt = Date.now() + this.SESSION_TIMEOUT;
      }
    };

    // Track user activity
    document.addEventListener('click', updateActivity, { passive: true });
    document.addEventListener('keydown', updateActivity, { passive: true });
  }

  /**
   * Setup storage listener for multi-tab sync
   */
  static setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === this.SESSION_KEY) {
        this.loadSession();
      }
    });
  }

  /**
   * Get default avatar
   */
  static getDefaultAvatar() {
    return '/assets/img/avatar-default.svg';
  }

  /**
   * Event system
   */
  static on(eventName, handler) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].push(handler);
    }

    // Return unsubscribe function
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(h => h !== handler);
    };
  }

  static emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[AuthManager] Error in ${eventName} handler:`, error);
        }
      });
    }

    // Also dispatch custom event for global handling
    const event = new CustomEvent(`auth:${eventName}`, { detail: data });
    document.dispatchEvent(event);
  }

  /**
   * Expose state as read-only object
   */
  static getState() {
    return { ...this.state };
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AuthManager.init());
} else {
  AuthManager.init();
}
