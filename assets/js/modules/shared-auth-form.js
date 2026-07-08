/**
 * SHARED AUTH FORM MODULE
 * ===================================
 * Reusable login/register form for:
 * - /auth/ (standalone page)
 * - /cart/ (inline checkout form)
 * 
 * Features:
 * - Register + Login tabs
 * - Email verification flow
 * - Password reset links
 * - Google Sign-In integration
 * - Inline or standalone usage
 */

import { AuthManager } from '/assets/js/modules/unified-auth.js';
import APIClient from '/assets/js/modules/unified-api.js';
import { showSuccess, showError, showLoading, hideLoading, isValidEmail, isValidPassword, isValidPhoneNumber, initPasswordToggle } from '/assets/js/modules/unified-utils.js';

export class SharedAuthForm {
  constructor(options = {}) {
    this.options = {
      containerId: 'auth-form-container',
      showGoogleSignIn: true,
      showPrivacyNotice: true,
      inlineMode: false, // true for cart, false for /auth/
      onLoginSuccess: null,
      onRegisterSuccess: null,
      ...options
    };
    
    this.container = null;
    this.state = {
      currentTab: 'register',
      isSubmitting: false,
      isValidatingEmail: false
    };
  }

  /**
   * Initialize and render form
   */
  render() {
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      console.error(`[SharedAuthForm] Container #${this.options.containerId} not found`);
      return;
    }

