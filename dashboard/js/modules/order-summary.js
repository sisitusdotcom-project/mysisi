/**
 * ORDER SUMMARY PAGE MODULE
 * ===================================
 * Display order details before checkout
 * - Guest accessible (public page)
 * - Shows domain + available addons
 * - Displays pricing with PPN tax
 * - Redirects to cart on add-to-cart
 * 
 * Features:
 * - No login required
 * - Domain availability recheck
 * - Addon selection UI
 * - LocalStorage persistence
 * 
 * NOTE: Promo code logic moved to /cart/ (inline checkout)
 */

import { CartManager } from '/assets/js/modules/unified-cart.js';
import { showSuccess, showError, showInfo } from '/assets/js/modules/unified-utils.js';
import APIClient from '/assets/js/modules/unified-api.js';
import { ADDON_PACKAGES, DOMAIN_PACKAGES } from '/assets/js/config/api.config.js';

// State management (currentUser can be null for guests)
let orderState = {
  domain: null,
  tld: null,
  price: 199000,
  duration: 1,
  selectedAddons: [],
  package: 'starter',
  baseDomainPrice: 199000
};

/**
 * Main render function
 * Order summary is GUEST ACCESSIBLE - NO login friction
 * Login only happens in cart page
 */
export async function render(currentUser) {
  try {
    console.log(`[ORDER-SUMMARY] Render started`);
    console.log(`[ORDER-SUMMARY] ADDON_PACKAGES available:`, Object.keys(ADDON_PACKAGES).length, 'addons');
    Object.entries(ADDON_PACKAGES).forEach(([key, addon]) => {
      console.log(`  - ${key}: ${addon.name} (Rp ${addon.price})`);
    });

    // Extract domain from URL (hash-based routing support)
    const domain = extractDomainFromUrl();
    
    if (!domain) {
      throw new Error('Domain tidak ditemukan. Kembali ke pencarian domain.');
    }

    // Parse domain and TLD
    const { domainName, tld } = parseDomain(domain);
    orderState.domain = domainName;
    orderState.tld = tld;
    console.log(`[ORDER-SUMMARY] Domain parsed: ${domainName}.${tld}`);

    // Try to load state from cart first
    const loadedFromCart = loadFromCart(`${domainName}.${tld}`);
    
    if (!loadedFromCart) {
      // Fallback to localStorage saved state
      loadOrderState();
      orderState.domain = domainName;
      orderState.tld = tld;
    }

    // Validate domain availability
    await validateDomainAvailability();

    // Setup event handlers BEFORE rendering (before addon checkboxes are created)
    setupEventHandlers();
    console.log(`[ORDER-SUMMARY] Event handlers setup complete`);

    // Render UI
    renderOrderSummary();
    console.log(`[ORDER-SUMMARY] Render complete`);

    // Save state to localStorage for persistence
    saveOrderState();

  } catch (error) {
    console.error('Error rendering order summary:', error);
    showError('Kesalahan', error.message);
    
    const errorState = document.getElementById('error-state');
    const loadingState = document.getElementById('loading-state');
    const summaryContent = document.getElementById('summary-content');
    
    if (loadingState) loadingState.style.display = 'none';
    if (summaryContent) summaryContent.classList.remove('visible');
    
    if (errorState) {
      errorState.classList.add('visible');
      const errorCard = errorState.querySelector('.error-card');
      if (errorCard) {
        errorCard.innerHTML = `
          <div class="error-alert">
            <h3>
              <i class="fas fa-exclamation-circle"></i>
              Kesalahan Memproses Pesanan
            </h3>
            <p>${error.message}</p>
          </div>
          <div class="action-buttons">
            <a href="/" class="btn btn-primary" style="text-decoration: none;">
              <i class="fas fa-arrow-left"></i> Kembali ke Beranda
            </a>
          </div>
        `;
      }
    }
  }
}

/**
 * Extract domain from URL (support both search params and hash params)
 */
function extractDomainFromUrl() {
  // Try search params first (regular URL)
  let domain = new URLSearchParams(window.location.search).get('domain');
  
  // Try hash params (hash-based routing)
  if (!domain) {
    const hash = window.location.hash;
    if (hash && hash.includes('?')) {
      const queryPart = hash.split('?')[1];
      domain = new URLSearchParams(queryPart).get('domain');
    }
  }

  return domain ? domain.toLowerCase() : null;
}

/**
 * Parse domain into name and TLD
 */
