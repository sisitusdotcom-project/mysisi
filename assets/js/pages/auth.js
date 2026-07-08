/**
 * REFACTORED PUBLIC AUTHENTICATION PAGE
 * ===================================
 * Replace /assets/js/pages/auth.js with this clean, unified version
 * 
 * Uses:
 * - AuthManager: Centralized session state
 * - APIClient: Unified API calls
 * - Utils: Notifications & validation
 * 
 * Features:
 * - Email/Password registration & login
 * - Google OAuth integration
 * - Email verification with auto-login
 * - Clean error handling
 * - Loading states
 * - Multi-tab auth sync
 */

import { AuthManager } from '../modules/unified-auth.js';
import { CartManager } from '../modules/unified-cart.js';
import APIClient from '../modules/unified-api.js';
import {
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  setButtonLoading,
  handleAPIError,
  initPasswordToggle
} from '../modules/unified-utils.js';

// ============================================================================
// GLOBAL STATE - Define early
// ============================================================================

let googleSignInInitialized = false; // Guard against multiple initialization

/**
 * Handle Google OAuth response - Define EARLY before Google SDK loads
 * This must be on window object and defined before Google SDK tries to use it
 */
window.handleGoogleSignIn = async function(response) {
  if (!response.credential) {
    console.warn('[Auth Google] No credential in response');
    return;
  }

  try {
    showLoading('Google Sign-In', 'Memproses...');

    // Verify token with GAS
    const result = await APIClient.verifyGoogleToken(response.credential);

    if (!result.success) {
      throw new Error(result.message || 'Google Sign-In gagal');
    }

    if (!result.data) {
      throw new Error('Data user tidak ditemukan');
    }

    // Save session
    AuthManager.saveSession(result.data);

    hideLoading();
    showSuccess(
      '✓ Google Login Sukses!',
      `Selamat datang, ${result.data.displayName}!`
    );

    // Check if there's pending checkout in cart
    const cartSummary = CartManager.getSummary();
    let redirectUrl = result.data.role === 'admin' ? '/admin/' : '/dashboard/';
    
    if (cartSummary.itemCount > 0 && result.data.role !== 'admin') {
      // After login, redirect to CART to view domains + addons
      // NOT directly to checkout (user should see cart summary first)
      redirectUrl = `/dashboard/#!/dashboard/keranjang`;
    }

    // Redirect to appropriate page
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1500);
  } catch (error) {
    hideLoading();
    handleAPIError(error);
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', initPage);

function initPage() {


  // 1. Check for email verification token (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const verifyToken = urlParams.get('verify');

  if (verifyToken) {

    handleEmailVerification(verifyToken);
    return; // Stop further initialization
  }

  // 2. If already logged in, redirect to dashboard or admin
  if (AuthManager.isLoggedIn()) {
    window.location.href = AuthManager.getCurrentUser()?.role === 'admin' ? '/admin/' : '/dashboard/';
    return; // Stop further initialization
  }

  // 3. Initialize auth forms & UI
  setupAuthTabs();
  setupAuthForms();
  initializeGoogleSignIn();

  // Initialize password toggles
  initPasswordToggle(document);

  // Initialize password strength indicators
  initPasswordStrengthIndicators();

  // Initialize WhatsApp number validation
  initWhatsAppValidation();
}

// ============================================================================
// EMAIL VERIFICATION (Auto-login after registration)
// ============================================================================

/**
 * Handle email verification token from registration link
 */
async function handleEmailVerification(token) {
  const wrapper = document.querySelector('.auth-wrapper');

  try {
    // Show loading UI
    if (wrapper) {
      wrapper.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <h2 style="margin-bottom: 20px;">🔐 Verifikasi Email</h2>
          <p style="font-size: 16px; margin-bottom: 30px; color: #666;">
            ⏳ Sedang memverifikasi email Anda...
          </p>
          <div style="display: inline-block;">
            <div style="width: 50px; height: 50px; border: 4px solid #e0e0e0; border-top: 4px solid #2563EB; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </div>
      `;
    }

    // Call GAS to verify token
    const response = await APIClient.verifyEmailToken(token);

    if (!response.success) {
      throw new Error(response.message || 'Verifikasi email gagal');
    }

    if (!response.data) {
      throw new Error('Data user tidak ditemukan dalam response');
    }

    // Save session (auto-login)
    AuthManager.saveSession(response.data);

    // Show success message
    if (wrapper) {
      wrapper.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 60px; margin-bottom: 20px;">✓</div>
          <h2 style="color: #27ae60; margin-bottom: 10px;">Email Terverifikasi!</h2>
          <p style="font-size: 18px; color: #333; margin-bottom: 5px;">
            Selamat datang, <strong>${response.data.displayName}</strong>!
          </p>
          <p style="color: #666; margin-top: 20px;">
            Anda akan diarahkan ke dashboard dalam beberapa detik...
          </p>
          <div style="margin-top: 30px;">
            <div style="width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top: 4px solid #27ae60; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          </div>
        </div>
      `;
    }

    showSuccess('✓ Email Terverifikasi!', `Selamat datang, ${response.data.displayName}!`);

    // Check if there's pending checkout in cart
    const cartSummary = CartManager.getSummary();
    let redirectUrl = response.data.role === 'admin' ? '/admin/' : '/dashboard/';
    
    if (cartSummary.itemCount > 0 && response.data.role !== 'admin') {
      // After email verification, redirect to CART to view domains + addons
      // NOT directly to checkout (user should see cart summary first)
      redirectUrl = `/dashboard/#!/dashboard/keranjang`;
    }

    // Redirect to appropriate page after 2 seconds
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 2000);
  } catch (error) {

    // Show error UI
    if (wrapper) {
      wrapper.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 60px; margin-bottom: 20px;">✗</div>
          <h2 style="color: #e74c3c; margin-bottom: 10px;">Verifikasi Gagal</h2>
          <p style="font-size: 16px; color: #666; margin-bottom: 20px;">
            ${error.message || 'Terjadi kesalahan saat memverifikasi email'}
          </p>
          <p style="font-size: 14px; color: #999; margin-bottom: 30px;">
            Link verifikasi mungkin sudah expired atau tidak valid.
          </p>
          <a href="/auth/" style="display: inline-block; background-color: #2563EB; color: white; padding: 10px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Kembali ke Login
          </a>
        </div>
      `;
    }

    handleAPIError(error);
  }
}

// ============================================================================
// REGISTRATION FORM
// ============================================================================

/**
 * Handle registration form submission
 */
async function handleRegister(e) {
  e.preventDefault();

  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');

  try {
    // Get form values
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;
    const passwordConfirm = form.querySelector('input[name="passwordConfirm"]').value;
    const whatsapp = form.querySelector('input[name="whatsapp"]')?.value.trim() || '';
    const displayName = email.split('@')[0]; // Auto-generate from email

    // Validate input
    if (!isValidEmail(email)) {
      throw new Error('Email tidak valid');
    }

    if (!password) {
      throw new Error('Password diperlukan');
    }

    const pwdValidation = isValidPassword(password);
    if (!pwdValidation.valid) {
      throw new Error(pwdValidation.message);
    }

    if (password !== passwordConfirm) {
      throw new Error('Password dan konfirmasi password tidak sesuai');
    }

    if (whatsapp && !isValidPhoneNumber(whatsapp)) {
      throw new Error('Nomor WhatsApp tidak valid (format: 08xxxxxxxxxx, +62xxxxxxxxxx, atau 62xxxxxxxxxx)');
    }

    // Show loading state
    setButtonLoading(btn, true, '⏳ Mendaftar...');

    // Call API
    const response = await APIClient.registerUser(email, password, displayName, whatsapp);

    if (!response.success) {
      throw new Error(response.message || 'Registrasi gagal, silakan coba lagi');
    }

    // Show success message
    showSuccess(
      '✓ Registrasi Berhasil!',
      `Email verifikasi telah dikirim ke ${email}\n\nSilakan cek folder Inbox atau Spam Anda`
    );

    // Clear form
    form.reset();

    // Redirect to login tab after 3 seconds
    setTimeout(() => {
      switchTab('login');
    }, 3000);

  } catch (error) {
    handleAPIError(error);
    setButtonLoading(btn, false);
  }
}

// ============================================================================
// LOGIN FORM
// ============================================================================

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();

  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');

  try {
    // Get form values
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;

    // Validate
    if (!email || !password) {
      throw new Error('Email dan password diperlukan');
    }

    if (!isValidEmail(email)) {
      throw new Error('Email tidak valid');
    }

    // Show loading state
    setButtonLoading(btn, true, '⏳ Login...');

    // Call API
    const response = await APIClient.loginUser(email, password);

    if (!response.success) {
      throw new Error(response.message || 'Login gagal');
    }

    if (!response.data) {
      throw new Error('Data user tidak ditemukan');
    }

    // Save session
    AuthManager.saveSession(response.data);

    // Show success message
    showSuccess(
      '✓ Login Berhasil!',
      `Selamat datang kembali, ${response.data.displayName}!`
    );

    // Check if there's pending checkout in cart
    const cartSummary = CartManager.getSummary();
    let redirectUrl = response.data.role === 'admin' ? '/admin/' : '/dashboard/';
    
    if (cartSummary.itemCount > 0 && response.data.role !== 'admin') {
      // After login with cart items, redirect to CART to view domains + addons
      // NOT directly to checkout (user should see cart summary first)
      redirectUrl = `/dashboard/#!/dashboard/keranjang`;
      // Don't clear cart yet - user might see other items in cart
    }

    // Redirect to appropriate page
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1500);
  } catch (error) {
    handleAPIError(error);
    setButtonLoading(btn, false);
  }
}