    this.renderFormHTML();
    this.setupEventListeners();
    this.initGoogleSignIn();
  }

  /**
   * Explicitly initialize Google Sign-In for dynamic rendering
   */
  initGoogleSignIn() {
    if (!this.options.showGoogleSignIn) return;

    if (window.google && window.google.accounts && window.google.accounts.id) {
      const gBtnContainer = this.container.querySelector('.g_id_signin');
      if (gBtnContainer) {
        window.google.accounts.id.initialize({
          client_id: "1077896753927-npj3ma45dsqrgqmp9bcrioumk6lneo60.apps.googleusercontent.com",
          callback: window.handleGoogleSignIn
        });
        
        window.google.accounts.id.renderButton(
          gBtnContainer,
          { theme: "outline", size: "large", type: "standard", shape: "rectangular", logo_alignment: "left", width: 400 }
        );
      }
    } else {
      // Retry in case the Google script hasn't fully loaded yet
      setTimeout(() => this.initGoogleSignIn(), 500);
    }
  }

  /**
   * Generate form HTML
   */
  renderFormHTML() {
    const inlineClass = this.options.inlineMode ? 'inline' : '';
    
    this.container.innerHTML = `
      <div class="shared-auth-form ${inlineClass}">
        <!-- Form Header -->
        <div class="auth-form-header">
          <h2>${this.options.inlineMode ? 'Masuk ke Akun Anda' : 'Login & Daftar'}</h2>
          ${this.options.inlineMode ? '<p class="auth-form-subtitle">Silakan login untuk melanjutkan checkout</p>' : ''}
        </div>

        <!-- Tabs (only show if not inline) -->
        ${!this.options.inlineMode ? `
          <div class="auth-tabs">
            <button class="tab-btn active" data-tab="register">Buat Akun Baru</button>
            <button class="tab-btn" data-tab="login">Sudah Punya Akun?</button>
          </div>
        ` : ''}

        <!-- Error/Success Messages -->
        <div class="form-error" id="auth-error" style="display: none;"></div>
        <div class="form-success" id="auth-success" style="display: none;"></div>

        <!-- Google Sign-In Button -->
        ${this.options.showGoogleSignIn ? `
          <div style="margin-top: 20px; display: flex; justify-content: center; width: 100%;">
            <div id="g_id_onload"
              data-client_id="1077896753927-npj3ma45dsqrgqmp9bcrioumk6lneo60.apps.googleusercontent.com"
              data-callback="handleGoogleSignIn">
            </div>
            <div class="g_id_signin" data-type="standard" data-size="large" data-theme="outline" data-text="signin_with" data-shape="rectangular" data-logo_alignment="left"></div>
          </div>
          <!-- Divider -->
          <div class="auth-divider" style="text-align: center; margin: 20px 0; color: #999; font-size: 14px;">atau dengan email</div>
        ` : ''}

        <!-- Register Form -->
        <form class="auth-form register-form ${!this.options.inlineMode ? 'active' : ''}" id="register-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required placeholder="nama@example.com">
            <small>Kami akan mengirim link verifikasi ke email ini</small>
          </div>
          
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" id="register-password-shared" required placeholder="Minimal 8 karakter">
            <div class="password-strength" id="register-password-strength-shared" style="display: none; margin-top: 8px;">
              <div class="strength-meter" style="width: 100%; height: 4px; background: #eee; border-radius: 2px; margin-bottom: 5px; overflow: hidden;">
                <div class="strength-bar" id="register-strength-bar-shared" style="height: 100%; width: 0%; transition: all 0.3s; border-radius: 2px;"></div>
              </div>
              <div class="strength-text" id="register-strength-text-shared" style="font-size: 11px; color: #94a3b8;"></div>
            </div>
            <small>Kombinasi huruf, angka, dan simbol lebih aman</small>
          </div>

          <div class="form-group">
            <label>Konfirmasi Password</label>
            <input type="password" name="passwordConfirm" required placeholder="Ulangi password Anda">
          </div>
          
          <div class="form-group">
            <label>Nama Lengkap</label>
            <input type="text" name="displayName" required placeholder="Contoh: John Doe">
          </div>

          <div class="form-group">
            <label>Nomor WhatsApp <span class="optional">(opsional)</span></label>
            <input type="tel" name="whatsapp" id="register-whatsapp-shared" placeholder="Contoh: 081234567890">
            <div class="phone-validation" id="register-phone-validation-shared" style="display: none; margin-top: 8px;">
              <div class="strength-meter" style="width: 100%; height: 4px; background: #eee; border-radius: 2px; margin-bottom: 5px; overflow: hidden;">
                <div class="strength-bar" id="register-phone-bar-shared" style="height: 100%; width: 0%; transition: all 0.3s; border-radius: 2px;"></div>
              </div>
              <div class="strength-text" id="register-phone-text-shared" style="font-size: 11px; color: #94a3b8;"></div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="width: 100%; padding: 14px; margin-bottom: 15px;">
            <i class="fas fa-user-plus"></i> Buat Akun
          </button>

          <div style="text-align: center; margin-top: 15px; font-size: 14px;">
            Sudah punya akun? <a href="#" class="switch-to-login" style="color: #2563EB; text-decoration: none; font-weight: bold;">Login di sini</a>
          </div>
        </form>

        <!-- Login Form -->
        <form class="auth-form login-form" id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required placeholder="nama@example.com">
          </div>
          
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" id="login-password-shared" required placeholder="Masukkan password Anda">
            <div class="password-strength" id="login-password-strength-shared" style="display: none; margin-top: 8px;">
              <div class="strength-meter" style="width: 100%; height: 4px; background: #eee; border-radius: 2px; margin-bottom: 5px; overflow: hidden;">
                <div class="strength-bar" id="login-strength-bar-shared" style="height: 100%; width: 0%; transition: all 0.3s; border-radius: 2px;"></div>
              </div>
              <div class="strength-text" id="login-strength-text-shared" style="font-size: 11px; color: #94a3b8;"></div>
            </div>
          </div>

          <div class="form-actions">
            <a href="#" class="forgot-password-link" style="text-decoration: none; color: #2563EB; font-size: 14px;">
              <i class="fas fa-question-circle"></i> Lupa Password?
            </a>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="width: 100%; padding: 14px; margin-bottom: 15px;">
            <i class="fas fa-sign-in-alt"></i> Login
          </button>

          <div style="text-align: center; margin-top: 15px; font-size: 14px;">
            Belum punya akun? <a href="#" class="switch-to-register" style="color: #2563EB; text-decoration: none; font-weight: bold;">Daftar di sini</a>
          </div>
        </form>

        <!-- Forgot Password Form -->
        <form class="auth-form forgot-password-form" id="forgot-password-form">
          <div class="forgot-header" style="text-align: center; margin-bottom: 20px;">
            <h3>Lupa Password?</h3>
            <p style="color: #666; font-size: 14px;">Masukkan email Anda untuk menerima link reset password</p>
          </div>
          <div class="form-group">
            <label>Alamat Email</label>
            <input type="email" name="email" required placeholder="nama@example.com">
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="width: 100%; padding: 14px; margin-bottom: 15px;">
            <i class="fas fa-paper-plane"></i> Kirim Link Reset
          </button>
          
          <div style="text-align: center; margin-top: 15px; font-size: 14px;">
            <a href="#" class="back-to-login-link" style="text-decoration: none; color: #2563EB; font-size: 14px;">
              <i class="fas fa-arrow-left"></i> Kembali ke Login
            </a>
          </div>
        </form>



        <!-- Privacy Notice -->
        ${this.options.showPrivacyNotice ? `
          <div class="auth-privacy" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
            <p style="margin: 0;">
              Dengan membuat akun, Anda setuju dengan 
              <a href="/perusahaan/legal/" target="_blank" style="color: #2563EB; text-decoration: none;">Ketentuan Layanan</a> dan 
              <a href="/perusahaan/legal/" target="_blank" style="color: #2563EB; text-decoration: none;">Kebijakan Privasi</a> kami.
            </p>
          </div>
        ` : ''}

        <style>
          .shared-auth-form {
            width: 100%;
          }

          .auth-form-header h2 {
            margin: 0 0 10px 0;
            font-size: ${this.options.inlineMode ? '20px' : '24px'};
            font-weight: bold;
          }

          .auth-form-subtitle {
            margin: 0 0 20px 0;
            color: #666;
            font-size: 14px;
          }

          .auth-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
          }

          .tab-btn {
            padding: 12px 20px;
            border: none;
            background: none;
            color: #666;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
          }

          .tab-btn.active {
            color: #2563EB;
            border-bottom-color: #2563EB;
          }

          .tab-btn:hover {
            color: #2563EB;
          }

          .auth-form {
            display: none;
          }

          .auth-form.active {
            display: block;
          }

          .form-group {
            margin-bottom: 15px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 14px;
          }

          .form-group input,
          .form-group textarea {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
            font-family: inherit;
          }

          .form-group input:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #2563EB;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }

          .form-group small {
            display: block;
            margin-top: 4px;
            color: #999;
            font-size: 12px;
          }

          .optional {
            color: #999;
            font-weight: normal;
          }

          .form-actions {
            text-align: right;
            margin-bottom: 15px;
          }

          .form-error {
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 12px;
            border-radius: 5px;
            font-size: 14px;
            margin-bottom: 15px;
          }

          .form-success {
            background: #efe;
            border: 1px solid #cfc;
            color: #3c3;
            padding: 12px;
            border-radius: 5px;
            font-size: 14px;
            margin-bottom: 15px;
          }

          .btn {
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
            display: inline-block;
            text-align: center;
          }

          .btn-primary {
            background-color: #2563EB;
            color: white;
          }

          .btn-primary:hover {
            background-color: #1d4ed8;
          }

          .btn-primary:disabled {
            background-color: #999;
            cursor: not-allowed;
          }

          .btn-block {
            width: 100%;
          }

          .g_id_signin {
            margin: 15px 0 !important;
          }

          @media (max-width: 768px) {
            .auth-tabs {
              flex-direction: column;
            }

            .tab-btn {
              width: 100%;
              text-align: left;
              border-bottom: 2px solid transparent !important;
              border-left: 3px solid transparent;
            }

            .tab-btn.active {
              border-left-color: #2563EB !important;
              border-bottom: none !important;
            }
          }
        </style>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tab switching
    if (!this.options.inlineMode) {
      const tabBtns = this.container.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
      });
    }

    // Toggle links for switching view inline (especially in inline mode)
    const toLoginBtns = this.container.querySelectorAll('.switch-to-login, .back-to-login-link');
    toLoginBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab('login');
      });
    });

    const toRegisterBtns = this.container.querySelectorAll('.switch-to-register');
    toRegisterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab('register');
      });
    });

    const forgotPasswordLinks = this.container.querySelectorAll('.forgot-password-link');
    forgotPasswordLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab('forgot-password');
      });
    });

    // Register form
    const registerForm = this.container.querySelector('#register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Login form
    const loginForm = this.container.querySelector('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Forgot password form
    const forgotForm = this.container.querySelector('#forgot-password-form');
    if (forgotForm) {
      forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
    }

    // Show register form by default in inline mode
    if (this.options.inlineMode) {
      const registerForm = this.container.querySelector('.register-form');
      const loginForm = this.container.querySelector('.login-form');
      const forgotForm = this.container.querySelector('.forgot-password-form');
      if (registerForm) registerForm.classList.add('active');
      if (loginForm) loginForm.classList.remove('active');
      if (forgotForm) forgotForm.classList.remove('active');
    }

    // Auto-show login tab if coming from forgot password
    if (window.location.hash === '#!login') {
      this.switchTab('login');
    }

    // Initialize password toggles
    initPasswordToggle(this.container);

    // Initialize password strength indicators
    this.initPasswordStrengthIndicators();

    // Initialize WhatsApp validation
    this.initWhatsAppValidation();
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    this.state.currentTab = tabName;

    // Update tab buttons
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });

    // Update forms
    const forms = this.container.querySelectorAll('.auth-form');
    forms.forEach(form => {
      form.classList.remove('active');
      if (form.classList.contains(`${tabName}-form`)) {
        form.classList.add('active');
      }
    });

    // Clear messages
    this.clearMessages();
  }

  /**
   * Handle forgot password form submission inline
   */
  async handleForgotPassword(e) {
    e.preventDefault();

    if (this.state.isSubmitting) return;

    const form = e.target;
    const email = form.querySelector('input[name="email"]').value.trim();

    if (!isValidEmail(email)) {
      this.showError('Email tidak valid');
      return;
    }

    try {
      this.state.isSubmitting = true;
      this.setSubmitButtonLoading(form, true, 'Mengirim...');

      const result = await APIClient.requestPasswordReset(email);

      if (!result.success) {
        throw new Error(result.message || 'Gagal mengirim link reset password');
      }

      this.showSuccess('✓ Email Terkirim!', 'Silakan cek inbox/spam email Anda.');
      form.reset();

    } catch (error) {
      console.error('Forgot password error:', error);
      this.showError(error.message || 'Terjadi kesalahan');
    } finally {
      this.state.isSubmitting = false;
      this.setSubmitButtonLoading(form, false);
    }
  }

  /**
   * Handle register form submission
   */
  async handleRegister(e) {
    e.preventDefault();

    if (this.state.isSubmitting) return;

    const form = e.target;
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;
    const passwordConfirm = form.querySelector('input[name="passwordConfirm"]').value;
    const displayName = form.querySelector('input[name="displayName"]').value.trim();
    const whatsapp = form.querySelector('input[name="whatsapp"]')?.value.trim() || '';

    // Validation
    if (!isValidEmail(email)) {
      this.showError('Email tidak valid');
      return;
    }

    const pwdValidation = isValidPassword(password);
    if (!pwdValidation.valid) {
      this.showError(pwdValidation.message);
      return;
    }

    if (password !== passwordConfirm) {
      this.showError('Password tidak cocok');
      return;
    }

    if (!displayName) {
      this.showError('Nama lengkap diperlukan');
      return;
    }

    if (whatsapp && !isValidPhoneNumber(whatsapp)) {
      this.showError('Nomor WhatsApp tidak valid');
      return;
    }

    try {
      this.state.isSubmitting = true;
      this.setSubmitButtonLoading(form, true, 'Membuat akun...');

      // Call register API
      const result = await APIClient.registerUser(email, password, displayName, whatsapp);

      if (!result.success) {
        throw new Error(result.message || 'Registrasi gagal');
      }

      this.showSuccess('✓ Registrasi Berhasil!', 'Silakan buka email Anda untuk verifikasi akun');

      // Auto-login after successful registration
      setTimeout(() => {
        // Save session if API returns user data
        if (result.data) {
          const userData = {
            userId: result.data.userId,
            email: result.data.email || email,
            displayName: result.data.displayName || displayName,
            whatsapp: result.data.whatsapp || whatsapp || '',
            photoURL: result.data.photoURL || '',
            authMethod: result.data.authMethod || 'email',
            emailVerified: result.data.emailVerified || false
          };
          
          AuthManager.saveSession(userData);

          // Call success callback
          if (this.options.onRegisterSuccess) {
            this.options.onRegisterSuccess(userData);
          } else {
            // Default: redirect to verify email page
            window.location.href = '/auth/verify-email.html?sent=true';
          }
        }
      }, 1500);

    } catch (error) {
      console.error('Register error:', error);
      this.showError(error.message || 'Terjadi kesalahan saat registrasi');
    } finally {
      this.state.isSubmitting = false;
      this.setSubmitButtonLoading(form, false);
    }
  }

  /**
   * Handle login form submission
   */
  async handleLogin(e) {
    e.preventDefault();

    if (this.state.isSubmitting) return;

    const form = e.target;
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;

    // Validation
    if (!isValidEmail(email)) {
      this.showError('Email tidak valid');
      return;
    }

    if (!password) {
      this.showError('Password diperlukan');
      return;
    }

    try {
      this.state.isSubmitting = true;
      this.setSubmitButtonLoading(form, true, 'Login...');

      // Call login API
      const result = await APIClient.loginUser(email, password);

      if (!result.success) {
        throw new Error(result.message || 'Login gagal');
      }

      if (!result.data) {
        throw new Error('Data pengguna tidak ditemukan');
      }

      // CHECK: Email verification status - Bypassed to allow direct login
      // if (!result.data.emailVerified) {
      //   this.showError('Email Anda belum terverifikasi. Silakan cek email untuk link verifikasi.');
      //   return;
      // }

      // Save session
      AuthManager.saveSession(result.data);

      this.showSuccess('✓ Login Berhasil!', `Selamat datang, ${result.data.displayName}!`);

      // Call success callback
      setTimeout(() => {
        if (this.options.onLoginSuccess) {
          this.options.onLoginSuccess(result.data);
        } else {
          // Default: redirect to dashboard or admin
          window.location.href = result.data.role === 'admin' ? '/admin/' : '/dashboard/';
        }
      }, 1500);

    } catch (error) {
      console.error('Login error:', error);
      this.showError(error.message || 'Terjadi kesalahan saat login');
    } finally {
      this.state.isSubmitting = false;
      this.setSubmitButtonLoading(form, false);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = this.container.querySelector('#auth-error');
    const successDiv = this.container.querySelector('#auth-success');
    
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    if (successDiv) {
      successDiv.style.display = 'none';
    }
  }

  /**
   * Show success message
   */
  showSuccess(title, message = '') {
    const successDiv = this.container.querySelector('#auth-success');
    const errorDiv = this.container.querySelector('#auth-error');
    
    if (successDiv) {
      successDiv.innerHTML = `<strong>${title}</strong>${message ? '<br>' + message : ''}`;
      successDiv.style.display = 'block';
    }

    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  /**
   * Clear messages
   */
  clearMessages() {
    const errorDiv = this.container.querySelector('#auth-error');
    const successDiv = this.container.querySelector('#auth-success');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
  }

  /**
   * Set submit button loading state
   */
  setSubmitButtonLoading(form, isLoading, loadingText = 'Loading...') {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = loadingText;
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || 'Submit';
    }
  }

  /**
   * Initialize password strength indicators
   */
  initPasswordStrengthIndicators() {
    const registerPassword = this.container.querySelector('#register-password-shared');
    if (registerPassword) {
      registerPassword.addEventListener('input', () => {
        this.updatePasswordStrength(
          registerPassword.value,
          'register-password-strength-shared',
          'register-strength-bar-shared',
          'register-strength-text-shared'
        );
      });
    }

    const loginPassword = this.container.querySelector('#login-password-shared');
    if (loginPassword) {
      loginPassword.addEventListener('input', () => {
        this.updatePasswordStrength(
          loginPassword.value,
          'login-password-strength-shared',
          'login-strength-bar-shared',
          'login-strength-text-shared'
        );
      });
    }
  }

  /**
   * Calculate and display password strength
   */
  updatePasswordStrength(password, strengthDivId, strengthBarId, strengthTextId) {
    const strengthDiv = this.container.querySelector(`#${strengthDivId}`);
    const strengthBar = this.container.querySelector(`#${strengthBarId}`);
    const strengthText = this.container.querySelector(`#${strengthTextId}`);

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
  initWhatsAppValidation() {
    const whatsappInput = this.container.querySelector('#register-whatsapp-shared');
    if (whatsappInput) {
      whatsappInput.addEventListener('input', () => {
        this.updateWhatsAppValidation(
          whatsappInput.value,
          'register-phone-validation-shared',
          'register-phone-bar-shared',
          'register-phone-text-shared'
        );
      });
    }
  }

  /**
   * Update WhatsApp validation display
   */
  updateWhatsAppValidation(value, validationDivId, barId, textId) {
    const div = this.container.querySelector(`#${validationDivId}`);
    const barEl = this.container.querySelector(`#${barId}`);
    const textEl = this.container.querySelector(`#${textId}`);
    
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
}

export default SharedAuthForm;
