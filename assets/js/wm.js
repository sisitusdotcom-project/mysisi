(function () {
  // Cari elemen footer utama
  const footer = document.querySelector("footer[aria-label='Informasi Footer']");
  if (!footer) return;

  // Cari grid footer
  const footerGrid = footer.querySelector(".footer-grid");
  if (!footerGrid) return;

  // Atur variabel CSS --favicon-url di root atau elemen watermark
  const root = document.documentElement;
  root.style.setProperty('--favicon-url', 'url("https://sisitus.com/assets/favicon-32x32.png")');

  // Buat elemen .footer-copyright
  const copyrightContainer = document.createElement("div");
  copyrightContainer.className = "footer-copyright";

  // Buat paragraf copyright
  const copyrightPara = document.createElement("p");
  const currentYear = new Date().getFullYear();
  copyrightPara.innerHTML = `&copy; <span>${currentYear}</span> — sisitus.com | Hak Cipta Dilindungi<br>` +
                            `Developed by: <a href="https://www.instagram.com/lukman_looker?igsh=aTZwbmgxdXg0OTJk" class="copyright-link" aria-label="Designer sisitus">Designer</a><br>` +
                            `Powered by<br>`;

  // Buat watermark
  const wm = document.createElement("a");
  wm.href = "https://sisitus.com";
  wm.target = "_blank";
  wm.rel = "nofollow noopener";
  wm.className = "logo wm-sc";
  wm.innerHTML = 'sisitus<span>.com</span>';

  // Gabungkan elemen
  // Gabungkan elemen
  copyrightPara.appendChild(wm);
  copyrightContainer.appendChild(copyrightPara);
  footerGrid.after(copyrightContainer);
})();
