import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Narriv collects, uses and protects personal data, in line with Indonesia's Personal Data Protection Law (UU PDP).",
  alternates: { canonical: "/privacy" },
};

// Written against Indonesia's Personal Data Protection Law (UU No. 27 Tahun 2022) and what Narriv actually does
// today. Approved and in effect.

const ID = (
  <>
    <p>Kebijakan ini menjelaskan bagaimana <b>PT Primer Rectoverso Media</b> (&quot;kami&quot;), beralamat di Gedung Cibis Nine Lt. 11, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, Jakarta Selatan, DKI Jakarta 12560, memproses data pribadi di Narriv (narriv.digital). Kebijakan ini disusun dengan mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (&quot;UU PDP&quot;).</p>

    <h2>1. Peran kami</h2>
    <ul>
      <li><b>Data akun</b> pengguna Narriv: kami adalah pengendali data.</li>
      <li><b>Data di dalam workspace klien</b> (kata kunci, peringatan, kasus, laporan, dan konten yang dipantau): klien adalah pengendali data, dan kami memprosesnya atas nama klien sesuai perjanjian layanan.</li>
    </ul>

    <h2>2. Data yang kami proses</h2>
    <ul>
      <li><b>Data akun:</b> nama, alamat email, jabatan, kata sandi yang disimpan dalam bentuk hash (bukan teks asli), dan catatan masuk. Bila Anda masuk dengan Google, kami menerima nama dan email dari akun Google Anda.</li>
      <li><b>Data workspace:</b> nama brand, logo, pengaturan, anggota dan perannya, kata kunci, peringatan, kasus, rencana respons, laporan, dan riwayat aktivitas.</li>
      <li><b>Konten publik yang dipantau:</b> artikel berita, video, dan unggahan media sosial yang tersedia untuk umum dan memuat kata kunci workspace, beserta hasil analisisnya (sentimen, isu, dan risiko). Konten ini bisa menyebut nama orang.</li>
      <li><b>Data teknis:</b> alamat IP, jenis perangkat dan peramban, log permintaan, serta catatan pemakaian AI per workspace untuk keamanan dan penagihan.</li>
    </ul>

    <h2>3. Tujuan dan dasar pemrosesan</h2>
    <ul>
      <li>Menyediakan dan menjalankan layanan sesuai perjanjian dengan klien (pelaksanaan perjanjian).</li>
      <li>Mengamankan akun, mencegah penyalahgunaan, dan memperbaiki gangguan (kepentingan yang sah).</li>
      <li>Mengirim email yang diperlukan layanan, seperti kode verifikasi, atur ulang kata sandi, peringatan, dan laporan (pelaksanaan perjanjian).</li>
      <li>Memenuhi kewajiban hukum, misalnya pencatatan transaksi dan permintaan aparat yang sah (kewajiban hukum).</li>
    </ul>
    <p>Kami tidak menjual data pribadi dan tidak memakai data workspace klien untuk melatih model AI.</p>

    <h2>4. Penyedia layanan</h2>
    <p>Narriv berjalan di atas layanan pihak ketiga yang memproses data atas instruksi kami:</p>
    <ul>
      <li>Vercel: hosting aplikasi.</li>
      <li>Supabase: database.</li>
      <li>OpenAI: analisis sentimen dan isu, ringkasan, serta Ask Narriv.</li>
      <li>Anthropic: pengujian visibilitas brand di jawaban AI.</li>
      <li>Google: pencarian YouTube dan masuk dengan Google.</li>
      <li>Resend: pengiriman email.</li>
      <li>Apify: pengambilan konten media sosial, hanya untuk workspace yang mengaktifkannya.</li>
    </ul>
    <p>Teks yang dikirim ke penyedia AI dibatasi pada konten yang perlu dianalisis.</p>

    <h2>5. Transfer data ke luar Indonesia</h2>
    <p>Sebagian penyedia di atas menyimpan atau memproses data di luar Indonesia, antara lain di Jepang dan Amerika Serikat. Kami memilih penyedia dengan standar pelindungan data yang setara atau lebih tinggi, dan melakukan transfer sesuai Pasal 56 UU PDP.</p>

    <h2>6. Penyimpanan dan penghapusan</h2>
    <ul>
      <li>Data workspace disimpan selama langganan aktif, sesuai masa simpan paket: 30 hari untuk Pilot, 12 bulan untuk Intelligence dan Decision, atau sesuai perjanjian untuk Command.</li>
      <li>Setelah langganan berakhir, atau atas permintaan pemilik workspace, data workspace dihapus paling lambat 30 hari kemudian, kecuali yang wajib kami simpan menurut hukum.</li>
      <li>Data akun dihapus paling lambat 30 hari setelah akun ditutup.</li>
    </ul>

    <h2>7. Keamanan</h2>
    <p>Koneksi dienkripsi (HTTPS). Kata sandi disimpan sebagai hash. Data tiap workspace dipisahkan, dan anggota hanya melihat workspace yang mengundangnya. Perubahan penting dicatat di riwayat aktivitas. Bila terjadi kegagalan pelindungan data pribadi, kami memberi tahu pihak yang terdampak dan lembaga berwenang paling lambat 3 x 24 jam, sesuai Pasal 46 UU PDP.</p>

    <h2>8. Hak Anda</h2>
    <p>Sesuai UU PDP, Anda berhak:</p>
    <ul>
      <li>mendapat informasi tentang pemrosesan data Anda,</li>
      <li>mengakses dan mendapat salinan data Anda,</li>
      <li>memperbaiki data yang tidak akurat,</li>
      <li>meminta penghapusan data,</li>
      <li>menarik persetujuan yang pernah diberikan,</li>
      <li>mengajukan keberatan atas pemrosesan tertentu, dan</li>
      <li>meminta data Anda dalam format yang dapat dipindahkan.</li>
    </ul>
    <p>Kirim permintaan lewat kontak di bawah. Kami menanggapi paling lambat 3 x 24 jam dan menyelesaikannya sesuai batas waktu UU PDP. Bila data Anda ada di workspace klien, kami meneruskan permintaan ke klien tersebut sebagai pengendali data.</p>

    <h2>9. Orang yang disebut dalam konten publik</h2>
    <p>Narriv memantau konten yang sudah tersedia untuk umum. Bila Anda disebut dalam konten yang kami tampilkan dan ingin mengajukan keberatan atau penghapusan, hubungi kami. Kami akan menindaklanjutinya bersama klien terkait.</p>

    <h2>10. Cookie dan penyimpanan di perangkat</h2>
    <p>Kami memakai cookie dan penyimpanan lokal peramban hanya untuk menjaga Anda tetap masuk dan mengingat pilihan seperti bahasa. Kami tidak memakai cookie iklan.</p>

    <h2>11. Anak</h2>
    <p>Narriv ditujukan untuk organisasi dan tidak untuk anak di bawah 18 tahun.</p>

    <h2>12. Perubahan kebijakan</h2>
    <p>Bila kebijakan ini berubah secara penting, kami memberi tahu pemilik workspace lewat email atau di aplikasi sebelum perubahan berlaku.</p>

    <h2>13. Kontak</h2>
    <p>PT Primer Rectoverso Media, Gedung Cibis Nine Lt. 11, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, Jakarta Selatan, DKI Jakarta 12560. WhatsApp 0811-190-692, email hello@narriv.digital.</p>
  </>
);