// ============================================================================
// GOOGLE SIGN-IN
// ============================================================================

// window.handleGoogleSignIn is defined at the top of the file as a global
// to ensure it's available when Google SDK loads


function initializeGoogleSignIn() {
  // Guard: prevent multiple initialization
  if (googleSignInInitialized) {
    console.debug('[Auth Google] Already initialized, skipping');
    return;
  }

  // Mark as initializing to prevent race conditions
  googleSignInInitialized = true;

  const maxAttempts = 100; // 100 * 100ms = 10 seconds max
  let attempts = 0;

  const initGoogleSDK = () => {
    attempts++;

    // Check if Google SDK is loaded
    if (typeof google === 'undefined' || !google.accounts?.id) {
      if (attempts > maxAttempts) {
        console.error('[Auth Google] Google SDK failed to load after 10 seconds');
        googleSignInInitialized = false; // Reset flag on failure
        return;
      }
      setTimeout(initGoogleSDK, 100);
      return;
    }

    try {
      console.info('[Auth Google] SDK loaded, initializing...');

      // Initialize Google Sign-In
      google.accounts.id.initialize({
        client_id: '1077896753927-npj3ma45dsqrgqmp9bcrioumk6lneo60.apps.googleusercontent.com',
        callback: window.handleGoogleSignIn, // Uses global callback defined earlier
        auto_select: false,
        itp_support: false // Avoid third-party cookie conflicts
      });

      console.info('[Auth Google] Google Sign-In ready');
    } catch (error) {
      console.error('[Auth Google] Error initializing:', error.message);
      googleSignInInitialized = false; // Reset flag on error
    }
  };

  // Start initialization
  initGoogleSDK();
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Setup auth tab switching
 */
function setupAuthTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update active tab button
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update active form
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.toggle('active', form.id === `${tabName}-form`);
  });
}

