/* ========== HOME PAGE INTERACTIONS ========== */

document.addEventListener('DOMContentLoaded', function () {
  // ========== SPECIFIC HOME PAGE LOGIC ==========

  // FAQ functionality is now handled by faq.js component

  // ========== SERVICE CARD FEATURES TOGGLE (POPUP) ==========
  const toggleButtons = document.querySelectorAll('.toggle-features');
  if (toggleButtons.length > 0) {
    toggleButtons.forEach((button) => {
      button.addEventListener('click', function () {
        const featuresList = this.nextElementSibling;
        const card = this.closest('.service-card');
        const packageName = card.querySelector('.card-header h3').innerText;
        
        // Buat kloningan list fitur untuk ditampilkan di popup
        const cloneList = featuresList.cloneNode(true);
        cloneList.removeAttribute('hidden');
        cloneList.style.display = 'block';
        cloneList.style.textAlign = 'left';
        cloneList.style.fontSize = '0.9rem'; // Mengecilkan ukuran font
        cloneList.style.padding = '0';
        cloneList.style.margin = '0';
        
        // Membungkus isi teks ke dalam span agar tidak pecah oleh flexbox
        Array.from(cloneList.children).forEach(li => {
          const icon = li.querySelector('i');
          if (icon) {
            // Ambil semua node selain icon
            const contentNodes = Array.from(li.childNodes).filter(n => n !== icon);
            const span = document.createElement('span');
            contentNodes.forEach(n => span.appendChild(n));
            li.innerHTML = '';
            li.appendChild(icon);
            li.appendChild(span);
          }
        });
        
        Swal.fire({
          title: `Fitur ${packageName}`,
          html: cloneList.outerHTML,
          width: '360px',
          padding: '1.5rem',
          confirmButtonText: 'Tutup',
          confirmButtonColor: 'var(--primary-blue)',
          customClass: {
            title: 'swal-title-compact',
            popup: 'pricing-features-popup'
          }
        });
      });
    });
  }

  // ========== STATS COUNTER ANIMATION ==========
  const animateCounter = (element) => {
    const finalValue = element.innerText;
    const numericValue = parseInt(finalValue.replace(/\D/g, ''));
    const isPercentage = finalValue.includes('%');
    const hasPlus = finalValue.includes('+');
    
    let currentValue = 0;
    const duration = 2000;
    const increment = numericValue / (duration / 50);
    
    const interval = setInterval(() => {
      currentValue += increment;
      if (currentValue >= numericValue) {
        currentValue = numericValue;
        clearInterval(interval);
      }
      
      let displayValue = Math.floor(currentValue);
      if (isPercentage) {
        element.innerText = displayValue + '%';
      } else if (hasPlus) {
        element.innerText = displayValue + '+';
      } else {
        element.innerText = displayValue;
      }
    }, 50);
  }

  // Trigger counter animation pada görünüm
  const statItems = document.querySelectorAll('.stat-item h3');
  if (statItems.length > 0) {
    const observerConfig = {
      threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, observerConfig);
    
    statItems.forEach(item => observer.observe(item));
  }

  // ========== TESTIMONIAL CAROUSEL ==========
  // Grid responsive untuk testimonials, dapat ditingkatkan dengan gesture di mobile
  const testimonialCards = document.querySelectorAll('.testimonial-card');
  if (testimonialCards.length > 0) {
    testimonialCards.forEach(card => {
      card.addEventListener('mouseenter', function () {
        this.style.animationPlayState = 'running';
      });
    });
  }
});

