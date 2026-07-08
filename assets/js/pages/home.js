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
  const statsSection = document.querySelector('.stats-section');
  const statItems = document.querySelectorAll('.stat-text-item');
  let hasAnimated = false;

  const animateStats = () => {
    if (hasAnimated || !statsSection) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimated) {
          hasAnimated = true;
          statItems.forEach(box => {
            const h3 = box.querySelector('h3');
            if (!h3) return;

            const text = h3.textContent.trim();
            const numMatch = text.match(/(\d+)/);
            
            if (!numMatch) return;

            const finalValue = numMatch[1];
            const isPercentage = text.includes('%');
            const hasPlus = text.includes('+');
            const finalNum = parseInt(finalValue);
            let currentNum = 0;
            const increment = Math.ceil(finalNum / 30);
            const duration = 1000;
            const stepTime = duration / (finalNum / increment);

            const counter = setInterval(() => {
              currentNum += increment;
              if (currentNum >= finalNum) {
                currentNum = finalNum;
                clearInterval(counter);
              }
              const display = isPercentage 
                ? currentNum + '%' 
                : (hasPlus ? currentNum + '+' : currentNum);
              h3.textContent = display;
            }, stepTime);
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });

    observer.observe(statsSection);
  };

  animateStats();

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

