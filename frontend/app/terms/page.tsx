import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Narriv: plans, the free trial, AI-generated output and public data sources.",
  alternates: { canonical: "/terms" },
};

// Describes the service as it works today (plans, trial, AI output, public sources). Approved and in effect.

const ID = (
  <>
    <p>Ketentuan ini mengatur penggunaan Narriv (narriv.digital), layanan yang disediakan oleh <b>PT Primer Rectoverso Media</b> (&quot;kami&quot;), beralamat di Gedung Cibis Nine Lt. 11, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, Jakarta Selatan, DKI Jakarta 12560. Dengan membuat akun atau memakai Narriv, Anda dan organisasi yang Anda wakili (&quot;klien&quot;) menyetujui ketentuan ini.</p>

    <h2>1. Layanan</h2>
    <p>Narriv memantau konten publik (berita online, YouTube, dan media sosial bila diaktifkan) yang memuat kata kunci workspace, menganalisisnya dengan sistem otomatis termasuk model AI pihak ketiga, lalu menyajikan sentimen, isu, peringatan, rekomendasi, dan laporan. Narriv tidak memublikasikan apa pun atas nama klien.</p>

    <h2>2. Akun dan workspace</h2>
    <ul>
      <li>Anda wajib memberikan data yang benar dan menjaga kerahasiaan kata sandi.</li>
      <li>Pemilik dan admin workspace mengatur anggota, peran, pengaturan, dan kata kunci, serta bertanggung jawab atas aktivitas di workspace-nya.</li>
      <li>Segera beri tahu kami bila Anda menduga akun Anda dipakai tanpa izin.</li>
    </ul>

    <h2>3. Uji coba</h2>
    <p>Uji coba berlaku 14 hari sejak workspace dibuat, kecuali disepakati lain secara tertulis. Selama uji coba, layanan diberikan apa adanya tanpa biaya. Bila uji coba tidak dilanjutkan ke paket berbayar, kami dapat menjeda pemantauan dan menghapus data workspace sesuai Kebijakan Privasi.</p>

    <h2>4. Paket, biaya, dan pembayaran</h2>
    <ul>
      <li>Paket dan harga tercantum di halaman Harga atau dalam penawaran tertulis. Harga dapat berubah, dan perubahan berlaku pada periode tagihan berikutnya setelah kami memberi tahu.</li>
      <li>Pembayaran dilakukan lewat transfer bank berdasarkan invoice, bulanan atau tahunan, paling lambat 14 hari sejak invoice diterbitkan.</li>
      <li>Bila pembayaran terlambat, kami dapat menjeda layanan setelah memberi pemberitahuan.</li>
      <li>Biaya yang sudah dibayar tidak dapat dikembalikan, kecuali disepakati lain secara tertulis.</li>
    </ul>

    <h2>5. Penggunaan yang dilarang</h2>
    <p>Anda tidak boleh memakai Narriv untuk:</p>
    <ul>
      <li>memantau, melacak, atau melecehkan individu tertentu,</li>
      <li>menyusun profil pribadi seseorang tanpa dasar hukum,</li>
      <li>melanggar hukum, termasuk UU PDP dan UU ITE,</li>
      <li>mengakses data workspace lain, atau</li>
      <li>membebani, membongkar, atau menyalin sistem Narriv.</li>
    </ul>
    <p>Kami dapat menangguhkan akses bila ada pelanggaran.</p>

    <h2>6. Konten publik dan sumber pihak ketiga</h2>
    <p>Konten yang dipantau berasal dari pihak ketiga dan tetap menjadi milik pemiliknya. Kami tidak menjamin kelengkapan atau ketersediaan sumber, karena sumber dapat berubah, membatasi akses, atau menghapus konten.</p>

    <h2>7. Hasil analisis dan AI</h2>
    <p>Sentimen, skor risiko, isu, ringkasan, dan rekomendasi dihasilkan otomatis dan bisa keliru. Hasil ini adalah bahan pertimbangan, bukan nasihat hukum, keuangan, atau profesional. Keputusan dan tindakan tetap menjadi tanggung jawab klien.</p>

    <h2>8. Data klien dan kerahasiaan</h2>
    <p>Data di workspace klien tetap milik klien. Kami memprosesnya hanya untuk menyediakan layanan, sesuai Kebijakan Privasi, dan menjaganya tetap rahasia. Kedua pihak wajib menjaga kerahasiaan informasi non-publik yang diterima dari pihak lainnya.</p>

    <h2>9. Hak kekayaan intelektual</h2>
    <p>Narriv, termasuk perangkat lunak, desain, dan mereknya, adalah milik kami. Klien boleh memakai laporan dan hasil ekspor untuk keperluan internalnya.</p>

    <h2>10. Ketersediaan layanan</h2>
    <p>Kami berupaya agar Narriv selalu tersedia, tetapi bisa ada gangguan atau pemeliharaan. Komitmen tingkat layanan (SLA) hanya berlaku untuk paket Command, sesuai perjanjian tertulisnya.</p>

    <h2>11. Batasan tanggung jawab</h2>
    <p>Sejauh diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, atau kerugian akibat keputusan yang diambil berdasarkan hasil analisis. Total tanggung jawab kami paling banyak sebesar biaya yang dibayar klien dalam 12 bulan sebelum kejadian.</p>

    <h2>12. Penghentian</h2>
    <p>Klien dapat berhenti berlangganan kapan saja, dan berhentinya berlaku di akhir periode tagihan berjalan. Kami dapat menghentikan layanan bila klien melanggar ketentuan ini dan tidak memperbaikinya dalam 14 hari setelah diberi tahu. Setelah berhenti, klien dapat meminta ekspor data dalam 30 hari, sebelum data dihapus.</p>

    <h2>13. Perubahan ketentuan</h2>
    <p>Kami dapat mengubah ketentuan ini. Perubahan penting diberitahukan kepada pemilik workspace paling lambat 14 hari sebelum berlaku.</p>

    <h2>14. Hukum dan penyelesaian sengketa</h2>
    <p>Ketentuan ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan lebih dulu secara musyawarah dalam 30 hari. Bila tidak tercapai kesepakatan, sengketa diselesaikan di Pengadilan Negeri Jakarta Selatan.</p>

    <h2>15. Kontak</h2>
    <p>PT Primer Rectoverso Media, Gedung Cibis Nine Lt. 11, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, Jakarta Selatan, DKI Jakarta 12560. WhatsApp 0811-190-692, email hello@narriv.digital.</p>
  </>
);

