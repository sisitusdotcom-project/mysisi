// ========== POPUP PROMO COMPONENT ==========
// Storage Reset: Diatur untuk reset setiap 3 jam (10800000 ms)

class PopupPromo {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'popup_promo_shown';
    this.storageTimeKey = `${this.storageKey}_time`;
    this.resetInterval = 3 * 60 * 60 * 1000; // 3 jam dalam milliseconds
    this.delay = options.delay || 10000; // 10 detik default
    this.actionUrl = options.actionUrl || '#';
    this.actionTarget = options.actionTarget || '_self';
    this.onClose = options.onClose || null;
    this.onShow = options.onShow || null;
    
    this.overlay = null;
    this.container = null;
    this.isVisible = false;
    this.timeoutId = null;
    this.escKeyListener = null;
  }

  // Initialize popup
  init() {
    // Check if popup already shown (dan belum lebih dari 3 jam)
    if (this.isAlreadyShown()) {

      return;
    }

    // Start delay timer sebelum menampilkan popup
    this.schedulePopup();
  }

  // Check if popup already shown dan belum melampaui reset interval (3 jam)
  isAlreadyShown() {
    const timestamp = localStorage.getItem(this.storageTimeKey);
    if (!timestamp) return false;

    const currentTime = Date.now();
    const elapsedTime = currentTime - parseInt(timestamp);

    // Jika sudah melampaui 3 jam, reset
    if (elapsedTime > this.resetInterval) {
      this.clearStorage();
      return false;
    }

    return true;
  }

  // Schedule popup to show after delay (10 detik)
  schedulePopup() {
    this.timeoutId = setTimeout(() => {
      this.show();
    }, this.delay);
  }

  // Show popup
  show() {
    if (this.isVisible) return;

    this.createPopupHTML();
    this.attachEventListeners();
    
    // Trigger animation
    setTimeout(() => {
      this.overlay.classList.add('active');
      this.isVisible = true;

      // Call onShow callback
      if (this.onShow && typeof this.onShow === 'function') {
        this.onShow();
      }
    }, 10);
  }

  // Close popup dengan animation
  close() {
    if (!this.isVisible) return;

    // Add closing animation
    this.overlay.classList.add('closing');

    // Remove after animation selesai
    setTimeout(() => {
      this.overlay.classList.remove('active');
      this.overlay.classList.remove('closing');
      this.isVisible = false;

      // Mark as shown in localStorage dengan timestamp
      this.markAsShown();

      // Remove event listeners
      this.removeEventListeners();

      // Call onClose callback
      if (this.onClose && typeof this.onClose === 'function') {
        this.onClose();
      }
    }, 300);
  }

  // Mark popup as shown dengan timestamp (untuk reset 3 jam)
  markAsShown() {
    const currentTime = Date.now();
    localStorage.setItem(this.storageTimeKey, currentTime.toString());
  }

  // Clear storage
  clearStorage() {
    localStorage.removeItem(this.storageTimeKey);
  }

  // Create popup HTML structure
  createPopupHTML() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'popup-promo-overlay';
    this.overlay.id = 'popup-promo-overlay';

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'popup-promo-container';

    // Create image wrapper
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'popup-promo-image';

    // Create picture element for responsive images
    const picture = document.createElement('picture');

    // Mobile source (max-width 768px)
    const sourceMobile = document.createElement('source');
    sourceMobile.media = '(max-width: 768px)';
    sourceMobile.srcset = '/assets/img/popup-promo-mobile.webp';
    sourceMobile.type = 'image/webp';

    // Desktop source (min-width 769px)
    const sourceDesktop = document.createElement('source');
    sourceDesktop.media = '(min-width: 769px)';
    sourceDesktop.srcset = '/assets/img/popup-promo-desktop.webp';
    sourceDesktop.type = 'image/webp';

    // Fallback image
    const img = document.createElement('img');
    img.src = '/assets/img/popup-promo-desktop.webp';
    img.alt = 'Promo Banner';
    img.loading = 'lazy';
    img.decoding = 'async';

    picture.appendChild(sourceMobile);
    picture.appendChild(sourceDesktop);
    picture.appendChild(img);

    imageWrapper.appendChild(picture);

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'popup-promo-close';
    closeBtn.setAttribute('aria-label', 'Tutup popup promo');
    closeBtn.setAttribute('type', 'button');
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    // Create CTA button
    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'popup-promo-cta';
    ctaBtn.textContent = 'Lihat Promo';

    // Add click handler for CTA
    ctaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.actionUrl !== '#') {
        window.open(this.actionUrl, this.actionTarget);
      }
      this.close();
    });

    // Append elements
    this.container.appendChild(imageWrapper);
    this.container.appendChild(closeBtn);
    this.container.appendChild(ctaBtn);
    this.overlay.appendChild(this.container);

    // Add to body
    document.body.appendChild(this.overlay);
  }

  // Attach event listeners - manage all close mechanisms
  attachEventListeners() {
    const closeBtn = this.overlay.querySelector('.popup-promo-close');
    
    // Close button click handler
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    // Click outside (on overlay) to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Esc key to close - simpan reference untuk cleanup
    this.escKeyListener = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.close();
      }
    };
    
    document.addEventListener('keydown', this.escKeyListener);
  }

  // Remove event listeners - cleanup untuk prevent memory leak
  removeEventListeners() {
    if (this.escKeyListener) {
      document.removeEventListener('keydown', this.escKeyListener);
      this.escKeyListener = null;
    }
  }

  // Destroy popup - cleanup resources
  destroy() {
    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Remove event listeners
    this.removeEventListeners();

    // Remove DOM element
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
      this.container = null;
    }

    this.isVisible = false;
  }

  // Reset sesi popup (untuk testing)
  reset() {
    this.clearStorage();
    this.destroy();
  }
}

// Auto-initialize on page load
window.addEventListener('load', () => {
  // Prevent duplicate initialization and check current path
  const currentPath = window.location.pathname;
  const isAuthOrDashboard = currentPath.includes('/auth') || currentPath.includes('/dashboard');
  if (isAuthOrDashboard) return;

  if (!document.getElementById('popup-promo-overlay')) {
    const popupPromo = new PopupPromo({
      storageKey: 'sisitus_popup_promo_shown',
      delay: 10000, // 10 detik - tunggu sebelum muncul
      actionUrl: '/promo/',
      actionTarget: '_self',
      onShow: () => {
      },
      onClose: () => {
      }
    });

    popupPromo.init();
    
    // Store instance untuk debugging/testing
    window.popupPromoInstance = popupPromo;
  }
});
