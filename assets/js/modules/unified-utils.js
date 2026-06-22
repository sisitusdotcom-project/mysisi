/**
 * UNIFIED NOTIFICATIONS & UTILITIES
 * ===================================
 * Centralized notifications, helpers, and utility functions
 * - SweetAlert2 integration
 * - Consistent error/success messages
 * - Form validation helpers
 * - Time formatting utilities
 */

/**
 * Show success notification
 */
export function showSuccess(title = '', message = '') {
  return Swal.fire({
    icon: 'success',
    title: title || 'Sukses!',
    text: message,
    timer: 4000,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: false,
    position: 'center'
  });
}

/**
 * Show error notification
 */
export function showError(title = '', message = '') {
  return Swal.fire({
    icon: 'error',
    title: title || 'Terjadi Kesalahan',
    text: message,
    confirmButtonText: 'OK',
    confirmButtonColor: '#e74c3c'
  });
}

/**
 * Show warning notification
 */
export function showWarning(title = '', message = '') {
  return Swal.fire({
    icon: 'warning',
    title: title || 'Peringatan',
    text: message,
    confirmButtonText: 'OK'
  });
}

/**
 * Show info notification
 */
export function showInfo(title = '', message = '') {
  return Swal.fire({
    icon: 'info',
    title: title || 'Informasi',
    text: message,
    confirmButtonText: 'OK'
  });
}

/**
 * Show loading spinner
 */
export function showLoading(title = '', message = '') {
  Swal.fire({
    title: title || 'Memproses...',
    text: message || '',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen() {
      Swal.showLoading();
    }
  });
}

/**
 * Hide loading spinner
 */
export function hideLoading() {
  Swal.close();
}

/**
 * Show confirmation dialog
 */
export function showConfirm(message = '', onConfirm, onCancel) {
  return Swal.fire({
    icon: 'question',
    title: 'Konfirmasi',
    text: message,
    showCancelButton: true,
    confirmButtonText: 'Ya, Lanjutkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#2563EB',
    cancelButtonColor: '#6c757d'
  }).then(result => {
    if (result.isConfirmed) {
      onConfirm?.();
    } else {
      onCancel?.();
    }
  });
}

/**
 * Show toast notification (small, auto-dismiss)
 */
export function showToast(message = '', type = 'success') {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return Swal.fire({
    icon: type,
    title: message,
    toast: true,
    position: 'top-end',
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false
  });
}

// ========== FORM VALIDATION ==========

/**
 * Validate email format (RFC 5322 simplified)
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Enhanced email validation with stricter rules
 */
export function isValidEmailStrict(email) {
  // More comprehensive regex
  const regex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  return regex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 */
export function isValidPassword(password) {
  // Minimum 8 characters
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password minimal 8 karakter'
    };
  }

  // At least one uppercase, one lowercase, one number
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUpperCase) {
    return {
      valid: false,
      message: 'Password harus mengandung huruf besar'
    };
  }

  if (!hasLowerCase) {
    return {
      valid: false,
      message: 'Password harus mengandung huruf kecil'
    };
  }

  if (!hasNumber) {
    return {
      valid: false,
      message: 'Password harus mengandung angka'
    };
  }

  return { valid: true };
}

/**
 * Validate phone number (Indonesia) - Basic
 */
export function isValidPhoneNumber(phone) {
  // Accept formats: +628xxx, 628xxx, 08xxx
  // Synchronized with backend validation (gas.gs validatePhoneNumber function)
  const regex = /^(\+62|62|0)8\d{8,12}$/;
  return regex.test(phone.replace(/[\s\-]/g, ''));
}

/**
 * Validate domain format - Synchronized with backend validateDomainFormat
 * Frontend companion validation for consistency
 */
export function isValidDomain(domain) {
  // Remove protocol if present - match backend cleanup
  domain = domain.replace(/^https?:\/\//i, '').toLowerCase().trim();
  // Pattern matches backend validation: example.com, site.co.id, subdomain.site.co.id
  const regex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return regex.test(domain);
}

// ========== STRING UTILITIES ==========

/**
 * Format currency to Indonesian Rupiah
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format date to Indonesian format
 */
export function formatDate(date, format = 'long') {
  const dateObj = new Date(date);
  
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  return new Intl.DateTimeFormat('id-ID', options[format] || options.long).format(dateObj);
}

/**
 * Format time difference (e.g., "2 jam yang lalu")
 */
export function formatTimeAgo(date) {
  const now = new Date();
  const passed = now - new Date(date);
  const seconds = Math.floor(passed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'baru saja';
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours < 24) return `${hours} jam yang lalu`;
  if (days < 7) return `${days} hari yang lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu yang lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan yang lalu`;
  
  return `${Math.floor(days / 365)} tahun yang lalu`;
}

/**
 * Format price with IDR currency symbol
 */
export function formatPrice(value) {
  let formatted = formatCurrency(value);
  formatted = formatted.replace(/IDR|Rp/g, '').trim();
  return `Rp ${formatted}`;
}

/**
 * Format date and time
 */
export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str, length = 50) {
  if (str.length <= length) return str;
  return str.substr(0, length) + '...';
}