function parseDomain(domain) {
  const parts = domain.split('.');
  if (parts.length < 2) {
    throw new Error('Format domain tidak valid');
  }

  const tld = parts[parts.length - 1];
  const domainName = parts.slice(0, -1).join('.');

  return { domainName, tld };
}

/**
 * Validate domain availability by calling API
 */
async function validateDomainAvailability() {
  try {
    const fullDomain = `${orderState.domain}.${orderState.tld}`;
    const result = await APIClient.checkDomain(fullDomain);

    if (!result.success) {
      throw new Error('Domain tidak tersedia atau terjadi kesalahan');
    }

    // If available, optionally get pricing
    if (result.data && result.data.price) {
      orderState.baseDomainPrice = result.data.price;
      if (orderState.package === 'starter') {
        orderState.price = result.data.price;
      }
    }

  } catch (error) {
    console.warn('Domain availability check failed:', error);
    // Don't throw - allow to continue with cached price
  }
}

/**
 * Setup event handlers for buttons
 */
function setupEventHandlers() {
  // Expose only addToCart to window for button click handler
  window.addToCart = addToCart;
}
function renderOrderSummary() {
  // Hide loading, show content
  const loadingState = document.getElementById('loading-state');
  const summaryContent = document.getElementById('summary-content');
  const errorState = document.getElementById('error-state');
  
  if (loadingState) loadingState.style.display = 'none';
  if (errorState) errorState.classList.remove('visible');
  if (summaryContent) summaryContent.classList.add('visible');

  // Set domain info
  const domainNameEl = document.getElementById('domain-name');
  if (domainNameEl) {
    domainNameEl.textContent = `${orderState.domain}.${orderState.tld}`;
  }

  // Render packages
  renderPackages();

  // Render addons FIRST (before updating prices)
  renderAddons();

  // Restore selected addons if any
  restoreSelectedAddons();

  // Update prices LAST (after addons are restored)
  updatePriceSummary();
}

/**
 * Render package options
 */
function renderPackages() {
  const packagesList = document.getElementById('packages-list');
  if (!packagesList) return;

  packagesList.innerHTML = '';

  Object.values(DOMAIN_PACKAGES).forEach(pkg => {
    const isSelected = orderState.package === pkg.id;
    const pkgPrice = pkg.id === 'starter' ? orderState.baseDomainPrice : pkg.price;

    const pkgEl = document.createElement('div');
    pkgEl.className = `package-card ${isSelected ? 'selected' : ''}`;
    
    pkgEl.innerHTML = `
      <div class="package-header">
        <h4 class="package-name">${pkg.name}</h4>
        <div class="package-price">Rp ${formatNumber(pkgPrice)}<small>/${pkg.period}</small></div>
      </div>
      <p class="package-desc">${pkg.description}</p>
      <ul class="package-features">
        ${pkg.features.map(f => `<li><i class="fas fa-check" style="color: #22C55E; margin-right: 8px;"></i> ${f}</li>`).join('')}
      </ul>
      <div class="package-select-badge">${isSelected ? '✓ Terpilih' : 'Pilih Paket'}</div>
    `;

    pkgEl.addEventListener('click', () => {
      selectPackage(pkg.id);
    });

    packagesList.appendChild(pkgEl);
  });
}

/**
 * Handle package selection
 */
function selectPackage(packageId) {
  orderState.package = packageId;
  const pkg = DOMAIN_PACKAGES[packageId];
  if (pkg) {
    orderState.price = packageId === 'starter' ? orderState.baseDomainPrice : pkg.price;
  }
  
  // Re-render packages to show selection highlight
  renderPackages();
  
  // Update pricing summary
  updatePriceSummary();
  
  // Save state
  saveOrderState();
}

/**
 * Render available addons
 */