const EN = (
  <>
    <p>This policy explains how <b>PT Primer Rectoverso Media</b> (&quot;we&quot;), of Cibis Nine Building, 11th floor, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, South Jakarta, DKI Jakarta 12560, Indonesia, processes personal data in Narriv (narriv.digital). It follows Indonesia&apos;s Personal Data Protection Law, Law No. 27 of 2022 (the &quot;PDP Law&quot;). The Indonesian version prevails.</p>

    <h2>1. Our role</h2>
    <ul>
      <li><b>Narriv user accounts:</b> we are the data controller.</li>
      <li><b>Data inside a client&apos;s workspace</b> (keywords, alerts, cases, reports and monitored content): the client is the controller, and we process it on the client&apos;s behalf under the service agreement.</li>
    </ul>

    <h2>2. Data we process</h2>
    <ul>
      <li><b>Account data:</b> name, email address, job title, a hash of your password (never the password itself) and sign-in records. If you sign in with Google, we receive your name and email from your Google account.</li>
      <li><b>Workspace data:</b> brand name, logo, settings, members and roles, keywords, alerts, cases, response plans, reports and activity history.</li>
      <li><b>Monitored public content:</b> publicly available news articles, videos and social media posts that contain the workspace&apos;s keywords, with their analysis (sentiment, issues and risk). This content can name people.</li>
      <li><b>Technical data:</b> IP address, device and browser type, request logs, and AI usage per workspace for security and billing.</li>
    </ul>

    <h2>3. Purposes and legal bases</h2>
    <ul>
      <li>Providing and running the service under the client agreement (performance of a contract).</li>
      <li>Securing accounts, preventing abuse and fixing faults (legitimate interest).</li>
      <li>Sending the emails the service needs, such as verification codes, password resets, alerts and reports (performance of a contract).</li>
      <li>Meeting legal obligations, such as transaction records and lawful requests from authorities (legal obligation).</li>
    </ul>
    <p>We do not sell personal data, and we do not use client workspace data to train AI models.</p>

    <h2>4. Service providers</h2>
    <p>Narriv runs on third-party services that process data on our instructions:</p>
    <ul>
      <li>Vercel: hosting.</li>
      <li>Supabase: database.</li>
      <li>OpenAI: sentiment and issue analysis, summaries and Ask Narriv.</li>
      <li>Anthropic: AI-answer visibility tests.</li>
      <li>Google: YouTube search and Google sign-in.</li>
      <li>Resend: email delivery.</li>
      <li>Apify: social media collection, only for workspaces that switch it on.</li>
    </ul>
    <p>Text sent to AI providers is limited to the content that needs analysing.</p>

    <h2>5. Transfers outside Indonesia</h2>
    <p>Some of these providers store or process data outside Indonesia, including in Japan and the United States. We choose providers with equal or higher data protection standards and transfer data in line with Article 56 of the PDP Law.</p>

    <h2>6. Retention and deletion</h2>
    <ul>
      <li>Workspace data is kept while the subscription is active, for the plan&apos;s retention period: 30 days on Pilot, 12 months on Intelligence and Decision, or as agreed on Command.</li>
      <li>When a subscription ends, or when the workspace owner asks, workspace data is deleted within 30 days, except what the law requires us to keep.</li>
      <li>Account data is deleted within 30 days of the account being closed.</li>
    </ul>

    <h2>7. Security</h2>
    <p>Connections are encrypted (HTTPS). Passwords are stored as hashes. Each workspace&apos;s data is kept apart, and members only see the workspaces they were invited to. Important changes are recorded in the activity history. If personal data protection fails, we notify the people affected and the authority within 3 x 24 hours, as Article 46 of the PDP Law requires.</p>

    <h2>8. Your rights</h2>
    <p>Under the PDP Law you have the right:</p>
    <ul>
      <li>to be told how your data is processed,</li>
      <li>to access your data and get a copy,</li>
      <li>to correct inaccurate data,</li>
      <li>to ask for your data to be deleted,</li>
      <li>to withdraw consent you gave,</li>
      <li>to object to certain processing, and</li>
      <li>to receive your data in a portable format.</li>
    </ul>
    <p>Send requests to the contact below. We reply within 3 x 24 hours and complete them within the PDP Law&apos;s time limits. If your data sits in a client&apos;s workspace, we pass the request to that client as the controller.</p>

    <h2>9. People named in public content</h2>
    <p>Narriv monitors content that is already public. If you are named in content we show and want to object or ask for removal, contact us and we will follow up with the client concerned.</p>

    <h2>10. Cookies and on-device storage</h2>
    <p>We use cookies and browser storage only to keep you signed in and to remember choices such as language. We use no advertising cookies.</p>

    <h2>11. Children</h2>
    <p>Narriv is meant for organisations and not for anyone under 18.</p>

    <h2>12. Changes</h2>
    <p>If this policy changes materially, we tell workspace owners by email or in the app before the change takes effect.</p>

    <h2>13. Contact</h2>
    <p>PT Primer Rectoverso Media, Cibis Nine Building, 11th floor, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu, South Jakarta, DKI Jakarta 12560, Indonesia. WhatsApp +62 811-190-692, email hello@narriv.digital.</p>
  </>
);

export default function PrivacyPage() {
  return <LegalPage title={["Privacy Policy", "Kebijakan Privasi"]} updated={["Last updated: 12 November 2026", "Terakhir diperbarui: 12 November 2026"]} id={ID} en={EN} />;
}
