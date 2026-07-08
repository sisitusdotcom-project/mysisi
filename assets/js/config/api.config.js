/**
 * ========================================
 * CENTRALIZED API & PAYMENT CONFIGURATION
 * ========================================
 * Single source of truth untuk semua API endpoints dan credentials
 * Update di sini akan otomatis reflect di seluruh aplikasi
 */

// ========== GOOGLE APPS SCRIPT CONFIGURATION ==========
export const GAS_CONFIG = {
  // Main API endpoint untuk semua backend calls
  URL: 'https://script.google.com/macros/s/AKfycbycJpIuAgt4ZTCyvuXbZbCaY5ivQG3fDy4SouPyZA-ulwF7oAwwhHj0TYLP54tsFR7Z/exec',

  // Timeout untuk fetch calls (dalam milliseconds)
  TIMEOUT: 30000,

  // Actions/endpoints yang dipanggil
  ACTIONS: {
    // Auth related
    REGISTER_USER: 'registerUser',
    LOGIN_USER: 'loginUser',
    VALIDATE_USER: 'validateUser',
    CHANGE_PASSWORD: 'changePassword',
    REQUEST_PASSWORD_RESET: 'requestPasswordReset',
    RESET_PASSWORD: 'resetPassword',
    VERIFY_EMAIL: 'verifyEmail',

    // Promo & Domain related
    VALIDATE_PROMO: 'validatePromoCode',
    CHECK_DOMAIN: 'checkDomain',

    // Order related
    CREATE_ORDER: 'createOrderWithAuth',
    GET_ORDERS: 'getUserOrders',
    GET_ORDER_DETAIL: 'getOrderDetail',
    UPDATE_ORDER_STATUS: 'updateOrderStatus',
    GET_USER_ORDER_STATS: 'getUserOrderStats',

    // Payment related
    GET_SNAP_TOKEN: 'getSnapToken',
    VERIFY_PAYMENT: 'verifyPaymentStatus',
    HANDLE_MIDTRANS_WEBHOOK: 'handleMidtransWebhook',

    // User profile
    GET_USER_PROFILE: 'getUserProfile',
    UPDATE_USER_PROFILE: 'updateUserProfile',

    // Admin Settings CMS
    GET_SETTINGS: 'getsettings',
    SAVE_SETTINGS: 'savesettings',
    GET_EMAIL_TEMPLATES: 'getemailtemplates',
    SAVE_EMAIL_TEMPLATE: 'saveemailtemplate',
  }
};

// ========== MIDTRANS PAYMENT GATEWAY CONFIGURATION ==========
export const MIDTRANS_CONFIG = {
  // Environment: 'sandbox' untuk development, 'production' untuk live
  ENVIRONMENT: 'sandbox',

  // Client Key - untuk frontend Snap integration
  CLIENT_KEY: 'Mid-client-5Pt2HLTUbjJd24VZ',

  // Server Key - untuk backend verification & token generation
  // Note: Must be set in Google Apps Script Properties, not here
  SERVER_KEY: '',

  // Snap API URLs
  SNAP_URL: {
    sandbox: 'https://app.sandbox.midtrans.com/snap/snap.js',
    production: 'https://app.midtrans.com/snap/snap.js'
  },

  // Payment status values
  STATUS: {
    PENDING: 'pending',
    SETTLEMENT: 'settlement',
    EXPIRED: 'expire',
    CANCELLED: 'cancel',
    FAILED: 'failure',
    DENIED: 'deny'
  }
};