function renderAddons() {
  const addonsList = document.getElementById('addons-list');
  if (!addonsList) return;

  // Clear existing
  addonsList.innerHTML = '';

  // Get all addons
  const addonsArray = Object.values(ADDON_PACKAGES);
  
  if (addonsArray.length === 0) {
    addonsList.innerHTML = '<div class="addon-empty">Tidak ada layanan tambahan yang tersedia saat ini</div>';
    return;
  }

  // Render each addon
  addonsArray.forEach(addon => {
    const isSelected = orderState.selectedAddons.includes(addon.id);
    
    const addonEl = document.createElement('label');
    addonEl.className = 'addon-item';
    addonEl.style.cursor = 'pointer';
    
    // Apply styling on initial render if selected
    if (isSelected) {
      addonEl.style.borderColor = 'var(--primary-blue)';
      addonEl.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
    } else {
      addonEl.style.borderColor = 'var(--border-color)';
      addonEl.style.backgroundColor = 'var(--bg-light)';
    }
    
    addonEl.innerHTML = `
      <input type="checkbox" data-addon-id="${addon.id}" ${isSelected ? 'checked' : ''} style="display: none;">
      <div class="addon-info">
        <span class="addon-name">${addon.name}</span>
        <span class="addon-desc">${addon.description || 'Layanan tambahan untuk domain'}</span>
      </div>
      <div class="addon-price">
        <div>${addon.price === 0 ? 'GRATIS' : `Rp ${formatNumber(addon.price)}`}</div>
        <small>/${addon.duration} tahun</small>
      </div>
    `;
    
    // Attach event listener to checkbox (proper event binding)
    const checkbox = addonEl.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
      toggleAddon(addon.id, e.target.checked);
    });
    
    addonsList.appendChild(addonEl);
  });
}

/**
 * Update price summary display
 */
function updatePriceSummary() {
  const domainPrice = orderState.price;
  
  // Calculate addon total
  const addonTotal = orderState.selectedAddons.reduce((sum, addonId) => {
    const addon = ADDON_PACKAGES[addonId];
    const price = addon ? addon.price : 0;
    console.log(`[PRICE DEBUG] Addon ${addonId}:`, addon?.name, `price: ${price}`);
    return sum + price;
  }, 0);

  const subtotal = domainPrice + addonTotal;
  const ppn = Math.round(subtotal * 0.11); // 11% tax
  const total = subtotal + ppn;

  console.log(`[PRICE DEBUG] Domain: ${domainPrice}, Addons: ${addonTotal}, Subtotal: ${subtotal}, PPN: ${ppn}, Total: ${total}`);

  // Update DOM - with defensive checks
  const domainPriceEl = document.getElementById('domain-price');
  if (domainPriceEl) {
    domainPriceEl.textContent = `Rp ${formatNumber(domainPrice)}`;
    console.log(`[PRICE DEBUG] Updated domain-price to: Rp ${formatNumber(domainPrice)}`);
  }

  // Update domain price label to show selected package
  const domainLabelEl = document.querySelector('.price-row label');
  if (domainLabelEl) {
    const pkgName = DOMAIN_PACKAGES[orderState.package]?.name || 'Starter';
    domainLabelEl.textContent = `Paket ${pkgName} (1 tahun)`;
  }
  
  if (addonTotal > 0) {
    const addonSubEl = document.getElementById('addons-subtotal');
    if (addonSubEl) {
      addonSubEl.classList.add('visible');
      console.log(`[PRICE DEBUG] Showing addons-subtotal`);
    }
    const addontotalEl = document.getElementById('addons-total');
    if (addontotalEl) {
      addontotalEl.textContent = `Rp ${formatNumber(addonTotal)}`;
      console.log(`[PRICE DEBUG] Updated addons-total to: Rp ${formatNumber(addonTotal)}`);
    }
  } else {
    const addonSubEl = document.getElementById('addons-subtotal');
    if (addonSubEl) {
      addonSubEl.classList.remove('visible');
      console.log(`[PRICE DEBUG] Hiding addons-subtotal (no addons selected)`);
    }
  }

  const subtotalEl = document.getElementById('subtotal');
  if (subtotalEl) {
    subtotalEl.textContent = `Rp ${formatNumber(subtotal)}`;
    console.log(`[PRICE DEBUG] Updated subtotal to: Rp ${formatNumber(subtotal)}`);
  }
  const ppnEl = document.getElementById('ppn');
  if (ppnEl) {
    ppnEl.textContent = `Rp ${formatNumber(ppn)}`;
    console.log(`[PRICE DEBUG] Updated ppn to: Rp ${formatNumber(ppn)}`);
  }
  const totalEl = document.getElementById('total');
  if (totalEl) {
    totalEl.textContent = `Rp ${formatNumber(total)}`;
    console.log(`[PRICE DEBUG] Updated total to: Rp ${formatNumber(total)}`);
  }
}

/**
 * Toggle addon selection
 */
