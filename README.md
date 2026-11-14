# AkuntansiKu — Final Edition (Versi Resmi) ⚖️
**Platform Kalkulator HP Normal & 14 Alat Hitung Akuntansi Terpadu**

Versi Final Resmi dari **AkuntansiKu** yang telah disempurnakan tanpa batasan versi demo. Seluruh data transaksi jurnal dan riwayat perhitungan kini **tersimpan permanen** di browser Anda, dilengkapi tombol **Ekspor ke Excel (CSV)**, **Cetak / Simpan PDF**, serta dukungan **PWA (Progressive Web App)** untuk dipasang langsung di layar utama smartphone layaknya aplikasi native.

---

## 🌟 Peningkatan Utama Versi Final

1. **Penyimpanan Permanen (No More Demo Reset):**
   - Baris Jurnal Umum kini otomatis tersimpan di `localStorage` peramban Anda (`akuntansiku_journal_final`). Data transaksi tidak akan hilang saat browser di-refresh, ditutup, atau dibuka kembali esok hari.
2. **Ekspor Laporan ke Microsoft Excel (CSV):**
   - Unduh seluruh baris jurnal umum lengkap dengan status keseimbangan, total debit, dan total kredit hanya dengan satu klik tombol **"📥 Ekspor Excel"**.
   - Unduh seluruh riwayat perhitungan ke format spreadsheet dengan tombol **"📥 Ekspor CSV"**.
3. **Cetak & Simpan PDF Siap Pakai:**
   - Tombol **"🖨️ Cetak / PDF"** otomatis memformat laporan jurnal ke dalam layout kertas putih bersih dan rapi dengan garis tabel resmi akuntansi, siap diprint atau disimpan sebagai PDF.
4. **Kalkulator HP Normal Terintegrasi:**
   - Sasis kalkulator smartphone dengan tombol pintas akuntansi `+00` dan `+000`, persentase, hapus digit `⌫`, serta tombol salin dan simpan langsung ke riwayat.
   - Mendukung input keyboard fisik dan Numpad pada laptop/PC.
5. **Dukungan Progressive Web App (PWA):**
   - Dilengkapi `manifest.json`. Pada iPhone (Safari: *Share ➔ Add to Home Screen*) atau Android (Chrome: *Menu ➔ Install App*), aplikasi dapat diinstal dan dibuka layar penuh tanpa bar browser.
6. **100% Offline & Privat:**
   - Berjalan murni di perangkat Anda tanpa ketergantungan server atau database eksternal. Kerahasiaan data keuangan Anda terjaga 100%.

---

## 🧮 Katalog 14 Alat Hitung Akuntansi Khusus

### 1. Akuntansi Perusahaan Dagang & HPP
- **Harga Pokok Penjualan (HPP / COGS):** Pembelian Bersih, Barang Tersedia untuk Dijual (BTUD), hingga HPP akhir.
- **Kalkulator Markup:** Penetapan harga jual dari HPP dan persentase laba kotor.
- **Kalkulator Diskon:** Potongan hemat belanja dan harga bayar akhir.
- **Titik Impas (Break Even Point / BEP):** Menghitung BEP unit minimum dan omzet rupiah.

### 2. Kas & Pembukuan Siswa / Mahasiswa
- **Rekonsiliasi Kas Kecil (Petty Cash Imprest):** Pengujian fisik brankas kasir, deteksi *Cash Overage* / *Cash Shortage*, dan dana pengisian kembali.
- **Persamaan Akuntansi:** `Ekuitas = Aset - Liabilitas`.
- **Laba / Rugi:** Analisis operasional pendapatan, beban, dan profit margin.

### 3. Perpajakan & Penggajian Karyawan
- **PPh Final UMKM 0,5% (PP 55/2022):** Simulasi pajak omzet bulanan dengan aturan pembebasan s.d. **Rp 500 Juta** per tahun untuk Wajib Pajak Orang Pribadi.
- **Gaji Bersih Karyawan (Take Home Pay / Payroll):** Gaji pokok, tunjangan, potongan BPJS Kesehatan (1%), BPJS Ketenagakerjaan (3%), kasbon, dan pajak.
- **Kalkulator PPN:** Tarif fleksibel (11% / 12%) dengan hitungan DPP dan total akhir.

### 4. Analisis & Investasi Keuangan
- **Penyusutan Aset (Garis Lurus):** Beban depresiasi tahunan dan bulanan aset tetap.
- **Nilai Waktu Uang (TVM: FV & PV):** Bunga majemuk untuk penilaian investasi dan obligasi.
- **Rasio Keuangan (CR & DR):** Mengukur likuiditas (*Current Ratio*) dan solvabilitas (*Debt Ratio*).
- **Bunga Sederhana (Simple Interest):** Menghitung akumulasi bunga pinjaman atau simpanan modal.

---

## 📖 Lembar Jurnal Umum

- **Pencegahan Error Alami:** Pilihan saklar segmen **DEBIT** vs **KREDIT** menjamin satu baris hanya mencatat salah satu sisi (sesuai kaidah akuntansi baku).
- **Balance Meter:** Status visual instan:
  - ⚖️ **Jurnal Seimbang (Balanced)** jika Total Debit == Total Kredit.
  - ⚠️ **Belum Seimbang (Unbalanced)** dengan keterangan selisih rupiah.
- **Contoh Cepat:** Tombol 1-klik untuk memasukkan transaksi seimbang (Setoran Modal, Beli Perlengkapan Tunai, Pembayaran Gaji).
- **Alat Ekspor:** Unduh ke Excel (CSV), Cetak/PDF, dan Bersihkan Jurnal.

---

## 📁 Struktur Berkas

Semua berkas berada di dalam satu folder tunggal:
```text
~/Documents/akuntansiku/
├── index.html        # Aplikasi web utama (Versi Final Resmi)
├── manifest.json     # Konfigurasi PWA untuk instalasi di layar HP
├── css/
│   └── style.css     # Desain dark luxury, mobile-first, & print layout
├── js/
│   └── app.js        # Logika kalkulator, penyimpanan permanen, & ekspor
└── README.md         # Dokumentasi resmi
```

---

## 🚀 Cara Menjalankan

Cukup klik ganda pada berkas **`index.html`** di folder **`Documents/akuntansiku`** untuk langsung menggunakannya di browser favorit Anda (Google Chrome, Safari, Firefox, Edge).

---
*AkuntansiKu — Edisi Final Resmi.*
