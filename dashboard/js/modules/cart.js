/**
 * CART PAGE MODULE - ENHANCED VERSION
 * ===================================
 * Complete cart management for checkout flow
 * 
 * Features:
 * - Inline authentication (register + login)
 * - Promo code validation
 * - Email verification enforcement
 * - Order creation + midtrans payment
 * - Full checkout flow
 * 
 * Flow:
 * 1. Guest views cart + inline login (SharedAuthForm)
 * 2. User registers/logins + verifies email
 * 3. User applies promo code (optional)
 * 4. User clicks "Lanjut Bayar" → creates order → midtrans payment
 * 5. Payment success → redirected to /invoice/{order_id}
 */

import { CartManager, WishlistManager } from '/assets/js/modules/unified-cart.js';
import { showSuccess, showError, showInfo, formatPrice, isValidEmail } from '/assets/js/modules/unified-utils.js';
import APIClient from '/assets/js/modules/unified-api.js';
import { AuthManager } from '/assets/js/modules/unified-auth.js';
import SharedAuthForm from '/assets/js/modules/shared-auth-form.js';
import { ADDON_PACKAGES } from '/assets/js/config/api.config.js';

// ============================================================================
// CART STATE MANAGEMENT
// ============================================================================

let cartState = {
  container: null,
  currentUser: null,
  userId: null,
  userEmail: null,
  emailVerified: false,
  
  // Promo state
  promoCode: null,
  promoDiscount: 0,
  promoValidated: false,
  isValidatingPromo: false,
  
  // UI state
  isProcessingCheckout: false
};

/**
 * MAIN RENDER FUNCTION
 * Entry point for cart page rendering
 */