const EN = (
  <>
    <p>These terms govern the use of Narriv (narriv.digital), a service provided by <b>PT Primer Rectoverso Media</b> (&quot;we&quot;), of Cibis Nine Building, 11th floor, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, South Jakarta, DKI Jakarta 12560, Indonesia. By creating an account or using Narriv, you and the organisation you represent (the &quot;client&quot;) accept these terms. The Indonesian version prevails.</p>

    <h2>1. The service</h2>
    <p>Narriv monitors public content (online news, YouTube, and social media when switched on) that contains the workspace&apos;s keywords, analyses it with automated systems including third-party AI models, and presents sentiment, issues, alerts, recommendations and reports. Narriv publishes nothing on the client&apos;s behalf.</p>

    <h2>2. Accounts and workspaces</h2>
    <ul>
      <li>You must give accurate details and keep your password confidential.</li>
      <li>Workspace owners and admins manage members, roles, settings and keywords, and are responsible for activity in their workspace.</li>
      <li>Tell us promptly if you suspect your account is being used without permission.</li>
    </ul>

    <h2>3. Trial</h2>
    <p>A trial runs for 14 days from the workspace&apos;s creation unless agreed otherwise in writing. During the trial the service is provided as is, free of charge. If a trial does not continue to a paid plan, we may pause monitoring and delete the workspace&apos;s data as the Privacy Policy describes.</p>

    <h2>4. Plans, fees and payment</h2>
    <ul>
      <li>Plans and prices are those on the Pricing page or in a written offer. Prices may change; a change applies from the next billing period after we give notice.</li>
      <li>Payment is by bank transfer against an invoice, monthly or yearly, within 14 days of the invoice date.</li>
      <li>If payment is late, we may pause the service after giving notice.</li>
      <li>Fees paid are not refundable unless agreed otherwise in writing.</li>
    </ul>

    <h2>5. Prohibited use</h2>
    <p>You may not use Narriv to:</p>
    <ul>
      <li>monitor, track or harass specific individuals,</li>
      <li>build a personal profile of someone without a legal basis,</li>
      <li>break the law, including the PDP Law and the Electronic Information and Transactions Law,</li>
      <li>access another workspace&apos;s data, or</li>
      <li>overload, reverse-engineer or copy Narriv&apos;s systems.</li>
    </ul>
    <p>We may suspend access if these terms are breached.</p>

    <h2>6. Public content and third-party sources</h2>
    <p>Monitored content comes from third parties and remains their property. We do not guarantee that sources are complete or available, since sources can change, restrict access or remove content.</p>

    <h2>7. Analysis and AI output</h2>
    <p>Sentiment, risk scores, issues, summaries and recommendations are generated automatically and can be wrong. They are input for your judgement, not legal, financial or professional advice. Decisions and actions remain the client&apos;s responsibility.</p>

    <h2>8. Client data and confidentiality</h2>
    <p>Data in a client&apos;s workspace belongs to the client. We process it only to provide the service, as the Privacy Policy describes, and keep it confidential. Each party keeps the other&apos;s non-public information confidential.</p>

    <h2>9. Intellectual property</h2>
    <p>Narriv, including its software, design and brand, belongs to us. Clients may use reports and exports for their internal purposes.</p>

    <h2>10. Availability</h2>
    <p>We aim to keep Narriv available, but outages and maintenance can happen. A service level agreement applies only to the Command plan, under its written agreement.</p>

    <h2>11. Limitation of liability</h2>
    <p>To the extent the law allows, we are not liable for indirect loss, lost profit, or loss from decisions taken on the basis of the analysis. Our total liability is capped at the fees the client paid in the 12 months before the event.</p>

    <h2>12. Termination</h2>
    <p>The client may stop the subscription at any time, effective at the end of the current billing period. We may end the service if the client breaches these terms and does not fix the breach within 14 days of notice. After termination, the client may ask for a data export within 30 days, before the data is deleted.</p>

    <h2>13. Changes</h2>
    <p>We may change these terms. Material changes are notified to workspace owners at least 14 days before they take effect.</p>

    <h2>14. Governing law and disputes</h2>
    <p>These terms are governed by the laws of the Republic of Indonesia. Disputes are first settled by negotiation within 30 days, and failing that, before the South Jakarta District Court.</p>

    <h2>15. Contact</h2>
    <p>PT Primer Rectoverso Media, Cibis Nine Building, 11th floor, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, South Jakarta, DKI Jakarta 12560, Indonesia. WhatsApp +62 811-190-692, email hello@narriv.digital.</p>
  </>
);

export default function TermsPage() {
  return <LegalPage title={["Terms of Service", "Ketentuan Layanan"]} updated={["Last updated: 12 November 2026", "Terakhir diperbarui: 12 November 2026"]} id={ID} en={EN} />;
}
