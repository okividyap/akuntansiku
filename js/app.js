/**
 * AkuntansiKu — Core Application Logic
 * Implements PRD requirements for all 9 accounting calculators,
 * General Journal (Jurnal Umum) balance validation,
 * LocalStorage history management, and responsive UI interactions.
 */

// --- Global State & Configuration ---
const APP_STORAGE_KEY = 'akuntansiku_history_v1';
const JOURNAL_STORAGE_KEY = 'akuntansiku_journal_final';
const MAX_HISTORY_ITEMS = 50;

let currentHistory = [];
let currentJournal = [];

function loadJournal() {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    currentJournal = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Gagal memuat jurnal:", e);
    currentJournal = [];
  }
}

function saveJournal() {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(currentJournal));
  } catch (e) {
    console.error("Gagal menyimpan jurnal:", e);
  }
}

// --- Utility Functions ---

/**
 * Format a number to Indonesian Rupiah currency string.
 * Example: 10000000 -> "Rp 10.000.000"
 */
function formatRupiah(value, withPrefix = true) {
  if (value === null || value === undefined || isNaN(value)) return withPrefix ? 'Rp 0' : '0';
  const isNegative = value < 0;
  const absVal = Math.abs(value);
  
  // Format with Indonesian thousand dots and decimal comma if needed
  const parts = absVal.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1] === '00' ? '' : ',' + parts[1];
  
  const sign = isNegative ? '-' : '';
  const prefix = withPrefix ? 'Rp ' : '';
  return `${sign}${prefix}${intPart}${decimalPart}`;
}

/**
 * Format a decimal or ratio number with Indonesian comma separator.
 * Example: 2.5 -> "2,50"
 */
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const fixed = Number(value).toFixed(decimals);
  const parts = fixed.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1] ? ',' + parts[1] : '';
  return `${intPart}${decPart}`;
}

/**
 * Parse an input string into a valid clean positive float.
 * Handles numbers with thousand dots or commas.
 */
function parseInputValue(str) {
  if (!str) return NaN;
  if (typeof str === 'number') return str;
  // Remove spaces, currency symbols, and fix separators
  let clean = str.toString().trim().replace(/Rp|\s/gi, '');
  // If formatted like 10.000.000,50 -> remove dots and replace comma with dot
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes('.')) {
    // If only dots, determine if it's thousand separator (e.g. 10.000) or decimal
    const dotParts = clean.split('.');
    if (dotParts.length > 2 || dotParts[1].length === 3) {
      clean = clean.replace(/\./g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  return parseFloat(clean);
}

/**
 * Format date to Indonesian localized format
 */
function formatCurrentDateTime() {
  const now = new Date();
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return now.toLocaleDateString('id-ID', options);
}

/**
 * Show a floating toast notification
 */
function showToast(message, icon = '✓') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span style="color: var(--accent-pink);">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

/**
 * Copy text to clipboard with toast confirmation
 */
function copyToClipboard(text, customMsg = 'Hasil berhasil disalin ke clipboard!') {
  if (!navigator.clipboard) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(customMsg, '📋');
    } catch (err) {
      showToast('Gagal menyalin text', '⚠️');
    }
    document.body.removeChild(textArea);
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast(customMsg, '📋');
  }).catch(() => {
    showToast('Gagal menyalin text', '⚠️');
  });
}

// --- Navigation & View Switching ---