function toggleAddon(addonId, isChecked) {
  console.log(`[ADDON DEBUG] Toggling addon: ${addonId}, checked: ${isChecked}`);
  
  if (isChecked) {
    if (!orderState.selectedAddons.includes(addonId)) {
      orderState.selectedAddons.push(addonId);
      console.log(`[ADDON DEBUG] Added addon. Selected addons:`, orderState.selectedAddons);
    }
  } else {
    orderState.selectedAddons = orderState.selectedAddons.filter(id => id !== addonId);
    console.log(`[ADDON DEBUG] Removed addon. Selected addons:`, orderState.selectedAddons);
  }

  // Update UI
  console.log(`[ADDON DEBUG] Calling updatePriceSummary...`);
  updatePriceSummary();
  
  // Update label styling
  const labels = document.querySelectorAll('.addon-item');
  labels.forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      label.style.borderColor = 'var(--primary-blue)';
      label.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
    } else {
      label.style.borderColor = 'var(--border-color)';
      label.style.backgroundColor = 'var(--bg-light)';
    }
  });

  saveOrderState();
  console.log(`[ADDON DEBUG] State saved to localStorage`);
}


/**
 * Add to cart and redirect
 */
function addToCart() {
  try {
    const fullDomain = `${orderState.domain}.${orderState.tld}`;

    // Add domain to cart
    CartManager.add(fullDomain, orderState.tld, {
      package: orderState.package,
      duration: orderState.duration,
      price: orderState.price,
      renewalPrice: orderState.price
    });

    // Clear existing addons to handle removals/updates correctly
    CartManager.clearAddons();

    // Add addons to cart
    if (orderState.selectedAddons.length > 0) {
      const addons = orderState.selectedAddons.map(addonId => {
        const addon = ADDON_PACKAGES[addonId];
        return {
          id: addonId,
          name: addon.name,
          price: addon.price,
          duration: addon.duration
        };
      });
      CartManager.addAddons(addons);
    }

    showSuccess('✓ Ditambahkan', 'Domain sudah di keranjang');

    // Redirect to standalone cart page
    setTimeout(() => {
      window.location.href = '/cart/';
    }, 1000);

  } catch (error) {
    console.error('Error adding to cart:', error);
    showError('Error', error.message);
  }
}

/**
 * Restore selected addons from state
 */
function restoreSelectedAddons() {
  orderState.selectedAddons.forEach(addonId => {
    const checkbox = document.querySelector(`input[data-addon-id="${addonId}"]`);
    if (checkbox) {
      checkbox.checked = true;
      const label = checkbox.closest('.addon-item');
      if (label) {
        label.style.borderColor = 'var(--primary-blue)';
        label.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
      }
    }
  });
}

/**
 * Load order state from active CartManager cart data if domain exists
 */
function loadFromCart(domainName) {
  try {
    const cart = CartManager.getCart();
    if (!cart) return false;

    // Search for matching domain in cart
    const cartDomain = cart.domains.find(d => d.domain.toLowerCase() === domainName.toLowerCase());
    if (cartDomain) {
      orderState.domain = cartDomain.domain.split('.')[0];
      orderState.tld = cartDomain.tld;
      orderState.package = cartDomain.package || 'starter';
      orderState.duration = cartDomain.duration || 1;
      orderState.price = cartDomain.price;

      // Restore addons from cart
      if (cart.addons && Array.isArray(cart.addons)) {
        orderState.selectedAddons = cart.addons.map(a => a.id.toLowerCase());
      } else {
        orderState.selectedAddons = [];
      }
      return true;
    }
  } catch (e) {
    console.warn('Could not load state from cart:', e);
  }
  return false;
}

/**
 * Save current order state to localStorage
 */
function saveOrderState() {
  try {
    localStorage.setItem('current_order_state', JSON.stringify(orderState));
  } catch (e) {
    console.warn('Could not save order state:', e);
  }
}

/**
 * Load order state from localStorage
 */
function loadOrderState() {
  try {
    const saved = localStorage.getItem('current_order_state');
    if (saved) {
      const restored = JSON.parse(saved);
      // Restore selected addons - ensure it's an array
      if (restored.selectedAddons && Array.isArray(restored.selectedAddons)) {
        orderState.selectedAddons = restored.selectedAddons;
      }
      // Restore other fields if domain/tld match current URL
      if (restored.domain) orderState.domain = restored.domain;
      if (restored.tld) orderState.tld = restored.tld;
      if (restored.price) orderState.price = restored.price;
      if (restored.duration) orderState.duration = restored.duration;
      if (restored.package) orderState.package = restored.package;
      if (restored.baseDomainPrice) orderState.baseDomainPrice = restored.baseDomainPrice;
    }
  } catch (e) {
    console.warn('Could not load order state:', e);
  }
}

/**
 * Format number as Indonesian currency
 */
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

export default render;
