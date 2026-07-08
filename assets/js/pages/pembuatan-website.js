/* ========== PEMBUATAN WEBSITE PAGE INTERACTIONS ========== */
/* Detail halaman layanan dengan package comparison dan spec details */

// Toggle function untuk detail packages
function toggleDetails(packageId) {
  const detailBlock = document.getElementById(packageId);
  const allBlocks = document.querySelectorAll('.package-detail-block');
  const allButtons = document.querySelectorAll('.btn-expand');
  
  if (detailBlock) {
    // Tutup semua detail blocks yang lain
    allBlocks.forEach(block => {
      if (block.id !== packageId) {
        block.removeAttribute('open');
      }
    });
    
    // Update semua button states
    allButtons.forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });
    
    // Toggle yang sekarang
    if (detailBlock.hasAttribute('open')) {
      detailBlock.removeAttribute('open');
      document.querySelector(`[onclick="toggleDetails('${packageId}')"]`).setAttribute('aria-expanded', 'false');
    } else {
      detailBlock.setAttribute('open', '');
      document.querySelector(`[onclick="toggleDetails('${packageId}')"]`).setAttribute('aria-expanded', 'true');
      
      // Smooth scroll ke detail block yang dipilih
      setTimeout(() => {
        if (detailBlock) {
          const headerOffset = 120; // Offset untuk fixed header
          const elementPosition = detailBlock.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // ========== FEATURE TOGGLE ==========
  const featureItems = document.querySelectorAll('.feature-item');
  
  featureItems.forEach(item => {
    const icon = item.querySelector('i');
    
    if (icon && !isTouch()) {
      item.addEventListener('mouseenter', function () {
        icon.style.animation = 'none';
        setTimeout(() => {
          icon.style.animation = 'iconRotate 0.6s ease-in-out';
        }, 10);
      });
    }
  });

  // ========== PACKAGE DETAIL BLOCKS SYNC ==========
  const detailBlocks = document.querySelectorAll('.package-detail-block');
  const expandButtons = document.querySelectorAll('.btn-expand');
  
  // Listen for accordion state changes
  detailBlocks.forEach(block => {
    // Update button state when accordion opens
    block.addEventListener('toggle', function () {
      const packageId = this.id;
      const button = document.querySelector(`[onclick="toggleDetails('${packageId}')"]`);
      
      if (button) {
        button.setAttribute('aria-expanded', this.hasAttribute('open') ? 'true' : 'false');
      }
      
      // Close other blocks when one opens
      if (this.hasAttribute('open')) {
        detailBlocks.forEach(otherBlock => {
          if (otherBlock.id !== packageId) {
            otherBlock.removeAttribute('open');
            const otherButton = document.querySelector(`[onclick="toggleDetails('${otherBlock.id}')"]`);
            if (otherButton) {
              otherButton.setAttribute('aria-expanded', 'false');
            }
          }
        });
      }
    });
  });

  // ========== SPEC COMPARISON TABLE ==========
  // Comparison table animations handled by CSS for better performance

  // ========== COLLAPSE/EXPAND FEATURES ==========
  // Feature groups not used in current page structure

  // ========== FAQ ACCORDION INTERACTIONS ==========
  // FAQ functionality is now handled by faq.js component

  // ========== PORTFOLIO ITEM INTERACTIONS ==========
  // Hover effects handled by CSS, no inline JS styles needed for better UI consistency

  // ========== PROCESS TIMELINE NUMBER ANIMATION ==========
  const timelineNumbers = document.querySelectorAll('.process-timeline .timeline-number');
  
  timelineNumbers.forEach((number, index) => {
    if (!isTouch()) {
      number.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.1) rotate(5deg)';
      });
      
      number.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1) rotate(0deg)';
      });
    }
  });

  // ========== CTA BUTTONS INTERACTIONS ==========
  // Button hover and interaction effects handled by CSS for optimal performance

  function isTouch() {
    return (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0));
  }

});