// ========== DOM UTILITIES ==========

/**
 * Set button loading state
 */
export function setButtonLoading(button, isLoading = true, loadingText = '⏳ Memproses...') {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || 'Submit';
    button.disabled = false;
  }
}

/**
 * Hide element with fade
 */
export function fadeOut(element, duration = 300) {
  return new Promise(resolve => {
    element.style.transition = `opacity ${duration}ms`;
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.display = 'none';
      resolve();
    }, duration);
  });
}

/**
 * Show element with fade
 */
export function fadeIn(element, duration = 300) {
  return new Promise(resolve => {
    element.style.display = 'block';
    element.style.transition = `opacity ${duration}ms`;
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.opacity = '1';
      resolve();
    }, 50);
  });
}

// ========== STORAGE UTILITIES ==========

/**
 * Get from localStorage with expiration support
 */
export function getStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const data = JSON.parse(item);
    
    // Check expiration
    if (data.expiresAt && Date.now() > data.expiresAt) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return data.value;
  } catch (error) {
    console.error(`[Storage] Error reading ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set in localStorage with optional expiration
 */
export function setStorage(key, value, expirationMinutes = null) {
  try {
    const data = {
      value,
      expiresAt: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : null
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[Storage] Error writing ${key}:`, error);
  }
}

/**
 * Remove from localStorage
 */
export function removeStorage(key) {
  localStorage.removeItem(key);
}

/**
 * Clear all localStorage
 */
export function clearAllStorage() {
  localStorage.clear();
}

// ========== API ERROR HANDLING ==========

/**
 * Get user-friendly error message from API response
 */
export function getErrorMessage(error) {
  if (typeof error === 'string') return error;

  if (error.message) return error.message;

  if (error.errors && Array.isArray(error.errors)) {
    return error.errors[0] || 'Terjadi kesalahan';
  }

  if (error.detail) return error.detail;

  return 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
}

/**
 * Handle API error and show notification
 */
export function handleAPIError(error, showNotification = true) {
  const message = getErrorMessage(error);
  
  console.error('[API Error]:', error);

  if (showNotification) {
    showError('Terjadi Kesalahan', message);
  }

  return message;
}

// ========== LOADING UTILITIES ==========

/**
 * Create and show loading overlay
 */
export function showLoadingOverlay(message = '') {
  let overlay = document.getElementById('loading-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="spinner"></div>
      ${message ? `<p>${message}</p>` : ''}
    `;
    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
export function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Initialize password toggle visibility feature for input[type="password"] elements
 */
export function initPasswordToggle(container = document) {
  const passwordInputs = container.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    // Prevent double wrapping/init
    if (input.dataset.passwordToggleInit) return;
    input.dataset.passwordToggleInit = 'true';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'password-input-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'block';
    wrapper.style.width = '100%';

    // Insert wrapper before input in the DOM tree
    input.parentNode.insertBefore(wrapper, input);
    // Move input inside wrapper
    wrapper.appendChild(input);

    // Ensure input has padding-right so text doesn't overlap the eye icon
    input.style.paddingRight = '40px';

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'password-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Tampilkan sandi');
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.right = '12px';
    toggleBtn.style.top = '50%';
    toggleBtn.style.transform = 'translateY(-50%)';
    toggleBtn.style.border = 'none';
    toggleBtn.style.background = 'none';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.color = '#64748b';
    toggleBtn.style.fontSize = '16px';
    toggleBtn.style.padding = '0';
    toggleBtn.style.margin = '0';
    toggleBtn.style.display = 'flex';
    toggleBtn.style.alignItems = 'center';
    toggleBtn.style.justifyContent = 'center';
    toggleBtn.style.zIndex = '5';

    // FontAwesome eye icon
    const icon = document.createElement('i');
    icon.className = 'fas fa-eye';
    toggleBtn.appendChild(icon);
    wrapper.appendChild(toggleBtn);

    // Event listener to toggle type
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
        toggleBtn.setAttribute('aria-label', 'Sembunyikan sandi');
      } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
        toggleBtn.setAttribute('aria-label', 'Tampilkan sandi');
      }
    });
  });
}

// ========== EXPORT ALL ==========

export const Utilities = {
  // Notifications
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  hideLoading,
  showConfirm,
  showToast,
  
  // Validation
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  isValidDomain,
  
  // String utilities
  formatCurrency,
  formatDate,
  formatTimeAgo,
  capitalize,
  truncate,
  
  // DOM utilities
  setButtonLoading,
  fadeOut,
  fadeIn,
  initPasswordToggle,
  
  // Storage
  getStorage,
  setStorage,
  removeStorage,
  clearAllStorage,
  
  // Error handling
  getErrorMessage,
  handleAPIError,
  
  // Loading
  showLoadingOverlay,
  hideLoadingOverlay
};

// ========== DOMAIN PACKAGES EXPORT ==========
// Re-export from api.config for consolidation
import { DOMAIN_PACKAGES } from '../config/api.config.js';
export { DOMAIN_PACKAGES };
