// =========================
// DATA NAVIGASI HEADER
// =========================
export const menuData = [
  { href: "/", text: "Home", icon: "fas fa-home" },

  {
    text: "Perusahaan",
    href: "/perusahaan/",
    icon: "fas fa-building",
    dropdown: [
      { href: "/perusahaan/", text: "Profil Perusahaan", icon: "fas fa-briefcase", isParent: true },
      { href: "/perusahaan/tentang/", text: "Tentang Kami", icon: "fas fa-users" },
      { href: "/perusahaan/portofolio/", text: "Portofolio", icon: "fas fa-images" },
      { href: "/perusahaan/legal/", text: "Legal", icon: "fas fa-file-contract" }
    ]
  },

  {
    text: "Layanan",
    href: "/layanan/",
    icon: "fas fa-cogs",
    dropdown: [
      { href: "/layanan/", text: "Layanan Kami", icon: "fas fa-th", isParent: true },
      { href: "/layanan/pembuatan-website/", text: "Pembuatan Website", icon: "fas fa-code" },
      { href: "/layanan/maintenance/", text: "Maintenance Website", icon: "fas fa-wrench" },
      { href: "/layanan/domain-hosting/", text: "Domain & Hosting", icon: "fas fa-server" }
    ]
  },

  {
    text: "Blog",
    href: "/blog/",
    icon: "fas fa-newspaper",
    dropdown: [
      { href: "/blog/", text: "Blog", icon: "fas fa-blog", isParent: true },
      { href: "/blog/artikel/", text: "Artikel", icon: "fas fa-pen-fancy" },
      { href: "/blog/tips-website/", text: "Tips Website", icon: "fas fa-lightbulb" }
    ]
  },

  { href: "/kontak/", text: "Kontak", icon: "fas fa-envelope" },

  { text: "Promo", href: "/promo/", icon: "fas fa-gift", isPromo: true },

  { text: "Login", href: "/auth/", icon: "fas fa-sign-in-alt", isAuth: true }
];


// =========================
// DATA LAYANAN UTAMA FOOTER
// =========================
export const mainServicesData = [
  { href: "/layanan/pembuatan-website/", text: "Pembuatan Website" },
  { href: "/layanan/domain-hosting/", text: "Domain & Hosting" },
  { href: "/layanan/maintenance/", text: "Maintenance Website" },
  { href: "/promo/", text: "Promo & Penawaran" }
];


// =========================
// DATA SOSIAL MEDIA FOOTER
// =========================
export const footerSocialData = [
  { href: "https://www.facebook.com/sisitusdotcom", ariaLabel: "Facebook", icon: "fab fa-facebook-f" },
  { href: "https://www.instagram.com/sisitusdotcom", ariaLabel: "Instagram", icon: "fab fa-instagram" },
  { href: "https://www.youtube.com/@sisitusdotcom", ariaLabel: "YouTube", icon: "fab fa-youtube" },
  { href: "https://wa.me/6281215289095", ariaLabel: "WhatsApp", icon: "fab fa-whatsapp" },
  { href: "https://www.tiktok.com/@sisitusdotcom", ariaLabel: "TikTok", icon: "fab fa-tiktok" }
];


// =========================
// DATA KONTAK FOOTER
// =========================
export const footerContactData = [
  {
    icon: "fas fa-map-marker-alt",
    text: "Indonesia – Layanan Online sisitus.com"
  },
  {
    icon: "fas fa-phone-alt",
    text: "<a href=\"tel:+62-812-1528-9095\" class=\"footer-kontak-link\">+62 812-1528-9095</a>"
  },
  {
    icon: "fas fa-envelope",
    text: "<a href=\"mailto:hello@sisitus.com\" class=\"footer-kontak-link\">hello@sisitus.com</a>"
  },
  {
    icon: "fas fa-clock",
    text: "Senin - Sabtu: 08.00 - 20.00 WIB"
  }
];