/**
 * Setup form event listeners
 */
function setupAuthForms() {
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);

  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);

  }
}

/**
 * Initialize password strength indicators
 */
function initPasswordStrengthIndicators() {
  const registerPassword = document.getElementById('register-password');
  if (registerPassword) {
    registerPassword.addEventListener('input', () => {
      updatePasswordStrength(
        registerPassword.value,
        'register-password-strength',
        'register-strength-bar',
        'register-strength-text'
      );
    });
  }

  const loginPassword = document.getElementById('login-password');
  if (loginPassword) {
    loginPassword.addEventListener('input', () => {
      updatePasswordStrength(
        loginPassword.value,
        'login-password-strength',
        'login-strength-bar',
        'login-strength-text'
      );
    });
  }
}

/**
 * Calculate and display password strength
 */
function updatePasswordStrength(password, strengthDivId, strengthBarId, strengthTextId) {
  const strengthDiv = document.getElementById(strengthDivId);
  const strengthBar = document.getElementById(strengthBarId);
  const strengthText = document.getElementById(strengthTextId);

  if (!strengthDiv || !strengthBar || !strengthText) return;

  if (password.length === 0) {
    strengthDiv.style.display = 'none';
    return;
  }

  strengthDiv.style.display = 'block';

  let strength = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password)
  };

  strength = Object.values(checks).filter(Boolean).length;

  let className = '';
  let text = '';

  if (strength <= 1) {
    className = 'strength-weak';
    text = 'Password lemah';
  } else if (strength <= 2) {
    className = 'strength-fair';
    text = 'Password cukup';
  } else if (strength <= 3) {
    className = 'strength-good';
    text = 'Password kuat';
  } else {
    className = 'strength-strong';
    text = 'Password sangat kuat';
  }

  strengthBar.className = `strength-bar ${className}`;
  strengthBar.style.width = (strength * 20) + '%';
  strengthText.textContent = text;
}

/**
 * Initialize WhatsApp number validation
 */
function initWhatsAppValidation() {
  const whatsappInput = document.getElementById('register-whatsapp');
  if (whatsappInput) {
    whatsappInput.addEventListener('input', () => {
      updateWhatsAppValidation(
        whatsappInput.value,
        'register-phone-validation',
        'register-phone-bar',
        'register-phone-text'
      );
    });
  }
}

/**
 * Update WhatsApp validation display
 */
function updateWhatsAppValidation(value, validationDivId, barId, textId) {
  const div = document.getElementById(validationDivId);
  const barEl = document.getElementById(barId);
  const textEl = document.getElementById(textId);
  
  if (!div || !barEl || !textEl) return;

  if (value.length === 0) {
    div.style.display = 'none';
    return;
  }

  div.style.display = 'block';

  const cleanValue = value.replace(/[\s\-+]/g, '');

  if (isValidPhoneNumber(value)) {
    barEl.className = 'strength-bar strength-strong';
    barEl.style.width = '100%';
    textEl.style.color = '#10b981'; // Green
    textEl.innerHTML = '<i class="fas fa-check-circle"></i> Format WhatsApp valid';
  } else if (cleanValue.length >= 5) {
    barEl.className = 'strength-bar strength-fair';
    barEl.style.width = '50%';
    textEl.style.color = '#f59e0b'; // Orange
    textEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Format tidak valid. Gunakan format Indonesia (contoh: 0812xxxxxx)';
  } else {
    barEl.className = 'strength-bar strength-weak';
    barEl.style.width = '25%';
    textEl.style.color = '#ef4444'; // Red
    textEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Nomor terlalu pendek';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  handleRegister,
  handleLogin,
  handleEmailVerification
};