function switchTab(viewId) {
  // Update view panels
  const panels = document.querySelectorAll('.view-panel');
  panels.forEach(p => p.classList.remove('active'));

  const targetPanel = document.getElementById(viewId);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // Update mobile bottom nav active states
  const mobileNavBtns = document.querySelectorAll('.nav-item-btn');
  mobileNavBtns.forEach(btn => {
    if (btn.dataset.target === viewId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update desktop sidebar active states
  const sidebarBtns = document.querySelectorAll('.sidebar-nav-btn');
  sidebarBtns.forEach(btn => {
    if (btn.dataset.target === viewId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // If opening history, refresh list
  if (viewId === 'view-history') {
    renderHistoryList();
  }
  // If opening journal, refresh table
  if (viewId === 'view-journal') {
    renderJournal();
  }
}

// --- Calculator Directory & Detail View Management ---

function openCalculatorDetail(calcId) {
  // Switch to calculator tab first if not already there
  switchTab('view-calculators');

  // Hide the directory list and show the specific calculator work area
  const dirView = document.getElementById('calc-directory-wrap');
  const workAreas = document.querySelectorAll('.calc-work-area');
  
  if (dirView) dirView.style.display = 'none';
  workAreas.forEach(area => area.classList.remove('active'));

  const targetArea = document.getElementById(`work-${calcId}`);
  if (targetArea) {
    targetArea.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function backToCalculatorList() {
  const dirView = document.getElementById('calc-directory-wrap');
  const workAreas = document.querySelectorAll('.calc-work-area');
  
  workAreas.forEach(area => area.classList.remove('active'));
  if (dirView) dirView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- LocalStorage History Management ---

function loadHistory() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (raw) {
      currentHistory = JSON.parse(raw);
    } else {
      currentHistory = [];
    }
  } catch (e) {
    console.error('Error loading history from localStorage:', e);
    currentHistory = [];
  }
  updateHistoryBadges();
}

function saveHistoryItem(item) {
  const entry = {
    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    timestamp: formatCurrentDateTime(),
    ...item
  };

  // Insert to the front (FIFO max 50)
  currentHistory.unshift(entry);
  if (currentHistory.length > MAX_HISTORY_ITEMS) {
    currentHistory.pop();
  }

  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(currentHistory));
  } catch (e) {
    console.error('Error saving history to localStorage:', e);
  }

  updateHistoryBadges();
  renderHistoryList();
}

function clearAllHistory() {
  if (currentHistory.length === 0) {
    showToast('Riwayat sudah kosong', 'ℹ️');
    return;
  }
  if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat perhitungan?')) {
    currentHistory = [];
    try {
      localStorage.removeItem(APP_STORAGE_KEY);
    } catch (e) {}
    updateHistoryBadges();
    renderHistoryList();
    showToast('Seluruh riwayat berhasil dihapus', '🗑️');
  }
}

function deleteHistoryItem(id) {
  currentHistory = currentHistory.filter(item => item.id !== id);
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(currentHistory));
  } catch (e) {}
  updateHistoryBadges();
  renderHistoryList();
  showToast('Item riwayat dihapus', '🗑️');
}

function updateHistoryBadges() {
  const count = currentHistory.length;
  const badges = document.querySelectorAll('.history-count-val');
  badges.forEach(b => {
    b.textContent = count;
  });

  const headerStat = document.getElementById('home-history-count');
  if (headerStat) headerStat.textContent = count;
}

function renderHistoryList() {
  const container = document.getElementById('history-container');
  if (!container) return;

  if (currentHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🕒</div>
        <div class="empty-state-title">Belum Ada Riwayat</div>
        <div class="empty-state-desc">Hasil perhitungan dari kalkulator akan otomatis tersimpan di sini pada browser Anda.</div>
      </div>
    `;
    return;
  }

  let html = '<div class="history-list">';
  currentHistory.forEach(item => {
    html += `
      <div class="history-card">
        <div class="history-card-top">
          <span class="history-calc-tag">${item.icon || '🧮'} ${item.calcName}</span>
          <span class="history-time">${item.timestamp}</span>
        </div>
        <div class="history-card-body">
          <div>
            <div class="history-res-label">${item.resultLabel}</div>
            <div class="history-res-val">${item.resultValue}</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-copy-result" onclick="copyToClipboard('${item.resultValue}', 'Hasil disalin!')" title="Salin">📋</button>
            <button class="btn-del-row" onclick="deleteHistoryItem('${item.id}')" title="Hapus entri">✕</button>
          </div>
        </div>
        ${item.summary ? `<div class="history-card-summary">${item.summary}</div>` : ''}
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ===================================================================
// 9 CALCULATORS IMPLEMENTATION WITH COMPLETE VALIDATIONS & STEPS
// ===================================================================

/** Helper to show error message inside specific calculator card */
function showCalcAlert(calcId, message) {
  const alertEl = document.getElementById(`alert-${calcId}`);
  if (alertEl) {
    alertEl.innerHTML = `<span class="alert-icon">⚠️</span> <div>${message}</div>`;
    alertEl.classList.add('visible');
  }
}

function hideCalcAlert(calcId) {
  const alertEl = document.getElementById(`alert-${calcId}`);
  if (alertEl) {
    alertEl.classList.remove('visible');
    alertEl.innerHTML = '';
  }
}

function displayCalcResult(calcId, config) {
  const resultCard = document.getElementById(`res-${calcId}`);
  if (!resultCard) return;

  resultCard.classList.remove('visible');
  void resultCard.offsetWidth; // trigger reflow for animation

  // Set main value
  const mainValEl = resultCard.querySelector('.result-main-value');
  if (mainValEl) {
    mainValEl.textContent = config.mainValue;
    mainValEl.className = 'result-main-value ' + (config.valueClass || 'positive');
  }

  // Set sub label
  const subLabelEl = resultCard.querySelector('.result-sub-label');
  if (subLabelEl) subLabelEl.textContent = config.subLabel || 'Hasil Perhitungan';

  // Set formula step
  const formulaStepEl = resultCard.querySelector('.formula-step');
  if (formulaStepEl) formulaStepEl.textContent = config.formulaStep || '';

  // Set details grid
  const detailsGridEl = resultCard.querySelector('.result-details-grid');
  if (detailsGridEl && config.details && config.details.length > 0) {
    detailsGridEl.innerHTML = config.details.map(d => `
      <div class="detail-item">
        <div class="detail-item-label">${d.label}</div>
        <div class="detail-item-val">${d.value}</div>
      </div>
    `).join('');
    detailsGridEl.style.display = 'grid';
  } else if (detailsGridEl) {
    detailsGridEl.style.display = 'none';
  }

  // Hook copy button
  const copyBtn = resultCard.querySelector('.btn-copy-result');
  if (copyBtn) {
    copyBtn.onclick = () => copyToClipboard(config.mainValue);
  }

  resultCard.classList.add('visible');
}

// -------------------------------------------------------------
// 1. Persamaan Akuntansi (Ekuitas = Aset - Liabilitas)
// -------------------------------------------------------------
function hitungPersamaanAkuntansi() {
  const calcId = 'persamaan';
  hideCalcAlert(calcId);

  const aset = parseInputValue(document.getElementById('p-aset').value);
  const liabilitas = parseInputValue(document.getElementById('p-liabilitas').value);

  if (isNaN(aset) || isNaN(liabilitas)) {
    showCalcAlert(calcId, 'Mohon isi Total Aset dan Total Liabilitas dengan angka yang valid.');
    return;
  }
  if (aset < 0 || liabilitas < 0) {
    showCalcAlert(calcId, 'Nilai aset dan liabilitas tidak boleh bernilai negatif.');
    return;
  }

  const ekuitas = aset - liabilitas;
  const formattedEkuitas = formatRupiah(ekuitas);
  const stepText = `Ekuitas = ${formatRupiah(aset)} - ${formatRupiah(liabilitas)} = ${formattedEkuitas}`;

  displayCalcResult(calcId, {
    mainValue: formattedEkuitas,
    subLabel: 'Total Nilai Ekuitas Pemilik',
    formulaStep: stepText,
    details: [
      { label: 'Total Aset', value: formatRupiah(aset) },
      { label: 'Total Liabilitas', value: formatRupiah(liabilitas) },
      { label: 'Aset = Liab + Ekuitas', value: `${formatRupiah(liabilitas + ekuitas)} (Balance)` }
    ]
  });

  saveHistoryItem({
    calcName: 'Persamaan Akuntansi',
    icon: '⚖️',
    resultLabel: 'Ekuitas',
    resultValue: formattedEkuitas,
    summary: stepText
  });
}

function setExamplePersamaan() {
  document.getElementById('p-aset').value = '10.000.000';
  document.getElementById('p-liabilitas').value = '4.000.000';
  hitungPersamaanAkuntansi();
}

// -------------------------------------------------------------
// 2. Kalkulator Laba/Rugi (Laba/Rugi = Pendapatan - Beban)
// -------------------------------------------------------------
function hitungLabaRugi() {
  const calcId = 'labarugi';
  hideCalcAlert(calcId);

  const pendapatan = parseInputValue(document.getElementById('lr-pendapatan').value);
  const beban = parseInputValue(document.getElementById('lr-beban').value);

  if (isNaN(pendapatan) || isNaN(beban)) {
    showCalcAlert(calcId, 'Mohon isi Total Pendapatan dan Total Beban dengan angka yang valid.');
    return;
  }
  if (pendapatan < 0 || beban < 0) {
    showCalcAlert(calcId, 'Nilai pendapatan dan beban tidak boleh negatif.');
    return;
  }

  const selisih = pendapatan - beban;
  let statusText = '';
  let valueClass = 'positive';

  if (selisih > 0) {
    statusText = 'Laba Bersih (Net Profit)';
    valueClass = 'profit';
  } else if (selisih < 0) {
    statusText = 'Rugi Bersih (Net Loss)';
    valueClass = 'loss';
  } else {
    statusText = 'Titik Impas (Break Even)';
    valueClass = 'positive';
  }

  const formattedVal = formatRupiah(selisih);
  const stepText = `Hasil = ${formatRupiah(pendapatan)} - ${formatRupiah(beban)} = ${formattedVal} (${statusText})`;

  const marginPersen = pendapatan > 0 ? ((selisih / pendapatan) * 100).toFixed(1) + '%' : '0%';

  displayCalcResult(calcId, {
    mainValue: formattedVal,
    valueClass: valueClass,
    subLabel: statusText,
    formulaStep: stepText,
    details: [
      { label: 'Pendapatan', value: formatRupiah(pendapatan) },
      { label: 'Total Beban', value: formatRupiah(beban) },
      { label: 'Profit Margin', value: marginPersen }
    ]
  });

  saveHistoryItem({
    calcName: 'Laba / Rugi',
    icon: '📈',
    resultLabel: statusText,
    resultValue: formattedVal,
    summary: stepText
  });
}

function setExampleLabaRugi() {
  document.getElementById('lr-pendapatan').value = '8.000.000';
  document.getElementById('lr-beban').value = '5.000.000';
  hitungLabaRugi();
}

// -------------------------------------------------------------
// 3. Kalkulator PPN (PPN = DPP × Tarif, Total = DPP + PPN)
// -------------------------------------------------------------
function hitungPPN() {
  const calcId = 'ppn';
  hideCalcAlert(calcId);

  const dpp = parseInputValue(document.getElementById('ppn-dpp').value);
  const tarif = parseInputValue(document.getElementById('ppn-tarif').value);

  if (isNaN(dpp) || isNaN(tarif)) {
    showCalcAlert(calcId, 'Mohon isi Dasar Pengenaan Pajak (DPP) dan Tarif PPN.');
    return;
  }
  if (dpp < 0 || tarif < 0) {
    showCalcAlert(calcId, 'Nilai DPP dan Tarif PPN tidak boleh negatif.');
    return;
  }

  const nominalPPN = dpp * (tarif / 100);
  const totalAkhir = dpp + nominalPPN;

  const formattedPPN = formatRupiah(nominalPPN);
  const formattedTotal = formatRupiah(totalAkhir);
  const stepText = `PPN (${tarif}%) = ${formatRupiah(dpp)} × ${tarif}% = ${formattedPPN} | Total = ${formattedTotal}`;

  displayCalcResult(calcId, {
    mainValue: formattedPPN,
    subLabel: `Nominal PPN Terutang (Tarif ${tarif}%)`,
    formulaStep: stepText,
    details: [
      { label: 'DPP (Dasar Pengenaan)', value: formatRupiah(dpp) },
      { label: 'Tarif PPN', value: `${formatNumber(tarif, 1)}%` },
      { label: 'Total Bayar Akhir', value: formattedTotal }
    ]
  });

  saveHistoryItem({
    calcName: 'Pajak PPN',
    icon: '🧾',
    resultLabel: 'PPN Terutang',
    resultValue: formattedPPN,
    summary: stepText
  });
}

function setExamplePPN() {
  document.getElementById('ppn-dpp').value = '10.000.000';
  document.getElementById('ppn-tarif').value = '12';
  hitungPPN();
}

// -------------------------------------------------------------
// 4. Kalkulator Diskon (Potongan = Harga × %, Akhir = Harga - Potongan)
// -------------------------------------------------------------
function hitungDiskon() {
  const calcId = 'diskon';
  hideCalcAlert(calcId);

  const hargaAwal = parseInputValue(document.getElementById('disc-harga').value);
  const diskon = parseInputValue(document.getElementById('disc-persen').value);

  if (isNaN(hargaAwal) || isNaN(diskon)) {
    showCalcAlert(calcId, 'Mohon isi Harga Awal dan Persentase Diskon.');
    return;
  }
  if (hargaAwal < 0 || diskon < 0) {
    showCalcAlert(calcId, 'Harga awal dan persentase diskon tidak boleh bernilai negatif.');
    return;
  }
  if (diskon > 100) {
    showCalcAlert(calcId, 'Persentase diskon tidak boleh melebihi 100%.');
    return;
  }

  const potongan = hargaAwal * (diskon / 100);
  const hargaAkhir = hargaAwal - potongan;

  const formattedAkhir = formatRupiah(hargaAkhir);
  const formattedPotongan = formatRupiah(potongan);
  const stepText = `Potongan = ${formatRupiah(hargaAwal)} × ${diskon}% = ${formattedPotongan} | Harga Akhir = ${formattedAkhir}`;

  displayCalcResult(calcId, {
    mainValue: formattedAkhir,
    subLabel: 'Harga Akhir yang Harus Dibayar',
    formulaStep: stepText,
    details: [
      { label: 'Harga Semula', value: formatRupiah(hargaAwal) },
      { label: 'Hemat Potongan', value: formattedPotongan },
      { label: 'Diskon', value: `${formatNumber(diskon, 1)}%` }
    ]
  });

  saveHistoryItem({
    calcName: 'Diskon Belanja',
    icon: '🏷️',
    resultLabel: 'Harga Akhir',
    resultValue: formattedAkhir,
    summary: stepText
  });
}

function setExampleDiskon() {
  document.getElementById('disc-harga').value = '100.000';
  document.getElementById('disc-persen').value = '10';
  hitungDiskon();
}

// -------------------------------------------------------------
// 5. Kalkulator Markup (Untung = HPP × %, Harga Jual = HPP + Untung)
// -------------------------------------------------------------
function hitungMarkup() {
  const calcId = 'markup';
  hideCalcAlert(calcId);

  const hpp = parseInputValue(document.getElementById('mk-hpp').value);
  const markupPersen = parseInputValue(document.getElementById('mk-persen').value);

  if (isNaN(hpp) || isNaN(markupPersen)) {
    showCalcAlert(calcId, 'Mohon isi Harga Pokok (HPP) dan Persentase Markup.');
    return;
  }
  if (hpp < 0 || markupPersen < 0) {
    showCalcAlert(calcId, 'Harga pokok dan persentase markup tidak boleh bernilai negatif.');
    return;
  }

  const keuntungan = hpp * (markupPersen / 100);
  const hargaJual = hpp + keuntungan;
  const grossMargin = hargaJual > 0 ? ((keuntungan / hargaJual) * 100).toFixed(1) + '%' : '0%';

  const formattedJual = formatRupiah(hargaJual);
  const formattedUntung = formatRupiah(keuntungan);
  const stepText = `Keuntungan (${markupPersen}%) = ${formattedUntung} | Harga Jual = ${formatRupiah(hpp)} + ${formattedUntung} = ${formattedJual}`;

  displayCalcResult(calcId, {
    mainValue: formattedJual,
    subLabel: 'Rekomendasi Harga Jual',
    formulaStep: stepText,
    details: [
      { label: 'Harga Pokok (HPP)', value: formatRupiah(hpp) },
      { label: 'Nominal Keuntungan', value: formattedUntung },
      { label: 'Gross Margin (dari Jual)', value: grossMargin }
    ]
  });

  saveHistoryItem({
    calcName: 'Markup Harga',
    icon: '🏷️',
    resultLabel: 'Harga Jual',
    resultValue: formattedJual,
    summary: stepText
  });
}

function setExampleMarkup() {
  document.getElementById('mk-hpp').value = '50.000';
  document.getElementById('mk-persen').value = '25';
  hitungMarkup();
}

// -------------------------------------------------------------
// 6. Penyusutan Aset — Garis Lurus
// -------------------------------------------------------------
function hitungPenyusutan() {
  const calcId = 'penyusutan';
  hideCalcAlert(calcId);

  const perolehan = parseInputValue(document.getElementById('dep-perolehan').value);
  const residu = parseInputValue(document.getElementById('dep-residu').value);
  const umur = parseInputValue(document.getElementById('dep-umur').value);

  if (isNaN(perolehan) || isNaN(residu) || isNaN(umur)) {
    showCalcAlert(calcId, 'Mohon isi seluruh data: Harga Perolehan, Nilai Residu, dan Umur Manfaat.');
    return;
  }
  if (perolehan < 0 || residu < 0) {
    showCalcAlert(calcId, 'Harga perolehan dan nilai residu tidak boleh bernilai negatif.');
    return;
  }
  if (umur <= 0) {
    showCalcAlert(calcId, 'Umur manfaat harus lebih besar dari 0 tahun untuk mencegah pembagian dengan nol.');
    return;
  }
  if (residu > perolehan) {
    showCalcAlert(calcId, 'Nilai residu tidak boleh melebihi harga perolehan aset.');
    return;
  }

  const dasarPenyusutan = perolehan - residu;
  const bebanTahunan = dasarPenyusutan / umur;
  const bebanBulanan = bebanTahunan / 12;

  const formattedTahunan = formatRupiah(bebanTahunan);
  const formattedBulanan = formatRupiah(bebanBulanan);
  const stepText = `Penyusutan/Tahun = (${formatRupiah(perolehan)} - ${formatRupiah(residu)}) ÷ ${umur} tahun = ${formattedTahunan}/thn (${formattedBulanan}/bln)`;

  displayCalcResult(calcId, {
    mainValue: formattedTahunan + ' / thn',
    subLabel: 'Beban Penyusutan Tahunan',
    formulaStep: stepText,
    details: [
      { label: 'Dasar Penyusutan', value: formatRupiah(dasarPenyusutan) },
      { label: 'Penyusutan Bulanan', value: formattedBulanan },
      { label: 'Sisa Nilai Akhir (Residu)', value: formatRupiah(residu) }
    ]
  });

  saveHistoryItem({
    calcName: 'Penyusutan Garis Lurus',
    icon: '📉',
    resultLabel: 'Penyusutan/Thn',
    resultValue: formattedTahunan,
    summary: stepText
  });
}

function setExamplePenyusutan() {
  document.getElementById('dep-perolehan').value = '12.000.000';
  document.getElementById('dep-residu').value = '2.000.000';
  document.getElementById('dep-umur').value = '5';
  hitungPenyusutan();
}

// -------------------------------------------------------------
// 7. Break Even Point (BEP)
// -------------------------------------------------------------
function hitungBEP() {
  const calcId = 'bep';
  hideCalcAlert(calcId);

  const biayaTetap = parseInputValue(document.getElementById('bep-tetap').value);
  const hargaJual = parseInputValue(document.getElementById('bep-jual').value);
  const biayaVariabel = parseInputValue(document.getElementById('bep-variabel').value);

  if (isNaN(biayaTetap) || isNaN(hargaJual) || isNaN(biayaVariabel)) {
    showCalcAlert(calcId, 'Mohon isi Biaya Tetap, Harga Jual per Unit, dan Biaya Variabel per Unit.');
    return;
  }
  if (biayaTetap < 0 || hargaJual < 0 || biayaVariabel < 0) {
    showCalcAlert(calcId, 'Semua nilai input tidak boleh bernilai negatif.');
    return;
  }
  if (hargaJual <= biayaVariabel) {
    showCalcAlert(calcId, 'Harga jual per unit harus lebih besar daripada biaya variabel per unit agar margin kontribusi positif.');
    return;
  }

  const marginKontribusi = hargaJual - biayaVariabel;
  const bepUnit = biayaTetap / marginKontribusi;
  const bepUnitBulat = Math.ceil(bepUnit);
  const bepRupiah = bepUnitBulat * hargaJual;

  const formattedUnit = `${formatNumber(bepUnit, 2)} Unit`;
  const formattedRupiahVal = formatRupiah(bepRupiah);
  const stepText = `Margin = ${formatRupiah(marginKontribusi)}/unit | BEP = ${formatRupiah(biayaTetap)} ÷ ${formatRupiah(marginKontribusi)} = ${formattedUnit} (Dibulatkan: ${bepUnitBulat} Unit)`;

  displayCalcResult(calcId, {
    mainValue: `${bepUnitBulat} Unit`,
    subLabel: `Titik Impas Minimum (Setara ${formattedRupiahVal})`,
    formulaStep: stepText,
    details: [
      { label: 'BEP Desimal Tepat', value: `${formatNumber(bepUnit, 2)} Unit` },
      { label: 'Margin Kontribusi / Unit', value: formatRupiah(marginKontribusi) },
      { label: 'Omzet BEP Rupiah', value: formattedRupiahVal }
    ]
  });

  saveHistoryItem({
    calcName: 'Break Even Point',
    icon: '🎯',
    resultLabel: 'BEP Unit',
    resultValue: `${bepUnitBulat} Unit`,
    summary: stepText
  });
}

function setExampleBEP() {
  document.getElementById('bep-tetap').value = '1.000.000';
  document.getElementById('bep-jual').value = '50.000';
  document.getElementById('bep-variabel').value = '30.000';
  hitungBEP();
}

// -------------------------------------------------------------
// 8. Rasio Keuangan (Current Ratio & Debt Ratio)
// -------------------------------------------------------------
function hitungRasio() {
  const calcId = 'rasio';
  hideCalcAlert(calcId);

  const asetLancar = parseInputValue(document.getElementById('r-aset-lancar').value);
  const liabLancar = parseInputValue(document.getElementById('r-liab-lancar').value);
  const totalLiab = parseInputValue(document.getElementById('r-total-liab').value);
  const totalAset = parseInputValue(document.getElementById('r-total-aset').value);

  if (isNaN(asetLancar) || isNaN(liabLancar) || isNaN(totalLiab) || isNaN(totalAset)) {
    showCalcAlert(calcId, 'Mohon isi keempat data rasio: Aset Lancar, Liabilitas Lancar, Total Liabilitas, dan Total Aset.');
    return;
  }
  if (asetLancar < 0 || liabLancar < 0 || totalLiab < 0 || totalAset < 0) {
    showCalcAlert(calcId, 'Nilai rasio tidak boleh negatif.');
    return;
  }
  if (liabLancar === 0) {
    showCalcAlert(calcId, 'Liabilitas lancar tidak boleh 0 sebagai pembagi Current Ratio.');
    return;
  }
  if (totalAset === 0) {
    showCalcAlert(calcId, 'Total aset tidak boleh 0 sebagai pembagi Debt Ratio.');
    return;
  }

  const currentRatio = asetLancar / liabLancar;
  const debtRatio = (totalLiab / totalAset) * 100;

  const crText = `${formatNumber(currentRatio, 2)}x`;
  const drText = `${formatNumber(debtRatio, 2)}%`;
  const stepText = `Current Ratio = ${formatRupiah(asetLancar)} ÷ ${formatRupiah(liabLancar)} = ${crText} | Debt Ratio = (${formatRupiah(totalLiab)} ÷ ${formatRupiah(totalAset)}) × 100% = ${drText}`;

  let statusLikuiditas = currentRatio >= 1.5 ? 'Sangat Aman (Likuid)' : currentRatio >= 1.0 ? 'Cukup Aman' : 'Kurang Likuid (< 1.0x)';
  let statusSolvabilitas = debtRatio <= 50 ? 'Sehat (Utang < 50%)' : 'Leverage Tinggi (> 50%)';

  displayCalcResult(calcId, {
    mainValue: `${crText} (CR)`,
    subLabel: `Current Ratio: ${crText} | Debt Ratio: ${drText}`,
    formulaStep: stepText,
    details: [
      { label: 'Current Ratio (CR)', value: `${crText} (${statusLikuiditas})` },
      { label: 'Debt Ratio (DR)', value: `${drText} (${statusSolvabilitas})` },
      { label: 'Modal Kerja Bersih', value: formatRupiah(asetLancar - liabLancar) }
    ]
  });

  saveHistoryItem({
    calcName: 'Rasio Keuangan',
    icon: '📊',
    resultLabel: 'Current & Debt Ratio',
    resultValue: `${crText} / ${drText}`,
    summary: stepText
  });
}

function setExampleRasio() {
  document.getElementById('r-aset-lancar').value = '10.000.000';
  document.getElementById('r-liab-lancar').value = '5.000.000';
  document.getElementById('r-total-liab').value = '6.000.000';
  document.getElementById('r-total-aset').value = '15.000.000';
  hitungRasio();
}

// -------------------------------------------------------------
// 9. Bunga Sederhana (Simple Interest)
// -------------------------------------------------------------
function hitungBunga() {
  const calcId = 'bunga';
  hideCalcAlert(calcId);

  const modal = parseInputValue(document.getElementById('b-modal').value);
  const bungaPersen = parseInputValue(document.getElementById('b-persen').value);
  const waktu = parseInputValue(document.getElementById('b-waktu').value);

  if (isNaN(modal) || isNaN(bungaPersen) || isNaN(waktu)) {
    showCalcAlert(calcId, 'Mohon lengkapi Modal Awal, Suku Bunga per Tahun, dan Jangka Waktu (Tahun).');
    return;
  }
  if (modal < 0 || bungaPersen < 0 || waktu < 0) {
    showCalcAlert(calcId, 'Semua nilai input tidak boleh bernilai negatif.');
    return;
  }

  const totalBunga = modal * (bungaPersen / 100) * waktu;
  const nilaiAkhir = modal + totalBunga;

  const formattedBunga = formatRupiah(totalBunga);
  const formattedAkhir = formatRupiah(nilaiAkhir);
  const stepText = `Bunga = ${formatRupiah(modal)} × ${bungaPersen}% × ${waktu} thn = ${formattedBunga} | Total Akhir = ${formattedAkhir}`;

  displayCalcResult(calcId, {
    mainValue: formattedAkhir,
    subLabel: `Nilai Akhir (Modal + Bunga ${waktu} Tahun)`,
    formulaStep: stepText,
    details: [
      { label: 'Modal Pokok', value: formatRupiah(modal) },
      { label: 'Total Bunga Didapat', value: formattedBunga },
      { label: 'Bunga per Tahun', value: waktu > 0 ? formatRupiah(totalBunga / waktu) : formatRupiah(0) }
    ]
  });

  saveHistoryItem({
    calcName: 'Bunga Sederhana',
    icon: '💰',
    resultLabel: 'Nilai Akhir',
    resultValue: formattedAkhir,
    summary: stepText
  });
}

function setExampleBunga() {
  document.getElementById('b-modal').value = '5.000.000';
  document.getElementById('b-persen').value = '6';
  document.getElementById('b-waktu').value = '2';
  hitungBunga();
}

// ===================================================================
// JURNAL UMUM (Ledger) IMPLEMENTATION
// FR-07: Tambah baris jurnal
// FR-08: Sistem menghitung total debit dan kredit
// FR-09: Sistem menunjukkan apakah jurnal seimbang
// Section 7.11: Satu baris HANYA boleh memiliki nominal debit atau kredit
// ===================================================================

let currentJournalPosition = 'debit'; // 'debit' or 'credit'

function setJournalPosition(pos) {
  currentJournalPosition = pos;
  const btnDebit = document.getElementById('btn-seg-debit');
  const btnCredit = document.getElementById('btn-seg-credit');
  
  if (pos === 'debit') {
    btnDebit.classList.add('active');
    btnCredit.classList.remove('active');
  } else {
    btnCredit.classList.add('active');
    btnDebit.classList.remove('active');
  }
}

function addJournalEntry() {
  const dateInput = document.getElementById('j-date');
  const accountInput = document.getElementById('j-account');
  const amountInput = document.getElementById('j-amount');
  const alertEl = document.getElementById('alert-journal');

  if (alertEl) alertEl.classList.remove('visible');

  const dateVal = dateInput.value.trim() || new Date().toISOString().split('T')[0];
  const accountVal = accountInput.value.trim();
  const amountVal = parseInputValue(amountInput.value);

  if (!accountVal) {
    if (alertEl) {
      alertEl.innerHTML = '<span class="alert-icon">⚠️</span> <div>Mohon masukkan Nama Akun atau Keterangan transaksi.</div>';
      alertEl.classList.add('visible');
    }
    return;
  }

  if (isNaN(amountVal) || amountVal <= 0) {
    if (alertEl) {
      alertEl.innerHTML = '<span class="alert-icon">⚠️</span> <div>Nominal harus berupa angka valid dan lebih besar dari 0.</div>';
      alertEl.classList.add('visible');
    }
    return;
  }

  // Create entry guaranteeing one-side only as specified in FR-07 & 7.11
  const newRow = {
    id: 'jrn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    date: dateVal,
    account: accountVal,
    debit: currentJournalPosition === 'debit' ? amountVal : 0,
    credit: currentJournalPosition === 'credit' ? amountVal : 0
  };

  currentJournal.push(newRow);
  saveJournal();

  // Reset inputs
  accountInput.value = '';
  amountInput.value = '';
  accountInput.focus();

  renderJournal();
  showToast(`Baris jurnal "${accountVal}" ditambahkan!`, '✓');
}

function deleteJournalEntry(id) {
  currentJournal = currentJournal.filter(row => row.id !== id);
  saveJournal();
  renderJournal();
  showToast('Baris jurnal dihapus', '🗑️');
}

function clearJournal() {
  if (currentJournal.length === 0) {
    showToast('Jurnal masih kosong', 'ℹ️');
    return;
  }
  if (confirm('Apakah Anda ingin mengosongkan seluruh baris jurnal?')) {
    currentJournal = [];
    try { localStorage.removeItem(JOURNAL_STORAGE_KEY); } catch (e) {}
    renderJournal();
    showToast('Jurnal berhasil dibersihkan', '🗑️');
  }
}

function renderJournal() {
  const container = document.getElementById('journal-list-container');
  const statusBanner = document.getElementById('journal-status-banner');
  const totalDebitEl = document.getElementById('j-total-debit');
  const totalCreditEl = document.getElementById('j-total-credit');
  const statusTitleEl = document.getElementById('j-status-title');
  const statusDescEl = document.getElementById('j-status-desc');
  const statusIconEl = document.getElementById('j-status-icon');
  const countBadgeEl = document.getElementById('home-journal-status');

  let totalDebit = 0;
  let totalCredit = 0;

  currentJournal.forEach(row => {
    totalDebit += row.debit || 0;
    totalCredit += row.credit || 0;
  });

  const selisih = Math.abs(totalDebit - totalCredit);

  if (totalDebitEl) totalDebitEl.textContent = formatRupiah(totalDebit);
  if (totalCreditEl) totalCreditEl.textContent = formatRupiah(totalCredit);

  // Status banner logic
  if (statusBanner) {
    statusBanner.className = 'balance-status-banner';
    if (currentJournal.length === 0) {
      statusBanner.classList.add('empty');
      if (statusIconEl) statusIconEl.textContent = '📝';
      if (statusTitleEl) statusTitleEl.textContent = 'Jurnal Masih Kosong';
      if (statusDescEl) statusDescEl.textContent = 'Tambahkan baris transaksi untuk memeriksa keseimbangan';
      if (countBadgeEl) countBadgeEl.textContent = '0 Baris';
    } else if (selisih === 0 && totalDebit > 0) {
      statusBanner.classList.add('balanced');
      if (statusIconEl) statusIconEl.textContent = '⚖️';
      if (statusTitleEl) statusTitleEl.textContent = 'Jurnal Seimbang (Balanced)';
      if (statusDescEl) statusDescEl.textContent = `Total Debit dan Kredit sama persis: ${formatRupiah(totalDebit)}`;
      if (countBadgeEl) countBadgeEl.textContent = 'Seimbang ⚖️';
    } else {
      statusBanner.classList.add('unbalanced');
      if (statusIconEl) statusIconEl.textContent = '⚠️';
      if (statusTitleEl) statusTitleEl.textContent = 'Belum Seimbang (Unbalanced)';
      if (statusDescEl) statusDescEl.textContent = `Terdapat selisih ${formatRupiah(selisih)} antara Debit & Kredit`;
      if (countBadgeEl) countBadgeEl.textContent = `Selisih ${formatRupiah(selisih)}`;
    }
  }

  // Render cards
  if (!container) return;

  if (currentJournal.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📖</div>
        <div class="empty-state-title">Belum Ada Baris Jurnal</div>
        <div class="empty-state-desc">Gunakan form di atas atau klik preset contoh transaksi di bawah untuk mulai memeriksa keseimbangan debit & kredit.</div>
      </div>
    `;
    return;
  }

  let html = '<div class="journal-entries-wrap">';
  currentJournal.forEach((row, idx) => {
    const isDebit = row.debit > 0;
    const posClass = isDebit ? 'is-debit' : 'is-credit';
    const posBadge = isDebit 
      ? '<span class="j-pos-badge debit">DEBIT</span>' 
      : '<span class="j-pos-badge credit">KREDIT</span>';
    const amountStr = formatRupiah(isDebit ? row.debit : row.credit);

    html += `
      <div class="journal-row-card ${posClass}">
        <div class="j-row-top">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="j-date-badge">#${idx + 1} • ${row.date}</span>
            ${posBadge}
          </div>
          <button class="btn-del-row" onclick="deleteJournalEntry('${row.id}')" title="Hapus baris ini">✕ Hapus</button>
        </div>
        <div class="j-account-name" style="${!isDebit ? 'padding-left: 14px;' : ''}">${row.account}</div>
        <div class="j-row-bottom">
          <span style="font-size: 0.72rem; color: var(--text-muted);">Nominal ${isDebit ? 'Debit' : 'Kredit'}</span>
          <span class="j-amount">${amountStr}</span>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

// Preset journal transactions for quick testing
function loadJournalPreset(presetType) {
  const today = new Date().toISOString().split('T')[0];

  if (presetType === 'modal') {
    currentJournal.push({
      id: 'jrn_' + Date.now() + '_1',
      date: today,
      account: 'Kas',
      debit: 10000000,
      credit: 0
    });
    currentJournal.push({
      id: 'jrn_' + Date.now() + '_2',
      date: today,
      account: 'Modal Pemilik',
      debit: 0,
      credit: 10000000
    });
    showToast('Contoh Transaksi Setoran Modal ditambahkan!', '⚖️');
  } else if (presetType === 'peralatan') {
    currentJournal.push({
      id: 'jrn_' + Date.now() + '_3',
      date: today,
      account: 'Peralatan Kantor',
      debit: 3500000,
      credit: 0
    });
    currentJournal.push({
      id: 'jrn_' + Date.now() + '_4',
      date: today,
      account: 'Kas (Pembelian Tunai)',
      debit: 0,
      credit: 3500000
    });
    showToast('Contoh Pembelian Peralatan ditambahkan!', '⚖️');
  } else if (presetType === 'beban') {
    currentJournal.push({
      id: 'jrn_' + Date.now() + '_5',
      date: today,
      account: 'Beban Gaji Karyawan',
      debit: 2000000,
      credit: 0
    });
    currentJournal.push({
      id: 'jrn_' + Date.now() + '_6',
      date: today,
      account: 'Kas',
      debit: 0,
      credit: 2000000
    });
    showToast('Contoh Pembayaran Beban ditambahkan!', '⚖️');
  }

  saveJournal();
  renderJournal();
}

// ===================================================================
// GUIDE ACCORDION TOGGLE
// ===================================================================
function toggleGuideItem(headerEl) {
  const parent = headerEl.parentElement;
  if (!parent) return;
  parent.classList.toggle('open');
}

// ===================================================================
// SEARCH & FILTER CALCULATORS
// ===================================================================
function filterCalculators() {
  const searchInput = document.getElementById('calc-search-input');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const activeChip = document.querySelector('.chip-btn.active');
  const category = activeChip ? activeChip.dataset.category : 'all';

  const cards = document.querySelectorAll('.calc-selector-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const cardCat = card.dataset.category || '';
    const title = (card.querySelector('.calc-title')?.textContent || '').toLowerCase();
    const snippet = (card.querySelector('.calc-snippet')?.textContent || '').toLowerCase();
    const tags = (card.dataset.tags || '').toLowerCase();

    const matchesQuery = query === '' || title.includes(query) || snippet.includes(query) || tags.includes(query);
    const matchesCat = category === 'all' || cardCat.includes(category);

    if (matchesQuery && matchesCat) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const emptyMsg = document.getElementById('calc-empty-search');
  if (emptyMsg) {
    emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

function setCategoryFilter(btn, category) {
  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  filterCalculators();
}

// Set today's date in default date pickers
function initDatePickers() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('j-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = today;
  }
}

// ===================================================================
// APPLICATION INITIALIZATION
// ===================================================================
// ===================================================================
// FINAL EDITION EXPORT & REPORTING UTILITIES
// ===================================================================

function exportJournalCSV() {
  if (!currentJournal || currentJournal.length === 0) {
    showToast("Jurnal masih kosong untuk diekspor", "⚠️");
    return;
  }
  let csvContent = "\uFEFFNo,Tanggal,Posisi,Nama Akun / Keterangan,Nominal Debit (Rp),Nominal Kredit (Rp)\n";
  currentJournal.forEach((row, idx) => {
    const isDebit = (row.debit || 0) > 0;
    const pos = isDebit ? "DEBIT" : "KREDIT";
    const acc = "\"" + (row.account || '').replace(/"/g, '""') + "\"";
    const deb = row.debit || 0;
    const kre = row.credit || 0;
    csvContent += `${idx + 1},${row.date},${pos},${acc},${deb},${kre}\n`;
  });

  let totalDeb = currentJournal.reduce((acc, r) => acc + (r.debit || 0), 0);
  let totalKre = currentJournal.reduce((acc, r) => acc + (r.credit || 0), 0);
  const statusStr = totalDeb === totalKre ? "SEIMBANG (BALANCED)" : `SELISIH Rp ${Math.abs(totalDeb - totalKre)}`;
  csvContent += `\n,,,,Total Debit,${totalDeb}\n,,,,Total Kredit,${totalKre}\n,,,,Status Keseimbangan,${statusStr}\n`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const nowStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `Jurnal_Umum_AkuntansiKu_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Jurnal berhasil diekspor ke Excel (CSV)!", "📥");
}

function printJournal() {
  if (!currentJournal || currentJournal.length === 0) {
    showToast("Jurnal masih kosong untuk dicetak", "⚠️");
    return;
  }
  switchTab("view-journal");
  setTimeout(() => {
    window.print();
  }, 250);
}

function exportHistoryCSV() {
  if (!currentHistory || currentHistory.length === 0) {
    showToast("Riwayat masih kosong untuk diekspor", "⚠️");
    return;
  }
  let csvContent = "\uFEFFNo,Waktu Perhitungan,Alat Kalkulator,Nilai Hasil,Detail Langkah / Rumus\n";
  currentHistory.forEach((item, idx) => {
    const calc = "\"" + (item.calcName || '').replace(/"/g, '""') + "\"";
    const res = "\"" + (item.resultValue || '').replace(/"/g, '""') + "\"";
    const summ = "\"" + (item.summary || '').replace(/"/g, '""') + "\"";
    csvContent += `${idx + 1},"${item.timestamp}",${calc},${res},${summ}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const nowStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `Riwayat_AkuntansiKu_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Riwayat kalkulasi diekspor ke Excel (CSV)!", "📥");
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize History, Journal & Badges
  loadHistory();
  loadJournal();
  initDatePickers();
  renderJournal();

  // 2. Setup Navigation Buttons
  const navButtons = document.querySelectorAll('.nav-item-btn, .sidebar-nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.dataset.target;
      if (target) {
        switchTab(target);
        // If switching to calculators, return to directory list
        if (target === 'view-calculators') {
          backToCalculatorList();
        }
      }
    });
  });

  // 3. Search Input listener
  const searchInput = document.getElementById('calc-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterCalculators);
  }

  // 4. Quick Cards on Home
  const quickCards = document.querySelectorAll('.quick-card[data-calc]');
  quickCards.forEach(qc => {
    qc.addEventListener('click', () => {
      const calcId = qc.dataset.calc;
      if (calcId) {
        openCalculatorDetail(calcId);
      }
    });
  });

  // 5. Currency Auto-formatting on blur for cleaner display
  const currencyInputs = document.querySelectorAll('.auto-curr');
  currencyInputs.forEach(input => {
    input.addEventListener('blur', () => {
      const val = parseInputValue(input.value);
      if (!isNaN(val) && val > 0) {
        input.value = formatNumber(val, 0);
      }
    });
  });
});

// ===================================================================
// STANDALONE PHONE CALCULATOR LOGIC (Kalkulator Normal HP)
// ===================================================================

const phoneCalc = {
  currentDisplay: '0',
  historyText: '',
  firstOperand: null,
  operator: null,
  waitingForSecondOperand: false
};

function updatePhoneCalcDisplay() {
  const currentEl = document.getElementById('phone-calc-current');
  const historyEl = document.getElementById('phone-calc-history');

  if (currentEl) {
    // Format display with thousand separator if pure integer/float
    const raw = phoneCalc.currentDisplay;
    let formatted = raw;

    if (!isNaN(raw) && !raw.includes('e') && raw !== 'Tak Terdefinisi') {
      const parts = raw.split('.');
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      formatted = parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
      if (raw.startsWith('-') && !formatted.startsWith('-')) {
        formatted = '-' + formatted;
      }
    }

    // Dynamic font size for long numbers
    if (formatted.length > 12) {
      currentEl.style.fontSize = '1.35rem';
    } else if (formatted.length > 8) {
      currentEl.style.fontSize = '1.75rem';
    } else {
      currentEl.style.fontSize = '2.15rem';
    }

    currentEl.textContent = formatted;
  }

  if (historyEl) {
    historyEl.textContent = phoneCalc.historyText;
  }

  // Update operator button highlight
  const opBtns = document.querySelectorAll('.phone-calc-btn.btn-op');
  opBtns.forEach(btn => {
    if (btn.dataset.op === phoneCalc.operator && phoneCalc.waitingForSecondOperand) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function phoneCalcInput(digit) {
  if (phoneCalc.currentDisplay === 'Tak Terdefinisi') {
    phoneCalc.currentDisplay = '0';
  }

  if (phoneCalc.waitingForSecondOperand) {
    phoneCalc.currentDisplay = String(digit);
    phoneCalc.waitingForSecondOperand = false;
  } else {
    if (phoneCalc.currentDisplay === '0') {
      if (digit === '00' || digit === '000') {
        phoneCalc.currentDisplay = '0';
      } else {
        phoneCalc.currentDisplay = String(digit);
      }
    } else {
      // Prevent overflow length
      if (phoneCalc.currentDisplay.length < 16) {
        phoneCalc.currentDisplay += String(digit);
      }
    }
  }
  updatePhoneCalcDisplay();
}

function phoneCalcDecimal() {
  if (phoneCalc.waitingForSecondOperand) {
    phoneCalc.currentDisplay = '0.';
    phoneCalc.waitingForSecondOperand = false;
    updatePhoneCalcDisplay();
    return;
  }
  if (!phoneCalc.currentDisplay.includes('.')) {
    phoneCalc.currentDisplay += '.';
    updatePhoneCalcDisplay();
  }
}

function phoneCalcToggleSign() {
  if (phoneCalc.currentDisplay === '0' || phoneCalc.currentDisplay === 'Tak Terdefinisi') return;
  if (phoneCalc.currentDisplay.startsWith('-')) {
    phoneCalc.currentDisplay = phoneCalc.currentDisplay.substring(1);
  } else {
    phoneCalc.currentDisplay = '-' + phoneCalc.currentDisplay;
  }
  updatePhoneCalcDisplay();
}

function phoneCalcPercent() {
  const current = parseFloat(phoneCalc.currentDisplay);
  if (isNaN(current)) return;
  const val = current / 100;
  phoneCalc.currentDisplay = String(val);
  updatePhoneCalcDisplay();
}

function phoneCalcBackspace() {
  if (phoneCalc.waitingForSecondOperand || phoneCalc.currentDisplay === 'Tak Terdefinisi') return;
  if (phoneCalc.currentDisplay.length <= 1 || (phoneCalc.currentDisplay.length === 2 && phoneCalc.currentDisplay.startsWith('-'))) {
    phoneCalc.currentDisplay = '0';
  } else {
    phoneCalc.currentDisplay = phoneCalc.currentDisplay.slice(0, -1);
  }
  updatePhoneCalcDisplay();
}

function phoneCalcClear() {
  phoneCalc.currentDisplay = '0';
  phoneCalc.historyText = '';
  phoneCalc.firstOperand = null;
  phoneCalc.operator = null;
  phoneCalc.waitingForSecondOperand = false;
  updatePhoneCalcDisplay();
}

function phoneCalcPerformOperation(first, second, op) {
  switch (op) {
    case '+': return first + second;
    case '-': return first - second;
    case '*': return first * second;
    case '/': return second === 0 ? null : first / second;
    default: return second;
  }
}

function phoneCalcOperator(nextOp) {
  const inputValue = parseFloat(phoneCalc.currentDisplay);

  if (phoneCalc.operator && phoneCalc.waitingForSecondOperand) {
    phoneCalc.operator = nextOp;
    phoneCalc.historyText = `${formatNumber(phoneCalc.firstOperand, 2)} ${getOpSymbol(nextOp)}`;
    updatePhoneCalcDisplay();
    return;
  }

  if (phoneCalc.firstOperand === null && !isNaN(inputValue)) {
    phoneCalc.firstOperand = inputValue;
  } else if (phoneCalc.operator) {
    const result = phoneCalcPerformOperation(phoneCalc.firstOperand, inputValue, phoneCalc.operator);
    if (result === null) {
      phoneCalc.currentDisplay = 'Tak Terdefinisi';
      phoneCalc.historyText = '';
      phoneCalc.firstOperand = null;
      phoneCalc.operator = null;
      phoneCalc.waitingForSecondOperand = false;
      updatePhoneCalcDisplay();
      return;
    }
    // Round to avoid IEEE 754 precision issues
    const rounded = Math.round(result * 10000000000) / 10000000000;
    phoneCalc.currentDisplay = String(rounded);
    phoneCalc.firstOperand = rounded;
  }

  phoneCalc.waitingForSecondOperand = true;
  phoneCalc.operator = nextOp;
  phoneCalc.historyText = `${formatNumber(phoneCalc.firstOperand, 2)} ${getOpSymbol(nextOp)}`;
  updatePhoneCalcDisplay();
}

function getOpSymbol(op) {
  switch (op) {
    case '+': return '+';
    case '-': return '−';
    case '*': return '×';
    case '/': return '÷';
    default: return '';
  }
}

function phoneCalcEquals() {
  if (phoneCalc.operator === null || phoneCalc.firstOperand === null) return;

  const inputValue = parseFloat(phoneCalc.currentDisplay);
  const result = phoneCalcPerformOperation(phoneCalc.firstOperand, inputValue, phoneCalc.operator);

  if (result === null) {
    phoneCalc.currentDisplay = 'Tak Terdefinisi';
    phoneCalc.historyText = `${formatNumber(phoneCalc.firstOperand, 2)} ${getOpSymbol(phoneCalc.operator)} 0 =`;
  } else {
    const rounded = Math.round(result * 10000000000) / 10000000000;
    phoneCalc.historyText = `${formatNumber(phoneCalc.firstOperand, 2)} ${getOpSymbol(phoneCalc.operator)} ${formatNumber(inputValue, 2)} =`;
    phoneCalc.currentDisplay = String(rounded);
    phoneCalc.firstOperand = rounded;
  }

  phoneCalc.operator = null;
  phoneCalc.waitingForSecondOperand = true;
  updatePhoneCalcDisplay();
}

function phoneCalcCopy() {
  const current = phoneCalc.currentDisplay;
  if (current && current !== 'Tak Terdefinisi') {
    copyToClipboard(current, 'Angka kalkulator berhasil disalin!');
  } else {
    showToast('Tidak ada angka yang dapat disalin', '⚠️');
  }
}

function phoneCalcSaveHistory() {
  const current = phoneCalc.currentDisplay;
  if (!current || current === 'Tak Terdefinisi' || current === '0') {
    showToast('Lakukan perhitungan terlebih dahulu', '⚠️');
    return;
  }

  saveHistoryItem({
    calcName: 'Kalkulator Normal HP',
    icon: '📱',
    resultLabel: 'Hasil Hitung HP',
    resultValue: formatRupiah(parseFloat(current)),
    summary: phoneCalc.historyText ? `${phoneCalc.historyText} ${current}` : `Perhitungan mandiri: ${current}`
  });

  showToast('Hasil disimpan ke Riwayat AkuntansiKu!', '💾');
}


// ===================================================================
// 5 KALKULATOR AKUNTANSI TAMBAHAN UNTUK SISWA & PRAKTISI
// ===================================================================

// -------------------------------------------------------------
// 10. Kalkulator HPP (Harga Pokok Penjualan / COGS)
// -------------------------------------------------------------
function hitungHPP() {
  const calcId = 'hpp';
  hideCalcAlert(calcId);

  const awal = parseInputValue(document.getElementById('hpp-awal').value) || 0;
  const beli = parseInputValue(document.getElementById('hpp-beli').value);
  const ongkir = parseInputValue(document.getElementById('hpp-ongkir').value) || 0;
  const retur = parseInputValue(document.getElementById('hpp-retur').value) || 0;
  const pot = parseInputValue(document.getElementById('hpp-pot').value) || 0;
  const akhir = parseInputValue(document.getElementById('hpp-akhir').value) || 0;

  if (isNaN(beli)) {
    showCalcAlert(calcId, 'Mohon isi Pembelian Barang Dagang dengan angka yang valid.');
    return;
  }
  if (awal < 0 || beli < 0 || ongkir < 0 || retur < 0 || pot < 0 || akhir < 0) {
    showCalcAlert(calcId, 'Nilai persediaan dan transaksi tidak boleh negatif.');
    return;
  }

  const pembelianBersih = beli + ongkir - retur - pot;
  const btud = awal + pembelianBersih;
  const hpp = btud - akhir;

  const formattedHPP = formatRupiah(hpp);
  const stepText = `Beli Bersih = (${formatRupiah(beli)} + ${formatRupiah(ongkir)}) - (${formatRupiah(retur)} + ${formatRupiah(pot)}) = ${formatRupiah(pembelianBersih)} | BTUD = ${formatRupiah(btud)} | HPP = ${formatRupiah(btud)} - ${formatRupiah(akhir)} = ${formattedHPP}`;

  displayCalcResult(calcId, {
    mainValue: formattedHPP,
    subLabel: 'Total Harga Pokok Penjualan (HPP)',
    formulaStep: stepText,
    details: [
      { label: 'Pembelian Bersih', value: formatRupiah(pembelianBersih) },
      { label: 'Barang Siap Dijual (BTUD)', value: formatRupiah(btud) },
      { label: 'Persediaan Akhir', value: formatRupiah(akhir) }
    ]
  });

  saveHistoryItem({
    calcName: 'Harga Pokok Penjualan (HPP)',
    icon: '🏢',
    resultLabel: 'HPP',
    resultValue: formattedHPP,
    summary: stepText
  });
}

function setExampleHPP() {
  document.getElementById('hpp-awal').value = '50.000.000';
  document.getElementById('hpp-beli').value = '120.000.000';
  document.getElementById('hpp-ongkir').value = '5.000.000';
  document.getElementById('hpp-retur').value = '3.000.000';
  document.getElementById('hpp-pot').value = '2.000.000';
  document.getElementById('hpp-akhir').value = '40.000.000';
  hitungHPP();
}

// -------------------------------------------------------------
// 11. Kalkulator Kas Kecil (Petty Cash - Sistem Imprest)
// -------------------------------------------------------------
function hitungKasKecil() {
  const calcId = 'kaskecil';
  hideCalcAlert(calcId);

  const plafon = parseInputValue(document.getElementById('kk-plafon').value);
  const pengeluaran = parseInputValue(document.getElementById('kk-pengeluaran').value);
  const fisik = parseInputValue(document.getElementById('kk-fisik').value);

  if (isNaN(plafon) || isNaN(pengeluaran) || isNaN(fisik)) {
    showCalcAlert(calcId, 'Mohon isi ketiga data: Saldo Plafon, Total Bukti Pengeluaran, dan Sisa Kas Fisik.');
    return;
  }
  if (plafon < 0 || pengeluaran < 0 || fisik < 0) {
    showCalcAlert(calcId, 'Semua nilai kas kecil tidak boleh bernilai negatif.');
    return;
  }

  const pertanggungjawaban = pengeluaran + fisik;
  const selisih = pertanggungjawaban - plafon;

  let statusText = '';
  let valueClass = 'positive';

  if (selisih === 0) {
    statusText = 'Kas Pas (Seimbang/Cocok) ⚖️';
    valueClass = 'profit';
  } else if (selisih > 0) {
    statusText = `Selisih Lebih (Cash Overage): +${formatRupiah(selisih)} ⚠️`;
    valueClass = 'profit';
  } else {
    statusText = `Selisih Kurang (Cash Shortage): -${formatRupiah(Math.abs(selisih))} ⚠️`;
    valueClass = 'loss';
  }

  const danaPengisian = formatRupiah(pengeluaran);
  const stepText = `Total Bukti + Fisik = ${formatRupiah(pengeluaran)} + ${formatRupiah(fisik)} = ${formatRupiah(pertanggungjawaban)} (Plafon: ${formatRupiah(plafon)}) -> ${statusText}`;

  displayCalcResult(calcId, {
    mainValue: danaPengisian,
    valueClass: valueClass,
    subLabel: `Dana Pengisian Kembali (Replenishment)`,
    formulaStep: stepText,
    details: [
      { label: 'Status Fisik Kas', value: statusText },
      { label: 'Sisa Fisik Brankas', value: formatRupiah(fisik) },
      { label: 'Saldo Plafon Dana', value: formatRupiah(plafon) }
    ]
  });

  saveHistoryItem({
    calcName: 'Rekonsiliasi Kas Kecil',
    icon: '🪙',
    resultLabel: 'Pengisian Kas Kecil',
    resultValue: danaPengisian,
    summary: stepText
  });
}

function setExampleKasKecil() {
  document.getElementById('kk-plafon').value = '5.000.000';
  document.getElementById('kk-pengeluaran').value = '3.800.000';
  document.getElementById('kk-fisik').value = '1.200.000';
  hitungKasKecil();
}

// -------------------------------------------------------------
// 12. Kalkulator PPh Final UMKM (0,5% PP 55/2022)
// -------------------------------------------------------------
function hitungPPhUMKM() {
  const calcId = 'pphumkm';
  hideCalcAlert(calcId);

  const omzetBulan = parseInputValue(document.getElementById('pph-omzet').value);
  const omzetAkumulasi = parseInputValue(document.getElementById('pph-akumulasi').value) || 0;
  const jenisWP = document.getElementById('pph-jenis-wp').value; // 'op' or 'badan'

  if (isNaN(omzetBulan) || omzetBulan < 0) {
    showCalcAlert(calcId, 'Mohon masukkan Omzet / Peredaran Bruto Bulan ini dengan valid.');
    return;
  }
  if (omzetAkumulasi < 0) {
    showCalcAlert(calcId, 'Akumulasi omzet sebelumnya tidak boleh negatif.');
    return;
  }

  let dppPajak = 0;
  let keterangan = '';

  if (jenisWP === 'op') {
    // Orang Pribadi: PTKP Omzet Rp 500 juta per tahun
    const batasPTKP = 500000000;
    const totalOmzetSd = omzetAkumulasi + omzetBulan;

    if (totalOmzetSd <= batasPTKP) {
      dppPajak = 0;
      keterangan = `Bebas Pajak (Akumulasi omzet ${formatRupiah(totalOmzetSd)} masih ≤ Rp500 Juta PTKP OP)`;
    } else if (omzetAkumulasi < batasPTKP && totalOmzetSd > batasPTKP) {
      dppPajak = totalOmzetSd - batasPTKP;
      keterangan = `Kena Pajak sebagian di atas Rp500 Juta (${formatRupiah(dppPajak)})`;
    } else {
      dppPajak = omzetBulan;
      keterangan = `Kena Pajak Penuh 0,5% (Akumulasi sebelumnya sudah melebihi Rp500 Juta)`;
    }
  } else {
    // Badan (CV / PT): Langsung 0.5% dari omzet
    dppPajak = omzetBulan;
    keterangan = 'Tarif 0,5% dari Omzet (Wajib Pajak Badan UMKM PP 55/2022)';
  }

  const pphTerutang = dppPajak * 0.005;
  const formattedPPh = formatRupiah(pphTerutang);
  const stepText = `DPP Kena Pajak: ${formatRupiah(dppPajak)} × 0,5% = ${formattedPPh} (${keterangan})`;

  displayCalcResult(calcId, {
    mainValue: formattedPPh,
    subLabel: 'PPh Final 0,5% Bulan Ini',
    formulaStep: stepText,
    details: [
      { label: 'Omzet Bulan Ini', value: formatRupiah(omzetBulan) },
      { label: 'Status Batas Omzet', value: keterangan },
      { label: 'Tarif PPh Final', value: '0,5% (PP 55/2022)' }
    ]
  });

  saveHistoryItem({
    calcName: 'PPh Final UMKM 0,5%',
    icon: '📑',
    resultLabel: 'PPh Final UMKM',
    resultValue: formattedPPh,
    summary: stepText
  });
}

function setExamplePPhUMKM() {
  document.getElementById('pph-omzet').value = '100.000.000';
  document.getElementById('pph-akumulasi').value = '600.000.000';
  document.getElementById('pph-jenis-wp').value = 'op';
  hitungPPhUMKM();
}

// -------------------------------------------------------------
// 13. Kalkulator Nilai Waktu Uang (TVM: FV & PV)
// -------------------------------------------------------------
function hitungTVM() {
  const calcId = 'tvm';
  hideCalcAlert(calcId);

  const mode = document.getElementById('tvm-mode').value; // 'fv' or 'pv'
  const nominal = parseInputValue(document.getElementById('tvm-nominal').value);
  const bungaPersen = parseInputValue(document.getElementById('tvm-bunga').value);
  const periode = parseInputValue(document.getElementById('tvm-periode').value);

  if (isNaN(nominal) || isNaN(bungaPersen) || isNaN(periode)) {
    showCalcAlert(calcId, 'Mohon isi Nominal Uang, Suku Bunga per Periode (%), dan Jumlah Periode (n).');
    return;
  }
  if (nominal < 0 || bungaPersen < 0 || periode <= 0) {
    showCalcAlert(calcId, 'Semua nilai harus positif dan periode minimal 1.');
    return;
  }

  const r = bungaPersen / 100;
  let hasil = 0;
  let labelHasil = '';
  let stepText = '';

  if (mode === 'fv') {
    hasil = nominal * Math.pow(1 + r, periode);
    labelHasil = 'Future Value (Nilai Masa Depan)';
    stepText = `FV = ${formatRupiah(nominal)} × (1 + ${bungaPersen}%)^${periode} = ${formatRupiah(hasil)}`;
  } else {
    hasil = nominal / Math.pow(1 + r, periode);
    labelHasil = 'Present Value (Nilai Sekarang)';
    stepText = `PV = ${formatRupiah(nominal)} ÷ (1 + ${bungaPersen}%)^${periode} = ${formatRupiah(hasil)}`;
  }

  const totalBunga = Math.abs(hasil - nominal);
  const formattedHasil = formatRupiah(hasil);

  displayCalcResult(calcId, {
    mainValue: formattedHasil,
    subLabel: labelHasil,
    formulaStep: stepText,
    details: [
      { label: mode === 'fv' ? 'Modal Awal (PV)' : 'Target Akhir (FV)', value: formatRupiah(nominal) },
      { label: 'Total Bunga Majemuk', value: formatRupiah(totalBunga) },
      { label: 'Faktor Penggali / Diskon', value: formatNumber(Math.pow(1 + r, periode), 4) }
    ]
  });

  saveHistoryItem({
    calcName: 'Nilai Waktu Uang (TVM)',
    icon: '⏳',
    resultLabel: labelHasil,
    resultValue: formattedHasil,
    summary: stepText
  });
}

function setExampleTVM() {
  document.getElementById('tvm-mode').value = 'fv';
  document.getElementById('tvm-nominal').value = '10.000.000';
  document.getElementById('tvm-bunga').value = '8';
  document.getElementById('tvm-periode').value = '5';
  hitungTVM();
}

// -------------------------------------------------------------
// 14. Kalkulator Gaji Bersih Karyawan (Take Home Pay)
// -------------------------------------------------------------
function hitungGaji() {
  const calcId = 'gaji';
  hideCalcAlert(calcId);

  const pokok = parseInputValue(document.getElementById('gj-pokok').value);
  const tunjangan = parseInputValue(document.getElementById('gj-tunjangan').value) || 0;
  const bpjsKesehatan = parseInputValue(document.getElementById('gj-bpjs-kes').value) || 0;
  const bpjsTK = parseInputValue(document.getElementById('gj-bpjs-tk').value) || 0;
  const potonganLain = parseInputValue(document.getElementById('gj-pot-lain').value) || 0;

  if (isNaN(pokok) || pokok <= 0) {
    showCalcAlert(calcId, 'Mohon isi Gaji Pokok karyawan dengan angka valid.');
    return;
  }
  if (tunjangan < 0 || bpjsKesehatan < 0 || bpjsTK < 0 || potonganLain < 0) {
    showCalcAlert(calcId, 'Nilai tunjangan dan potongan tidak boleh bernilai negatif.');
    return;
  }

  const bruto = pokok + tunjangan;
  const totalPotongan = bpjsKesehatan + bpjsTK + potonganLain;
  const takeHomePay = bruto - totalPotongan;

  const formattedTHP = formatRupiah(takeHomePay);
  const stepText = `Bruto (${formatRupiah(bruto)}) - Total Potongan (${formatRupiah(totalPotongan)}) = ${formattedTHP}`;

  displayCalcResult(calcId, {
    mainValue: formattedTHP,
    valueClass: 'profit',
    subLabel: 'Gaji Bersih Diterima (Take Home Pay)',
    formulaStep: stepText,
    details: [
      { label: 'Penghasilan Bruto', value: formatRupiah(bruto) },
      { label: 'Total Semua Potongan', value: formatRupiah(totalPotongan) },
      { label: 'Persentase Diterima', value: bruto > 0 ? ((takeHomePay / bruto) * 100).toFixed(1) + '%' : '0%' }
    ]
  });

  saveHistoryItem({
    calcName: 'Gaji Bersih (Payroll)',
    icon: '💵',
    resultLabel: 'Take Home Pay',
    resultValue: formattedTHP,
    summary: stepText
  });
}

function setExampleGaji() {
  document.getElementById('gj-pokok').value = '7.000.000';
  document.getElementById('gj-tunjangan').value = '1.500.000';
  document.getElementById('gj-bpjs-kes').value = '70.000';
  document.getElementById('gj-bpjs-tk').value = '210.000';
  document.getElementById('gj-pot-lain').value = '120.000';
  hitungGaji();
}

// Hook Keyboard Listener for Phone Calculator
document.addEventListener('keydown', (e) => {
  const phoneView = document.getElementById('view-phone-calc');
  if (!phoneView || !phoneView.classList.contains('active')) return;

  // Ignore if user is typing in an input field
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    phoneCalcInput(e.key);
  } else if (e.key === '.' || e.key === ',') {
    e.preventDefault();
    phoneCalcDecimal();
  } else if (e.key === '+') {
    e.preventDefault();
    phoneCalcOperator('+');
  } else if (e.key === '-') {
    e.preventDefault();
    phoneCalcOperator('-');
  } else if (e.key === '*') {
    e.preventDefault();
    phoneCalcOperator('*');
  } else if (e.key === '/') {
    e.preventDefault();
    phoneCalcOperator('/');
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    phoneCalcEquals();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    phoneCalcBackspace();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    phoneCalcClear();
  } else if (e.key === '%') {
    e.preventDefault();
    phoneCalcPercent();
  }
});