// ========== DOMAIN PACKAGES CONFIGURATION ==========
// ✅ SYNCHRONIZED dengan package validation di GAS (gas.js line 119)
// PENTING: Update keduanya jika ada perubahan paket
export const DOMAIN_PACKAGES = {
  // Starter Package
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 599000,
    period: 'Sekali Bayar',
    periodValue: 1,
    description: 'Sempurna untuk Bisnis Kecil & UMKM',
    features: [
      '5–7 Hari Pengerjaan',
      'Hingga 5 Halaman Custom Design',
      'Optimasi Core Web Vitals',
      'Domain & Hosting 1 Tahun',
      'WhatsApp Integrasi Otomatis'
    ]
  },

  // Professional Package (Grower)
  professional: {
    id: 'professional',
    name: 'Grower',
    price: 1299000,
    period: 'Sekali Bayar',
    periodValue: 1,
    description: 'Untuk Bisnis Menengah & Perusahaan Profesional',
    features: [
      '7–10 Hari Pengerjaan',
      'Hingga 8 Halaman Custom Design',
      'SEO On-Page Lengkap + SEO Lokal',
      'Optimasi Core Web Vitals Advanced',
      'Domain & Hosting 2 Tahun (Promo: 3 Tahun)',
      'SSL, Backup Bulanan & Anti-Malware',
      '3x Revisi Desain',
      '1 Bulan Maintenance Gratis'
    ]
  },

  // Business Package (Pioneer)
  business: {
    id: 'business',
    name: 'Pioneer',
    price: 2399000,
    period: 'Sekali Bayar',
    periodValue: 1,
    description: 'Untuk Bisnis E-Commerce & Penjual Produk',
    features: [
      '14–21 Hari Pengerjaan',
      '12 Halaman + Toko Online Lengkap',
      'Manajemen Produk (Unlimited)',
      'Integrasi Ongkir & Payment Gateway',
      'Domain & Hosting Cloud Bisnis 1-2 Tahun',
      'Dashboard Admin Lengkap',
      'Maintenance Ringan Gratis'
    ]
  },

  // Enterprise Package (Custom/Enterprise)
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999000,
    period: 'Sekali Bayar',
    periodValue: 1,
    description: 'Solusi Kustom & Skala Besar',
    features: [
      'Pengerjaan Custom & Kompleks',
      'Halaman Unlimited',
      'Sistem Custom Sesuai Kebutuhan',
      'Integrasi API Kustom & Database',
      'Hosting Dedicated / Cloud VMS Premium',
      'Keamanan Tingkat Tinggi & Backup Harian',
      'Revisi Unlimited',
      'Dukungan Teknis Prioritas 24/7'
    ]
  }
};

// ========== PACKAGE VALIDATION ==========
/**
 * Validated packages list - MUST MATCH GAS backend validPackages array
 * Location: gas.gs
 * Must be updated if domain_packages change
 */
export const VALID_PACKAGE_IDS = ['starter', 'professional', 'business', 'enterprise'];

/**
 * Validate package ID exists
 */
export function isValidPackage(packageId) {
  return VALID_PACKAGE_IDS.includes(packageId) && DOMAIN_PACKAGES[packageId];
}

// ========== HELPER FUNCTIONS ==========

/**
 * Get package details by ID
 * @param {string} packageId - Package ID
 * @returns {object|null} Package object atau null jika tidak ada
 */
export function getPackageById(packageId) {
  return DOMAIN_PACKAGES[packageId] || null;
}

/**
 * Get semua packages as array
 * @returns {array} Array of package objects
 */
export function getAllPackages() {
  return Object.values(DOMAIN_PACKAGES);
}

// ========== ADDON PACKAGES ==========
/**
 * Available addons for domains and services
 * Each addon can be added to cart independently
 */
export const ADDON_PACKAGES = {
  dns_management: {
    id: 'dns_management',
    name: 'DNS Management',
    description: 'Pengelolaan DNS record dan nameserver',
    price: 0,  // Free with domain
    duration: 1,
    recommended: true
  },

  privacy_protection: {
    id: 'privacy_protection',
    name: 'Privacy Protection',
    description: 'Sembunyikan informasi pribadi Anda dari WHOIS',
    price: 6625,
    duration: 1,
    recommended: false
  },

  email_2gb: {
    id: 'email_2gb',
    name: 'Email 2GB',
    description: 'Akun email dengan kapasitas 2 GB per tahun',
    price: 5000,
    duration: 1,
    recommended: false
  },

  email_10gb: {
    id: 'email_10gb',
    name: 'Email 10GB',
    description: 'Akun email dengan kapasitas 10 GB per tahun',
    price: 15000,
    duration: 1,
    recommended: false
  },

  ssl_certificate: {
    id: 'ssl_certificate',
    name: 'SSL Certificate',
    description: 'Sertifikat SSL untuk keamanan website',
    price: 99000,
    duration: 1,
    recommended: false
  },

  domain_forwarding: {
    id: 'domain_forwarding',
    name: 'Domain Forwarding',
    description: 'Arahkan domain ke URL lain',
    price: 0,
    duration: 1,
    recommended: false
  }
};