export async function render(currentUser) {
  try {
    cartState.container = document.getElementById('cart-container');
    if (!cartState.container) {
      console.error('[Cart] #cart-container not found');
      return;
    }

    // CRITICAL: Refresh user data from storage in case they just verified email
    if (!currentUser) {
      AuthManager.refreshUserData();  // NEW: Load latest user session
    }

    cartState.currentUser = currentUser || AuthManager.getCurrentUser();
    if (cartState.currentUser) {
      cartState.userId = cartState.currentUser.userId;
      cartState.userEmail = cartState.currentUser.email;
      cartState.emailVerified = cartState.currentUser.emailVerified || false;
    } else {
      cartState.userId = null;
      cartState.userEmail = null;
      cartState.emailVerified = false;
    }
    
    // Register background verification check listeners once
    if (!window.cartListenersRegistered) {
      window.cartListenersRegistered = true;
      
      const checkVerificationStatus = () => {
        const user = AuthManager.getCurrentUser();
        if (user && user.emailVerified && (!cartState.currentUser || !cartState.currentUser.emailVerified)) {
          console.log('[Cart] Auto-detecting email verification success in background!');
          cartState.currentUser = user;
          cartState.userId = user.userId;
          cartState.userEmail = user.email;
          cartState.emailVerified = true;
          render(user);
        }
      };

      window.addEventListener('focus', checkVerificationStatus);
      window.addEventListener('storage', (e) => {
        if (e.key === 'sisitus_user') {
          checkVerificationStatus();
        }
      });
    }
    
    // Initialize auth if not already done
    if (!AuthManager.isLoggedIn && !cartState.currentUser) {
      AuthManager.init();
    }

    // Load saved promo if exists
    loadSavedPromo();

    // Route based on auth state
    if (!cartState.currentUser) {
      // Guest: show inline auth + cart preview
      if (cartState.verificationPollInterval) {
        clearInterval(cartState.verificationPollInterval);
        cartState.verificationPollInterval = null;
      }
      renderGuestCheckout();
    } else if (!cartState.currentUser.emailVerified) {
      // Logged in but not verified: show verification message
      renderEmailVerificationPrompt();
    } else if (CartManager.isEmpty()) {
      // Empty cart
      if (cartState.verificationPollInterval) {
        clearInterval(cartState.verificationPollInterval);
        cartState.verificationPollInterval = null;
      }
      renderEmptyCart();
    } else {
      // Authenticated + verified: show full cart
      if (cartState.verificationPollInterval) {
        clearInterval(cartState.verificationPollInterval);
        cartState.verificationPollInterval = null;
      }
      renderAuthenticatedCart();
    }

  } catch (error) {
    console.error('[Cart] Error rendering:', error);
    showError('Error', error.message);
    cartState.container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h2>❌ Error</h2>
        <p>${error.message}</p>
        <a href="/" class="btn" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          Kembali ke Beranda
        </a>
      </div>
    `;
  }
}

// ============================================================================
// GUEST CHECKOUT - INLINE AUTH + CART PREVIEW
// ============================================================================

function renderGuestCheckout() {
  cartState.container.innerHTML = `
    <div class="page-container">
      <div class="cart-page guest-checkout-grid">
        
        <!-- Cart Preview Container -->
        <div id="cart-preview-container"></div>

        <!-- Auth Form Container -->
        <div>
          <div id="shared-auth-form-container"></div>
        </div>

      </div>
    </div>
  `;

  // Function to render the cart preview card reactively
  const updateCartPreview = () => {
    const cartData = CartManager.getCart();
    const items = (cartData && cartData.domains) || [];
    const addons = (cartData && cartData.addons) || [];
    const summary = CartManager.getSummary();

    const domainSubtotal = summary.subtotal;
    const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    const subtotalCombined = domainSubtotal + addonsTotal;
    const ppn = Math.round(subtotalCombined * 0.11);
    const promoDiscount = cartState.promoDiscount || 0;
    const finalTotal = subtotalCombined + ppn - promoDiscount;

    const previewContainer = document.getElementById('cart-preview-container');
    if (!previewContainer) return;

    previewContainer.innerHTML = `
      <div class="cart-preview">
        <h3 class="preview-title">
          <i class="fas fa-shopping-cart"></i> Preview Keranjang
        </h3>
        <div class="preview-body" style="background: var(--bg-white); border: 1px solid var(--border-light); border-radius: var(--radius); padding: clamp(1rem, 2vw, 1.25rem);">
          ${items.length > 0 ? `
            <div class="preview-items" style="border-bottom: 1px solid var(--border-light); margin-bottom: 1rem; padding-bottom: 0.5rem;">
              ${items.map(item => `
                <div class="preview-item" style="align-items: center; padding: 0.75rem 0; border-bottom: 1px dashed var(--border-light); display: flex; justify-content: space-between; gap: 1rem;">
                  <div style="flex: 1;">
                    <div class="preview-item-name" style="font-family: 'Courier New', monospace; font-weight: 700; color: var(--text-primary); font-size: 14px;">${item.domain}</div>
                    <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
                      <span style="background: #e3f2fd; color: var(--primary-blue); padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${item.package ? item.package.toUpperCase() : 'STARTER'}</span>
                      <span class="preview-item-meta" style="color: var(--text-light); font-size: 11px;">${item.duration || 1} tahun</span>
                    </div>
                  </div>
                  <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <div class="preview-item-price" style="font-weight: 700; color: var(--primary-blue); font-family: 'Courier New', monospace;">${formatPrice(item.price * (item.duration || 1))}</div>
                    <button onclick="window.removeGuestCartItem('${item.domain}')" style="background: none; border: none; color: #ef4444; font-size: 11px; cursor: pointer; padding: 2px 0; display: flex; align-items: center; gap: 4px;">
                      <i class="fas fa-trash-alt"></i> Hapus
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>

            ${addons.length > 0 ? `
              <div class="preview-addons" style="border-bottom: 1px solid var(--border-light); margin-bottom: 1rem; padding-bottom: 0.5rem;">
                <h4 style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.5px;">Layanan Tambahan</h4>
                ${addons.map(addon => `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 12px;">
                    <div>
                      <div style="font-weight: 600; color: var(--text-primary);">${addon.name}</div>
                      <div style="color: var(--text-light); font-size: 10px;">${addon.duration} tahun</div>
                    </div>
                    <div style="font-weight: 700; color: var(--primary-blue); font-family: 'Courier New', monospace;">${formatPrice(addon.price)}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Detailed Price Breakdown -->
            <div class="preview-breakdown" style="font-size: 13px; color: var(--text-secondary); line-height: 1.6; border-bottom: 2px solid var(--border-light); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                <span>Domain (${items.length}):</span>
                <span style="font-family: 'Courier New', monospace; font-weight: 600; color: var(--text-primary);">${formatPrice(domainSubtotal)}</span>
              </div>
              ${addonsTotal > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                  <span>Layanan Tambahan:</span>
                  <span style="font-family: 'Courier New', monospace; font-weight: 600; color: var(--text-primary);">${formatPrice(addonsTotal)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem; font-weight: 600;">
                <span>Subtotal:</span>
                <span style="font-family: 'Courier New', monospace; color: var(--text-primary);">${formatPrice(subtotalCombined)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                <span>PPN (11%):</span>
                <span style="font-family: 'Courier New', monospace; font-weight: 600; color: var(--text-primary);">${formatPrice(ppn)}</span>
              </div>
              ${promoDiscount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem; color: #27ae60;">
                  <span>Diskon Promo:</span>
                  <span style="font-family: 'Courier New', monospace; font-weight: 600;">-${formatPrice(promoDiscount)}</span>
                </div>
              ` : ''}
            </div>

            <div class="preview-total" style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: var(--primary-blue);">
              <span>Total Pembayaran:</span>
              <span style="font-family: 'Courier New', monospace;">${formatPrice(finalTotal)}</span>
            </div>
          ` : '<div class="preview-empty">Keranjang kosong</div>'}
        </div>
      </div>
    `;
  };

  // Initial render of preview
  updateCartPreview();

  // Initialize SharedAuthForm with callbacks
  const authForm = new SharedAuthForm({
    containerId: 'shared-auth-form-container',
    inlineMode: true,
    showGoogleSignIn: true,
    showPrivacyNotice: true,
    onLoginSuccess: handleAuthSuccess,
    onRegisterSuccess: handleAuthSuccess
  });
  authForm.render();

  // Add GiveNamespace handlers
  window.handleGoogleSignIn = handleGoogleSignIn;

  // Expose guest cart item remover that updates DOM dynamically without losing form inputs
  window.removeGuestCartItem = (domain) => {
    CartManager.remove(domain);
    updateCartPreview();
  };
}

/**
 * Handle successful authentication
 * User logged in from inline form
 */
async function handleAuthSuccess(userData) {
  try {
    console.log('[Cart] Auth success, userData:', userData);

    // Save to auth manager
    AuthManager.saveSession(userData);
    
    // Update cart state
    cartState.currentUser = userData;
    cartState.userId = userData?.userId;
    cartState.userEmail = userData?.email;
    cartState.emailVerified = userData?.emailVerified || false;

    showSuccess('✓ Login Berhasil!', 'Halaman sedang diperbarui...');

    // Re-render based on verification status
    setTimeout(() => {
      render(userData);
    }, 1500);

  } catch (error) {
    console.error('[Cart] Auth success error:', error);
    showError('Error', error.message);
  }
}

/**
 * Handle Google Sign-In
 */
async function handleGoogleSignIn(response) {
  if (!response.credential) {
    showError('Error', 'Google Sign-In gagal');
    return;
  }

  try {
    showInfo('Loading', 'Verifying Google token...');

    const result = await APIClient.verifyGoogleToken(response.credential);
    
    if (!result.success) {
      throw new Error(result.message || 'Google Sign-In gagal');
    }

    if (!result.data) {
      throw new Error('Data pengguna tidak ditemukan');
    }

    // Save session
    AuthManager.saveSession(result.data);

    showSuccess('✓ Google Login Sukses!', 'Halaman sedang diperbarui...');

    // Re-render
    setTimeout(() => {
      render(result.data);
    }, 1500);

  } catch (error) {
    console.error('[Cart] Google auth error:', error);
    showError('Error', error.message);
  }
}

// ============================================================================
// EMAIL VERIFICATION PROMPT
// ============================================================================

function renderEmailVerificationPrompt() {
  cartState.container.innerHTML = `
    <div class="page-container">
      <div class="verification-prompt" style="max-width: 600px; margin: 40px auto; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div class="verification-alert" style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
          <h2 style="color: #92400e; margin-top: 0; display: flex; align-items: center; gap: 10px; font-size: 1.3rem;">
            <i class="fas fa-envelope-open-text"></i> Verifikasi Email Diperlukan
          </h2>
          <p style="color: #b45309; margin-bottom: 8px;">
            Email Anda belum terverifikasi. Silakan cek email untuk link verifikasi.
          </p>
          <p style="color: #b45309; margin: 0;">
            Email dikirim ke: <strong>${cartState.currentUser?.email}</strong>
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-flex; align-items: center; gap: 10px; color: #2563eb; font-weight: 500; font-size: 0.95rem; margin-bottom: 15px; padding: 8px 16px; background-color: #eff6ff; border-radius: 20px; animation: pulse 2s infinite;">
            <i class="fas fa-spinner fa-spin"></i> Menunggu verifikasi email...
          </div>
          <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.9rem;">Halaman ini akan otomatis diperbarui setelah Anda memverifikasi email Anda.</p>
          <button onclick="location.reload()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
            <i class="fas fa-redo"></i> Cek Manual / Refresh
          </button>
        </div>

        <hr style="margin: 2rem 0; border: none; border-top: 1px solid var(--border-light);">

        <div style="color: var(--text-light); text-align: center; font-size: var(--teks-kecil);">
          <p>Link verifikasi tidak muncul?</p>
          <a href="/auth/verify-email.html" style="color: var(--primary-blue); text-decoration: none; font-weight: bold;">
            Buka halaman verifikasi email
          </a>
        </div>
      </div>
    </div>
  `;

  // Start polling to check if user has verified their email in the database
  if (!cartState.verificationPollInterval) {
    console.log('[Cart] Starting email verification status polling...');
    cartState.verificationPollInterval = setInterval(async () => {
      try {
        if (!cartState.currentUser || cartState.currentUser.emailVerified) {
          clearInterval(cartState.verificationPollInterval);
          cartState.verificationPollInterval = null;
          return;
        }

        const result = await APIClient.getUserProfile(cartState.currentUser.userId);
        if (result.success && result.data && result.data.emailVerified) {
          console.log('[Cart] User verified email (detected via polling)!');
          clearInterval(cartState.verificationPollInterval);
          cartState.verificationPollInterval = null;

          // Save updated session
          const updatedUser = { ...cartState.currentUser, emailVerified: true };
          AuthManager.saveSession(updatedUser);

          // Update state and show success message
          cartState.currentUser = updatedUser;
          cartState.emailVerified = true;
          
          showSuccess('✓ Email Terverifikasi', 'Halaman diperbarui, mengarahkan ke keranjang...');
          
          // Re-render full cart
          setTimeout(() => {
            render(updatedUser);
          }, 1500);
        }
      } catch (error) {
        console.warn('[Cart] Error polling verification status:', error);
      }
    }, 3000);
  }
}

// ============================================================================
// EMPTY CART
// ============================================================================

function renderEmptyCart() {
  cartState.container.innerHTML = `
    <div class="page-container">
      <div class="cart-empty">
        <div class="empty-icon">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <h2 class="empty-title">Keranjang Kosong</h2>
        <p class="empty-text">
          Belum ada domain di keranjang Anda. Mulai cari domain impian Anda!
        </p>
        <a href="/?section=cek-domain" class="btn btn-primary">
          <i class="fas fa-search"></i> Cari Domain
        </a>
      </div>
    </div>
  `;
}

// ============================================================================
// AUTHENTICATED & VERIFIED CART
// ============================================================================

function renderAuthenticatedCart() {
  const { items, subtotal, discount, total } = CartManager.getSummary();
  const cartData = CartManager.getCart();
  const addons = (cartData && cartData.addons) || [];
  const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  const promoTotal = cartState.promoDiscount || 0;
  const ppn = Math.round((subtotal + addonsTotal) * 0.11);
  const finalTotal = subtotal + addonsTotal + ppn - promoTotal;

  let itemsHTML = items.map(item => renderCartItem(item)).join('');

  cartState.container.innerHTML = `
    <div class="page-container">
      <div class="cart-page">
        <h2 class="cart-page-title">
          <i class="fas fa-shopping-cart"></i> Keranjang Saya
        </h2>

        <div class="cart-grid">
          
          <!-- Cart Items -->
          <div>
            <div class="cart-items-section">
              <h3 class="cart-items-title">Domain yang Dipesan</h3>
              <div class="cart-items-list">
                ${itemsHTML}
              </div>
            </div>

            ${addons.length > 0 ? `
              <div class="addons-section">
                <h3 class="addons-title"><i class="fas fa-cube"></i> Layanan Tambahan</h3>
                <div class="addons-list">
                  ${addons.map(addon => `
                    <div class="addon-item">
                      <div class="addon-info">
                        <div class="addon-name">${addon.name}</div>
                        <div class="addon-desc">${addon.duration} tahun</div>
                      </div>
                      <div class="addon-price">${formatPrice(addon.price)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Cart Summary & Checkout -->
          <div>
            <div class="cart-summary">
              <h3 class="summary-title">Ringkasan Pesanan</h3>
              
              <div class="price-row">
                <span class="price-row-label">Domain (${items.length}):</span>
                <span class="price-value">${formatPrice(subtotal)}</span>
              </div>

              ${addonsTotal > 0 ? `
                <div class="price-row">
                  <span class="price-row-label">Addon (${addons.length}):</span>
                  <span class="price-value">${formatPrice(addonsTotal)}</span>
                </div>
              ` : ''}

              <div class="price-row subtotal">
                <span class="price-row-label">Subtotal:</span>
                <span class="price-value">${formatPrice(subtotal + addonsTotal)}</span>
              </div>

              <div class="price-row ppn">
                <span class="price-row-label">PPN (11%):</span>
                <span class="price-value">${formatPrice(ppn)}</span>
              </div>

              ${promoTotal > 0 ? `
                <div class="price-row discount">
                  <span class="price-row-label"><i class="fas fa-tag"></i> Diskon Promo:</span>
                  <span class="price-value">-${formatPrice(promoTotal)}</span>
                </div>
              ` : ''}

              <div class="price-row total">
                <span>Total:</span>
                <span class="price-value">${formatPrice(finalTotal)}</span>
              </div>

              <!-- Promo Code Section -->
              <div class="promo-section">
                <label class="promo-label">
                  <i class="fas fa-tag"></i> Punya Kode Promo?
                </label>
                <div class="promo-input-group">
                  <input type="text" id="promo-code-input" placeholder="Masukkan kode promo" class="promo-input">
                  <button onclick="window.applyPromoCode()" class="btn-apply-promo">
                    Gunakan
                  </button>
                </div>
                <div id="promo-message" class="promo-message"></div>
              </div>

              <!-- Action Buttons -->
              <div class="action-section">
                <button onclick="window.proceedToCheckout()" class="btn btn-primary">
                  <i class="fas fa-lock"></i> Lanjut ke Pembayaran
                </button>

                <a href="/?section=cek-domain" class="btn btn-secondary">
                  <i class="fas fa-search"></i> Cari Domain Lain
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Expose functions to window
  window.applyPromoCode = applyPromoCode;
  window.proceedToCheckout = proceedToCheckout;
  window.removeCartItem = removeCartItem;
  window.removeAddon = removeAddon;
}

// ============================================================================
// CART ITEM RENDERING
// ============================================================================

function renderCartItem(item) {
  const renewalInfo = item.renewalPrice && item.renewalPrice !== item.price
    ? `<div class="cart-item-renewal"><i class="fas fa-sync"></i> Pembaruan: ${formatPrice(item.renewalPrice)}/tahun</div>`
    : '';

  return `
    <div class="cart-item">
      <div class="cart-item-info">
        <h4 class="cart-item-domain">${item.domain}</h4>
        <div class="cart-item-details">
          <span class="cart-item-badge">${item.package ? item.package.toUpperCase() : 'STARTER'}</span>
          <span class="cart-item-duration"><i class="fas fa-calendar"></i> ${item.duration || 1} tahun</span>
        </div>
        ${renewalInfo}
      </div>
      <div class="cart-item-actions">
        <div class="cart-item-price">${formatPrice(item.price * (item.duration || 1))}</div>
        <button onclick="window.removeCartItem('${item.domain}')" class="btn-remove">
          <i class="fas fa-trash"></i> Hapus
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// PROMO CODE FUNCTIONS
// ============================================================================

function loadSavedPromo() {
  try {
    const saved = localStorage.getItem('saved_promo_code');
    if (saved) {
      cartState.promoCode = saved;
    }
  } catch (e) {
    console.warn('[Cart] Could not load saved promo:', e);
  }
}

function saveSavedPromo() {
  try {
    if (cartState.promoCode) {
      localStorage.setItem('saved_promo_code', cartState.promoCode);
    } else {
      localStorage.removeItem('saved_promo_code');
    }
  } catch (e) {
    console.warn('[Cart] Could not save promo:', e);
  }
}

async function applyPromoCode() {
  const input = document.getElementById('promo-code-input');
  if (!input) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    showError('Kode Kosong', 'Masukkan kode promo terlebih dahulu');
    return;
  }

  if (cartState.isValidatingPromo) {
    return; // Already validating
  }

  cartState.isValidatingPromo = true;
  const promoMsg = document.getElementById('promo-message');
  if (promoMsg) {
    promoMsg.textContent = 'Memvalidasi...';
    promoMsg.style.display = 'block';
  }

  try {
    const result = await APIClient.validatePromoCode(code);

    if (result.success && result.data) {
      // Valid promo - calculate discount
      const summary = CartManager.getSummary();
      const subtotal = summary.subtotal || 0;

      let discount = 0;
      if (result.data.discountType === 'percentage') {
        discount = Math.round(subtotal * (result.data.discount / 100));
      } else {
        discount = result.data.discount;
      }

      cartState.promoCode = code;
      cartState.promoDiscount = discount;
      cartState.promoValidated = true;

      if (promoMsg) {
        promoMsg.textContent = `✓ ${result.message || 'Kode promo berhasil diterapkan'}`;
        promoMsg.style.color = '#27ae60';
      }

      showSuccess('✓ Berhasil', 'Kode promo diterapkan');
      saveSavedPromo();

      // Re-render cart
      render(cartState.currentUser);
    } else {
      // Invalid promo
      cartState.promoCode = null;
      cartState.promoDiscount = 0;
      cartState.promoValidated = false;

      if (promoMsg) {
        promoMsg.textContent = result.message || 'Kode promo tidak valid';
        promoMsg.style.color = '#dc2626';
      }

      localStorage.removeItem('saved_promo_code');
    }
  } catch (error) {
    console.error('[Cart] Promo validation error:', error);
    if (promoMsg) {
      promoMsg.textContent = 'Gagal memvalidasi kode promo';
      promoMsg.style.color = '#dc2626';
    }
    cartState.promoCode = null;
    cartState.promoDiscount = 0;
  } finally {
    cartState.isValidatingPromo = false;
  }
}

// ============================================================================
// CHECKOUT FUNCTIONS
// ============================================================================

async function proceedToCheckout() {
  try {
    if (cartState.isProcessingCheckout) {
      return;
    }

    const summary = CartManager.getSummary();
    if (summary.itemCount === 0) {
      showError('⚠️ Keranjang Kosong', 'Tambahkan domain ke keranjang terlebih dahulu');
      return;
    }

    // Check email verification
    if (!cartState.currentUser?.emailVerified) {
      showError('⚠️ Email Tidak Terverifikasi', 'Silakan verifikasi email Anda terlebih dahulu');
      return;
    }

    cartState.isProcessingCheckout = true;

    // Get first domain for order
    const firstDomain = summary.items[0]?.domain || '';
    if (!firstDomain) {
      throw new Error('Domain tidak ditemukan');
    }

    // Parse domain
    const parts = firstDomain.split('.');
    const tld = parts[parts.length - 1];

    // VALIDASI: Re-check domain availability (per spec)
    console.log('[Cart] Checking domain availability:', firstDomain);
    const availabilityCheck = await APIClient.checkDomain(firstDomain);
    if (!availabilityCheck.success || !availabilityCheck.data?.available) {
      throw new Error(`Domain ${firstDomain} tidak tersedia. Silakan pilih domain lain.`);
    }

    // Calculate final total with promo + ppn
    const subtotal = summary.subtotal + (CartManager.getCart().addons || []).reduce((sum, a) => sum + a.price, 0);
    const ppn = Math.round(subtotal * 0.11);
    const finalTotal = subtotal + ppn - (cartState.promoDiscount || 0);

    // Prepare order data
    const orderData = {
      userId: cartState.userId || cartState.currentUser?.userId,
      email: cartState.userEmail || cartState.currentUser?.email,
      domain: firstDomain,
      packageId: summary.items[0]?.package || 'starter',
      addons: CartManager.getCart().addons || [],
      promoCode: cartState.promoCode || null,
      total: finalTotal
    };

    console.log('[Cart] Creating order:', orderData);

    // CREATE ORDER DI DATABASE
    const createOrderResult = await APIClient.createOrder(orderData);

    if (!createOrderResult.success) {
      throw new Error(createOrderResult.message || 'Gagal membuat order');
    }

    const orderId = createOrderResult.data?.orderId;
    if (!orderId) {
      throw new Error('Order ID tidak ditemukan dalam response');
    }

    console.log('[Cart] Order created:', orderId);
    
    // Clear cart so previous checkout items are not carried over to the next order
    CartManager.clear();
    
    showSuccess('✓ Order Dibuat', 'Mengarahkan ke pembayaran...');

    // Redirect to payment page (use hash route for SPA)
    setTimeout(() => {
      window.location.href = `/dashboard/#!payment?orderId=${encodeURIComponent(orderId)}`;
    }, 1500);

  } catch (error) {
    console.error('[Cart] Checkout error:', error);
    showError('❌ Error Checkout', error.message);
  } finally {
    cartState.isProcessingCheckout = false;
  }
}

function removeCartItem(domain) {
  if (confirm(`Hapus ${domain} dari keranjang?`)) {
    CartManager.remove(domain);
    render(cartState.currentUser);
  }
}

function removeAddon(addonId) {
  const cart = CartManager.getCart();
  if (cart.addons) {
    CartManager.addAddons(cart.addons.filter(a => a.id !== addonId));
    render(cartState.currentUser);
  }
}

export default render;
