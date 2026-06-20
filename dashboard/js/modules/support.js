/**
 * Support Page Module
 * Contact support, view tickets, FAQ
 * MVP Status: ✅ COMPLETE - Shows contact info and quick support options
 * Future Enhancement: Add ticket tracking, live chat system
 */

export async function render(currentUser) {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h1 class="card-title">Pusat Dukungan</h1>
      </div>
      <div class="card-body">
        <!-- Quick Support Options -->
        <div style="margin-bottom: 30px;">
          <h3 style="margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid var(--color-primary); margin-bottom: 20px;">Hubungi Kami</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div style="background-color: var(--color-bg-light); padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid var(--color-primary);">
              <div style="font-size: 40px; margin-bottom: 10px;">💬</div>
              <h4 style="margin: 10px 0; color: var(--color-text-dark);">WhatsApp</h4>
              <p style="font-size: 14px; color: var(--color-text-light); margin: 10px 0 15px;">Chat langsung dengan tim support kami</p>
              <a href="https://wa.me/6281215289095" target="_blank" class="btn btn-primary" style="font-size: 12px; padding: 8px 12px;">
                Buka WhatsApp
              </a>
            </div>
            <div style="background-color: var(--color-bg-light); padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid var(--color-primary);">
              <div style="font-size: 40px; margin-bottom: 10px;">📧</div>
              <h4 style="margin: 10px 0; color: var(--color-text-dark);">Email</h4>
              <p style="font-size: 14px; color: var(--color-text-light); margin: 10px 0 15px;">Kirim pertanyaan ke email kami</p>
              <a href="mailto:hello@sisitus.com" class="btn btn-primary" style="font-size: 12px; padding: 8px 12px;">
                Kirim Email
              </a>
            </div>
            <div style="background-color: var(--color-bg-light); padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid var(--color-primary);">
              <div style="font-size: 40px; margin-bottom: 10px;">📞</div>
              <h4 style="margin: 10px 0; color: var(--color-text-dark);">Telepon</h4>
              <p style="font-size: 14px; color: var(--color-text-light); margin: 10px 0 15px;">Hubungi kami melalui telepon</p>
              <a href="tel:+6281215289095" class="btn btn-primary" style="font-size: 12px; padding: 8px 12px;">
                +62 812-1528-9095
              </a>
            </div>
          </div>
        </div>

        <!-- FAQ Section -->
        <div style="margin-bottom: 30px;">
          <h3 style="margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid var(--color-primary); margin-bottom: 20px;">Pertanyaan Umum (FAQ)</h3>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <div style="background-color: var(--color-bg-light); padding: 15px; border-radius: 6px;">
              <div style="font-weight: 600; color: var(--color-text-dark); margin-bottom: 10px;">⏱️ Berapa lama proses aktivasi domain?</div>
              <div style="color: var(--color-text-light); font-size: 14px; line-height: 1.5;">Domain biasanya aktif dalam 1-24 jam setelah pembayaran selesai. Anda akan menerima email notifikasi ketika domain sudah aktif.</div>
            </div>
            <div style="background-color: var(--color-bg-light); padding: 15px; border-radius: 6px;">
              <div style="font-weight: 600; color: var(--color-text-dark); margin-bottom: 10px;">🔄 Bagaimana cara memperbarui (renew) domain?</div>
              <div style="color: var(--color-text-light); font-size: 14px; line-height: 1.5;">Anda bisa melakukan renewal domain minimum 30 hari sebelum tanggal kadaluarsa. Fitur renewal sedang dikembangkan di dashboard kami.</div>
            </div>
            <div style="background-color: var(--color-bg-light); padding: 15px; border-radius: 6px;">
              <div style="font-weight: 600; color: var(--color-text-dark); margin-bottom: 10px;">🔧 Bagaimana cara mengubah DNS/nameserver?</div>\n              <div style="color: var(--color-text-light); font-size: 14px; line-height: 1.5;">Anda dapat mengelola DNS melalui panel control domain kami. Hubungi support jika membutuhkan bantuan setup.</div>
            </div>
            <div style="background-color: var(--color-bg-light); padding: 15px; border-radius: 6px;">
              <div style="font-weight: 600; color: var(--color-text-dark); margin-bottom: 10px;">❓ Bagaimana jika saya lupa username hosting?</div>
              <div style="color: var(--color-text-light); font-size: 14px; line-height: 1.5;">Hubungi tim support kami melalui WhatsApp atau email. Kami siap membantu memulihkan akses Anda.</div>
            </div>
            <div style="background-color: var(--color-bg-light); padding: 15px; border-radius: 6px;">
              <div style="font-weight: 600; color: var(--color-text-dark); margin-bottom: 10px;">💳 Apa saja metode pembayaran yang tersedia?</div>
              <div style="color: var(--color-text-light); font-size: 14px; line-height: 1.5;">Kami menerima pembayaran melalui berbagai metode: Transfer Bank, E-wallet (GCash, OVO, Dana), dan Kartu Kredit via Midtrans.</div>
            </div>
          </div>
        </div>

        <!-- Service Status -->
        <div style="margin-bottom: 30px;">
          <h3 style="margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid var(--color-primary); margin-bottom: 20px;">Status Layanan</h3>
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 6px;">
            <p style="margin: 10px 0; color: #065f46;"><strong>✓ Server</strong> - Semua sistem normal</p>
            <p style="margin: 10px 0; color: #065f46;"><strong>✓ Support</strong> - Tim tersedia Senin-Jumat 09:00-17:00 WIB</p>
            <p style="margin: 10px 0; color: #065f46;"><strong>✓ Payment Gateway</strong> - Midtrans siap melayani</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
