/**
 * PesoTrack PH - Credit Card Installment & Personal Expense Manager
 * Built with vanilla JavaScript, Chart.js, Tailwind CSS
 */

// ==================== STATE MANAGEMENT ====================
const STORAGE_KEY = 'pesotrack_ph_data_v1';
const THEME_KEY = 'pesotrack_theme';

// Philippine Banks / Issuers Metadata
const ISSUER_CONFIG = {
  'BPI': { name: 'BPI', badgeClass: 'badge-bpi', color: '#be123c' },
  'BDO': { name: 'BDO', badgeClass: 'badge-bdo', color: '#1d4ed8' },
  'EASTWEST': { name: 'EASTWEST', badgeClass: 'badge-eastwest', color: '#7e22ce' },
  'CHINABANK': { name: 'CHINABANK', badgeClass: 'badge-chinabank', color: '#b91c1c' },
  'ATOME': { name: 'ATOME', badgeClass: 'badge-atome', color: '#ca8a04' },
  'METROBANK': { name: 'METROBANK', badgeClass: 'badge-metrobank', color: '#1e3a8a' },
  'SPAYLATER': { name: 'SPAYLATER', badgeClass: 'badge-spaylater', color: '#ea580c' },
  'ATOME CASH': { name: 'ATOME CASH', badgeClass: 'badge-atome-cash', color: '#d97706' },
  'TONIK': { name: 'TONIK', badgeClass: 'badge-tonik', color: '#9333ea' },
  'SLOAN': { name: 'SLOAN', badgeClass: 'badge-sloan', color: '#c2410c' },
  'OTHER': { name: 'OTHER', badgeClass: 'badge-other', color: '#475569' }
};

// Initial App State Structure
let appState = {
  activeMonth: getCurrentYearMonth(), // 'YYYY-MM'
  strategyMethod: 'snowball', // 'snowball' or 'burden'
  extraPayment: 2000,
  salaries: {}, // { 'YYYY-MM': { cutoff1: 25000, cutoff2: 25000, other: 0, total: 50000 } }
  defaultSalary: { cutoff1: 25000, cutoff2: 25000, other: 0, total: 50000 },
  installments: [],
  expenses: [],
  savings: []
};

// Chart instances
let cashflowChart = null;
let cardsBarChart = null;
let annualChart = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  setupEventListeners();
  initMonthPicker();
  renderAll();
});

// Format currency in Philippine Pesos (₱)
function formatPHP(amount) {
  const num = Number(amount) || 0;
  return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCurrentYearMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabName = tabBtn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Month navigation
  document.getElementById('activeMonthInput').addEventListener('change', (e) => {
    if (e.target.value) {
      appState.activeMonth = e.target.value;
      saveData();
      renderAll();
    }
  });

  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    navigateMonth(-1);
  });

  document.getElementById('btnNextMonth').addEventListener('click', () => {
    navigateMonth(1);
  });

  document.getElementById('btnToday').addEventListener('click', () => {
    appState.activeMonth = getCurrentYearMonth();
    document.getElementById('activeMonthInput').value = appState.activeMonth;
    saveData();
    renderAll();
  });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Quick Add Button
  document.getElementById('btnQuickAdd').addEventListener('click', () => {
    openModal('modalQuickAdd');
  });

  // Edit Salary button
  document.getElementById('btnEditSalary').addEventListener('click', () => {
    openSalaryModal();
  });

  // Installment Issuer custom field trigger
  document.getElementById('instCardIssuer').addEventListener('change', (e) => {
    const customRow = document.getElementById('instCustomCardRow');
    if (e.target.value === 'OTHER') {
      customRow.classList.remove('hidden');
    } else {
      customRow.classList.add('hidden');
    }
  });

  // Installment table filters
  document.getElementById('filterCardIssuer').addEventListener('change', renderInstallmentsTable);
  document.getElementById('filterInstallmentStatus').addEventListener('change', renderInstallmentsTable);

  // Expense table filters & grouping
  document.getElementById('filterExpenseCategory').addEventListener('change', renderExpensesTable);
  document.getElementById('filterExpenseCard').addEventListener('change', renderExpensesTable);
  document.getElementById('groupExpenseBy').addEventListener('change', renderExpensesTable);

  // Annual year selector
  document.getElementById('annualYearSelect').addEventListener('change', renderAnnualSummary);

  // Extra payment slider
  const slider = document.getElementById('inputExtraPayment');
  slider.addEventListener('input', (e) => {
    appState.extraPayment = Number(e.target.value);
    document.getElementById('labelExtraPayment').textContent = formatPHP(appState.extraPayment) + ' / mo';
    renderSnowballTab();
  });
}

function initMonthPicker() {
  const monthInput = document.getElementById('activeMonthInput');
  monthInput.value = appState.activeMonth;
}

function navigateMonth(direction) {
  const [yearStr, monthStr] = appState.activeMonth.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + direction;

  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }

  appState.activeMonth = `${year}-${String(month).padStart(2, '0')}`;
  document.getElementById('activeMonthInput').value = appState.activeMonth;
  saveData();
  renderAll();
}

// ==================== TAB SWITCHING ====================
function switchTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active-tab'));

  const targetPane = document.getElementById(`tab-${tabName}`);
  const targetBtn = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);

  if (targetPane) targetPane.classList.remove('hidden');
  if (targetBtn) targetBtn.classList.add('active-tab');

  // Trigger charts resize or updates when tab switches
  if (tabName === 'dashboard') {
    renderDashboardCharts();
  } else if (tabName === 'snowball') {
    renderSnowballTab();
  } else if (tabName === 'annual') {
    renderAnnualSummary();
  }
}

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  if (cashflowChart) cashflowChart.update();
  if (cardsBarChart) cardsBarChart.update();
  if (annualChart) annualChart.update();
}

// ==================== DATA PERSISTENCE & SAMPLES ====================
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      appState = { ...appState, ...parsed };
      if (!appState.activeMonth) appState.activeMonth = getCurrentYearMonth();
      return;
    } catch (e) {
      console.error('Error loading stored data:', e);
    }
  }
  // If first time, load default sample data so user immediately sees rich Philippine context
  populateInitialSampleData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function populateInitialSampleData() {
  const currentYM = getCurrentYearMonth();
  const [currY, currM] = currentYM.split('-').map(Number);

  // Helper to get past YYYY-MM
  function getPastYM(offsetMonths) {
    let d = new Date(currY, currM - 1 - offsetMonths, 1);
    let y = d.getFullYear();
    let m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  appState.defaultSalary = { cutoff1: 30000, cutoff2: 30000, other: 5000, total: 65000 };
  appState.salaries[currentYM] = { ...appState.defaultSalary };

  // Sample Installments representing real PH banks & apps
  appState.installments = [
    {
      id: 'inst_1',
      issuer: 'BPI',
      customIssuer: '',
      itemName: 'iPhone 16 Pro 256GB',
      startDate: getPastYM(10), // started 10 months ago
      lastPaidDate: `${currentYM}-05`,
      term: 12,
      monthlyAmort: 4899.00,
      totalAmount: 58788.00,
      monthsPaid: 10,
      notes: 'BPI 0% Special Installment Plan (SIP)'
    },
    {
      id: 'inst_2',
      issuer: 'BDO',
      customIssuer: '',
      itemName: 'Carrier Inverter Split AC 1.5HP',
      startDate: getPastYM(4), // started 4 months ago
      lastPaidDate: `${currentYM}-15`,
      term: 24,
      monthlyAmort: 1850.00,
      totalAmount: 44400.00,
      monthsPaid: 4,
      notes: 'BDO Buy Now Pay Later'
    },
    {
      id: 'inst_3',
      issuer: 'SPAYLATER',
      customIssuer: '',
      itemName: 'Ergonomic Office Chair & Desk',
      startDate: getPastYM(2),
      lastPaidDate: `${currentYM}-08`,
      term: 6,
      monthlyAmort: 1450.00,
      totalAmount: 8700.00,
      monthsPaid: 2,
      notes: 'Shopee SPayLater 6 months'
    },
    {
      id: 'inst_4',
      issuer: 'EASTWEST',
      customIssuer: '',
      itemName: 'Sony WH-1000XM5 Headphones',
      startDate: getPastYM(5),
      lastPaidDate: `${currentYM}-12`,
      term: 6,
      monthlyAmort: 3333.33,
      totalAmount: 20000.00,
      monthsPaid: 5,
      notes: 'EastWest 0% Merchant installment'
    },
    {
      id: 'inst_5',
      issuer: 'TONIK',
      customIssuer: '',
      itemName: 'Home Renovation Quick Loan',
      startDate: getPastYM(3),
      lastPaidDate: `${currentYM}-20`,
      term: 12,
      monthlyAmort: 2750.00,
      totalAmount: 33000.00,
      monthsPaid: 3,
      notes: 'Tonik Digital Bank Quick Loan'
    }
  ];

  // Sample Personal Expenses for this month
  appState.expenses = [
    {
      id: 'exp_1',
      month: currentYM,
      category: 'Housing',
      itemName: 'Condo / Apartment Rental',
      amount: 15000.00,
      dueDate: `${currentYM}-05`,
      isRecurring: true,
      isPaid: true
    },
    {
      id: 'exp_2',
      month: currentYM,
      category: 'Utilities',
      itemName: 'Meralco Electric Bill',
      amount: 4350.00,
      dueDate: `${currentYM}-18`,
      isRecurring: true,
      isPaid: false
    },
    {
      id: 'exp_3',
      month: currentYM,
      category: 'Utilities',
      itemName: 'Maynilad / Water Bill',
      amount: 680.00,
      dueDate: `${currentYM}-22`,
      isRecurring: true,
      isPaid: false
    },
    {
      id: 'exp_4',
      month: currentYM,
      category: 'Internet',
      itemName: 'PLDT Home Fiber 200Mbps',
      amount: 1699.00,
      dueDate: `${currentYM}-14`,
      isRecurring: true,
      isPaid: true
    },
    {
      id: 'exp_5',
      month: currentYM,
      category: 'Food',
      itemName: 'Monthly Palengke & Groceries Budget',
      amount: 12000.00,
      dueDate: `${currentYM}-15`,
      isRecurring: true,
      isPaid: true
    },
    {
      id: 'exp_6',
      month: currentYM,
      category: 'Subscriptions',
      itemName: 'Netflix, Spotify & iCloud',
      amount: 890.00,
      dueDate: `${currentYM}-25`,
      isRecurring: true,
      isPaid: false
    }
  ];

  // Sample Savings Deposits
  appState.savings = [
    {
      id: 'sav_1',
      month: currentYM,
      institution: 'Pag-IBIG MP2',
      goalName: 'MP2 5-Year Retirement Fund',
      amount: 5000.00,
      date: `${currentYM}-10`,
      notes: 'Virtual Pag-IBIG Auto-debit'
    },
    {
      id: 'sav_2',
      month: currentYM,
      institution: 'Maya Savings',
      goalName: 'Emergency Fund Buffer (6% p.a.)',
      amount: 4000.00,
      date: `${currentYM}-15`,
      notes: 'High-Yield Interest deposit'
    }
  ];

  saveData();
}

function loadSampleData() {
  if (confirm('Load realistic Philippine sample data? This will add sample BPI, BDO, EastWest, SPayLater installments, utilities, and salary.')) {
    populateInitialSampleData();
    renderAll();
    showToast('Sample Philippine data loaded successfully!', 'success');
  }
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This cannot be undone unless you have a backup.')) {
    appState = {
      activeMonth: getCurrentYearMonth(),
      strategyMethod: 'snowball',
      extraPayment: 2000,
      salaries: {},
      defaultSalary: { cutoff1: 0, cutoff2: 0, other: 0, total: 0 },
      installments: [],
      expenses: [],
      savings: []
    };
    saveData();
    renderAll();
    showToast('All records cleared.', 'info');
  }
}

function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `pesotrack_backup_${appState.activeMonth}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast('JSON backup exported successfully!', 'success');
}

function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported && (imported.installments || imported.expenses)) {
        appState = { ...appState, ...imported };
        saveData();
        renderAll();
        showToast('Backup restored successfully!', 'success');
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    } catch (err) {
      showToast('Failed to parse JSON file.', 'error');
    }
  };
  reader.readAsText(file);
}

// ==================== COMPUTATION LOGIC ====================

// Get salary for the active month
function getActiveSalary() {
  const month = appState.activeMonth;
  if (appState.salaries && appState.salaries[month]) {
    return appState.salaries[month];
  }
  return appState.defaultSalary || { cutoff1: 0, cutoff2: 0, other: 0, total: 0 };
}

// Determine if an installment is active in a given month
function isInstallmentActiveInMonth(inst, targetMonthStr) {
  // If monthsPaid >= term, it is paid off
  const remaining = Math.max(0, inst.term - (inst.monthsPaid || 0));
  if (remaining <= 0) return false;

  // If start date is in future beyond targetMonthStr
  if (inst.startDate && inst.startDate > targetMonthStr) {
    return false;
  }

  return true;
}

// Calculate installment details
function computeInstallmentStats(inst) {
  const term = Number(inst.term) || 1;
  const monthlyAmort = Number(inst.monthlyAmort) || 0;
  const totalAmount = Number(inst.totalAmount) || (term * monthlyAmort);
  const monthsPaid = Number(inst.monthsPaid) || 0;
  const remainingMonths = Math.max(0, term - monthsPaid);
  const remainingBalance = Math.max(0, remainingMonths * monthlyAmort);
  const totalPaid = Math.min(totalAmount, monthsPaid * monthlyAmort);
  const progressPercent = term > 0 ? Math.min(100, Math.round((monthsPaid / term) * 100)) : 0;

  let status = 'active';
  if (remainingMonths === 0) {
    status = 'paid';
  } else if (inst.startDate && inst.startDate > appState.activeMonth) {
    status = 'pending';
  }

  return {
    term,
    monthlyAmort,
    totalAmount,
    monthsPaid,
    remainingMonths,
    remainingBalance,
    totalPaid,
    progressPercent,
    status
  };
}

// Get all calculations for the active month
function getActiveMonthTotals() {
  const activeMonth = appState.activeMonth;
  const salary = getActiveSalary();
  const netIncome = salary.total || 0;

  // Active Installments this month
  const activeInstallments = appState.installments.filter(inst => isInstallmentActiveInMonth(inst, activeMonth));
  const totalCCAmortization = activeInstallments.reduce((sum, inst) => sum + (Number(inst.monthlyAmort) || 0), 0);
  const totalDebtRemaining = appState.installments.reduce((sum, inst) => {
    const s = computeInstallmentStats(inst);
    return sum + s.remainingBalance;
  }, 0);

  // Personal expenses for active month
  const monthExpenses = appState.expenses.filter(e => e.month === activeMonth);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const paidExpenses = monthExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const recurringExpenses = monthExpenses.filter(e => e.isRecurring).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const variableExpenses = totalExpenses - recurringExpenses;

  // Total Bills & Commitments to pay
  const totalBills = totalCCAmortization + totalExpenses;

  // Savings for active month
  const monthSavings = appState.savings.filter(s => s.month === activeMonth);
  const totalSavings = monthSavings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Net Cash Flow (Remaining disposable income)
  const netCashFlow = netIncome - totalBills - totalSavings;

  return {
    netIncome,
    totalCCAmortization,
    totalDebtRemaining,
    activeInstallmentsCount: activeInstallments.length,
    totalExpenses,
    paidExpenses,
    recurringExpenses,
    variableExpenses,
    expensesCount: monthExpenses.length,
    totalBills,
    totalSavings,
    netCashFlow,
    billsRatio: netIncome > 0 ? (totalBills / netIncome) * 100 : 0,
    savingsRatio: netIncome > 0 ? (totalSavings / netIncome) * 100 : 0
  };
}

// ==================== RENDERING ALL VIEWS ====================
function renderAll() {
  renderKPIs();
  renderDashboard();
  renderInstallmentsTable();
  renderExpensesTable();
  renderSavingsTable();
  renderSnowballTab();
  renderAnnualSummary();
}

// 1. Render Top KPI Summary Bar
function renderKPIs() {
  const totals = getActiveMonthTotals();
  const salary = getActiveSalary();

  document.getElementById('kpiIncome').textContent = formatPHP(totals.netIncome);
  document.getElementById('kpiIncomeCutoffs').textContent = `15th: ${formatPHP(salary.cutoff1)} | 30th: ${formatPHP(salary.cutoff2)}`;
  
  document.getElementById('kpiInstallments').textContent = formatPHP(totals.totalCCAmortization);
  document.getElementById('kpiActiveInstallmentsSub').textContent = `${totals.activeInstallmentsCount} active items`;
  document.getElementById('kpiTotalDebtRemaining').textContent = `Bal: ${formatPHP(totals.totalDebtRemaining)}`;
  document.getElementById('badgeActiveInstallmentsCount').textContent = totals.activeInstallmentsCount;

  document.getElementById('kpiExpenses').textContent = formatPHP(totals.totalExpenses);
  document.getElementById('kpiExpensesCount').textContent = `${totals.expensesCount} personal bills`;
  document.getElementById('kpiExpensesPaidStatus').textContent = `${formatPHP(totals.paidExpenses)} paid`;

  document.getElementById('kpiTotalBills').textContent = formatPHP(totals.totalBills);
  document.getElementById('kpiBillsRatio').textContent = `${totals.billsRatio.toFixed(1)}% of income`;

  const cashFlowEl = document.getElementById('kpiCashFlow');
  cashFlowEl.textContent = formatPHP(totals.netCashFlow);
  if (totals.netCashFlow >= 0) {
    cashFlowEl.className = 'text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400';
    document.getElementById('kpiCashFlowBar').className = 'absolute bottom-0 left-0 right-0 h-1 bg-emerald-500';
  } else {
    cashFlowEl.className = 'text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400';
    document.getElementById('kpiCashFlowBar').className = 'absolute bottom-0 left-0 right-0 h-1 bg-rose-500';
  }

  document.getElementById('kpiSavingsSub').textContent = `Saved: ${formatPHP(totals.totalSavings)}`;
  document.getElementById('kpiSavingsRatio').textContent = `${totals.savingsRatio.toFixed(1)}% saved`;
}

// 2. Render Overview Dashboard & Waterfall
function renderDashboard() {
  const totals = getActiveMonthTotals();

  // Waterfall figures
  document.getElementById('wfIncome').textContent = `+ ${formatPHP(totals.netIncome)}`;
  document.getElementById('wfInstallments').textContent = `- ${formatPHP(totals.totalCCAmortization)}`;
  document.getElementById('wfExpenses').textContent = `- ${formatPHP(totals.totalExpenses)}`;
  document.getElementById('wfSavings').textContent = `- ${formatPHP(totals.totalSavings)}`;
  
  const wfNet = document.getElementById('wfNetRemaining');
  wfNet.textContent = formatPHP(totals.netCashFlow);
  wfNet.className = totals.netCashFlow >= 0 
    ? 'font-extrabold text-base text-emerald-600 dark:text-emerald-400' 
    : 'font-extrabold text-base text-rose-600 dark:text-rose-400';

  // Strategy Banner Target
  const topTarget = getSnowballTarget();
  if (topTarget) {
    document.getElementById('bannerTargetItem').textContent = `${topTarget.issuer} - ${topTarget.itemName}`;
    document.getElementById('bannerTargetDetail').textContent = 
      `Remaining balance: ${formatPHP(topTarget.stats.remainingBalance)}. Eliminating this frees up ${formatPHP(topTarget.monthlyAmort)}/month!`;
  } else {
    document.getElementById('bannerTargetItem').textContent = 'No Active Debt! 🎉';
    document.getElementById('bannerTargetDetail').textContent = 'You have zero active credit card installments for this period.';
  }

  // Quick Table: Active Installments
  const quickInstBody = document.getElementById('quickInstallmentsList');
  quickInstBody.innerHTML = '';
  const activeInst = appState.installments.filter(inst => isInstallmentActiveInMonth(inst, appState.activeMonth));
  
  if (activeInst.length === 0) {
    quickInstBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No active installments for ${appState.activeMonth}</td></tr>`;
  } else {
    activeInst.slice(0, 5).forEach(inst => {
      const stats = computeInstallmentStats(inst);
      const conf = ISSUER_CONFIG[inst.issuer] || ISSUER_CONFIG['OTHER'];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2.5">
          <div class="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${conf.badgeClass}">${inst.issuer}</span>
            <span class="truncate max-w-[140px]">${inst.itemName}</span>
          </div>
        </td>
        <td class="py-2.5 text-center">
          <span class="text-[11px] font-mono text-slate-500">${stats.monthsPaid}/${stats.term} mos</span>
          <div class="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-1 overflow-hidden">
            <div class="h-full bg-blue-500 rounded-full" style="width: ${stats.progressPercent}%"></div>
          </div>
        </td>
        <td class="py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400 font-mono">${formatPHP(stats.monthlyAmort)}</td>
        <td class="py-2.5 text-right font-medium text-slate-600 dark:text-slate-300 font-mono">${formatPHP(stats.remainingBalance)}</td>
      `;
      quickInstBody.appendChild(tr);
    });
  }

  // Quick Table: Personal Expenses
  const quickExpBody = document.getElementById('quickExpensesList');
  quickExpBody.innerHTML = '';
  const monthExp = appState.expenses.filter(e => e.month === appState.activeMonth);

  if (monthExp.length === 0) {
    quickExpBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No personal expenses for ${appState.activeMonth}</td></tr>`;
  } else {
    monthExp.slice(0, 5).forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2.5">
          <div class="font-medium text-slate-900 dark:text-white truncate max-w-[140px]">${escapeHtml(e.itemName)}</div>
          <div class="text-[10px] text-slate-400">${escapeHtml(e.category)}${e.creditCard ? ' • ' + escapeHtml(e.creditCard) : ''}</div>
        </td>
        <td class="py-2.5 text-center">
          <span class="text-[10px] px-1.5 py-0.5 rounded ${e.isRecurring ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'}">
            ${e.isRecurring ? 'Monthly' : 'One-time'}
          </span>
        </td>
        <td class="py-2.5 text-center">
          <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${e.isPaid ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'}">
            ${e.isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </td>
        <td class="py-2.5 text-right font-semibold text-rose-600 dark:text-rose-400 font-mono">${formatPHP(e.amount)}</td>
      `;
      quickExpBody.appendChild(tr);
    });
  }

  renderDashboardCharts();
}

// Render Dashboard Charts (Cashflow Donut & Issuer Distribution)
function renderDashboardCharts() {
  const totals = getActiveMonthTotals();

  // Donut Chart: Cash Flow Distribution
  document.getElementById('donutMonthLabel').textContent = appState.activeMonth;
  document.getElementById('legendCC').textContent = formatPHP(totals.totalCCAmortization);
  document.getElementById('legendExp').textContent = formatPHP(totals.totalExpenses);
  document.getElementById('legendSav').textContent = formatPHP(totals.totalSavings);
  document.getElementById('legendLeft').textContent = formatPHP(Math.max(0, totals.netCashFlow));

  const ctxDonut = document.getElementById('cashflowChart')?.getContext('2d');
  if (ctxDonut) {
    if (cashflowChart) cashflowChart.destroy();
    cashflowChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['CC Installments', 'Personal Expenses', 'Savings Deposits', 'Discretionary'],
        datasets: [{
          data: [
            totals.totalCCAmortization,
            totals.totalExpenses,
            totals.totalSavings,
            Math.max(0, totals.netCashFlow)
          ],
          backgroundColor: ['#3b82f6', '#f43f5e', '#14b8a6', '#10b981'],
          borderWidth: 2,
          borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${formatPHP(context.raw)}`
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // Issuer Distribution Bar Chart
  const issuerSums = {};
  const activeInst = appState.installments.filter(inst => isInstallmentActiveInMonth(inst, appState.activeMonth));
  activeInst.forEach(inst => {
    const issuer = inst.issuer || 'OTHER';
    issuerSums[issuer] = (issuerSums[issuer] || 0) + Number(inst.monthlyAmort);
  });

  const issuerLabels = Object.keys(issuerSums);
  const issuerValues = Object.values(issuerSums);
  const issuerColors = issuerLabels.map(l => (ISSUER_CONFIG[l] ? ISSUER_CONFIG[l].color : '#64748b'));

  let topIssuer = 'None';
  let topMax = 0;
  issuerLabels.forEach(l => {
    if (issuerSums[l] > topMax) {
      topMax = issuerSums[l];
      topIssuer = `${l} (${formatPHP(topMax)}/mo)`;
    }
  });
  document.getElementById('topCardBurden').textContent = topIssuer;

  const ctxBar = document.getElementById('cardsBarChart')?.getContext('2d');
  if (ctxBar) {
    if (cardsBarChart) cardsBarChart.destroy();
    cardsBarChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: issuerLabels.length ? issuerLabels : ['No Cards'],
        datasets: [{
          data: issuerValues.length ? issuerValues : [0],
          backgroundColor: issuerColors.length ? issuerColors : ['#cbd5e1'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Amortization: ${formatPHP(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => '₱' + (val >= 1000 ? (val/1000) + 'k' : val),
              font: { size: 10 }
            },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          },
          x: {
            ticks: { font: { size: 10, weight: 'bold' } },
            grid: { display: false }
          }
        }
      }
    });
  }
}

// 3. Render Credit Card Installments Table & Summary
function renderInstallmentsTable() {
  const issuerFilter = document.getElementById('filterCardIssuer').value;
  const statusFilter = document.getElementById('filterInstallmentStatus').value;

  const tbody = document.getElementById('installmentsTableBody');
  const emptyState = document.getElementById('installmentsEmptyState');
  tbody.innerHTML = '';

  let filtered = [...appState.installments];

  if (issuerFilter !== 'ALL') {
    filtered = filtered.filter(i => i.issuer === issuerFilter);
  }

  let totalMonthly = 0;
  let totalFinanced = 0;
  let totalRemaining = 0;
  let totalPaid = 0;

  let displayCount = 0;

  filtered.forEach(inst => {
    const stats = computeInstallmentStats(inst);

    totalMonthly += (stats.status === 'active' ? stats.monthlyAmort : 0);
    totalFinanced += stats.totalAmount;
    totalRemaining += stats.remainingBalance;
    totalPaid += stats.totalPaid;

    if (statusFilter === 'ACTIVE' && stats.status !== 'active') return;
    if (statusFilter === 'PAID' && stats.status !== 'paid') return;

    displayCount++;

    const conf = ISSUER_CONFIG[inst.issuer] || ISSUER_CONFIG['OTHER'];
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition';

    const lastPaidDisplay = inst.lastPaidDate ? inst.lastPaidDate : '<span class="text-slate-400">None</span>';

    tr.innerHTML = `
      <td class="py-3 px-4">
        <span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded text-white ${conf.badgeClass}">
          ${inst.issuer}
        </span>
        ${inst.customIssuer ? `<div class="text-[10px] text-slate-400 mt-0.5">${inst.customIssuer}</div>` : ''}
      </td>
      <td class="py-3 px-4">
        <div class="font-bold text-slate-900 dark:text-white text-xs">${inst.itemName}</div>
        ${inst.notes ? `<div class="text-[10px] text-slate-400 truncate max-w-[200px]">${inst.notes}</div>` : ''}
      </td>
      <td class="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-mono">${inst.startDate || '-'}</td>
      <td class="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-mono">${lastPaidDisplay}</td>
      <td class="py-3 px-3 text-center font-bold font-mono text-slate-800 dark:text-slate-200">${stats.term}</td>
      <td class="py-3 px-4 text-right font-bold font-mono text-blue-600 dark:text-blue-400">${formatPHP(stats.monthlyAmort)}</td>
      <td class="py-3 px-4 text-right font-semibold font-mono text-slate-800 dark:text-slate-200">${formatPHP(stats.totalAmount)}</td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1 font-mono text-[11px] font-bold">
          <span>${stats.monthsPaid}/${stats.term}</span>
          <span class="text-[10px] text-slate-400">(${stats.remainingMonths} left)</span>
        </div>
        <div class="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-1 overflow-hidden">
          <div class="h-full bg-blue-500 rounded-full" style="width: ${stats.progressPercent}%"></div>
        </div>
        <div class="text-[10px] text-slate-500 mt-0.5 font-mono">Bal: ${formatPHP(stats.remainingBalance)}</div>
      </td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1">
          <button onclick="recordMonthlyPayment('${inst.id}')" title="Mark 1 Month Paid" class="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 transition">
            <i class="fa-solid fa-check"></i>
          </button>
          <button onclick="editInstallment('${inst.id}')" title="Edit" class="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 transition">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteInstallment('${inst.id}')" title="Delete" class="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 transition">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (displayCount === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  // Update Summary Cards on Installments Tab
  document.getElementById('instSummaryMonthly').textContent = formatPHP(totalMonthly);
  document.getElementById('instSummaryTotalFinanced').textContent = formatPHP(totalFinanced);
  document.getElementById('instSummaryRemainingBalance').textContent = formatPHP(totalRemaining);
  document.getElementById('instSummaryPaidAmount').textContent = formatPHP(totalPaid);
}

// Populate Credit Card Filter & Datalist Suggestions for Personal Expenses
function populateExpenseCardControls() {
  const cardFilterEl = document.getElementById('filterExpenseCard');
  const datalistEl = document.getElementById('expCreditCardList');

  const expenseCards = new Set();
  let hasUnassigned = false;

  appState.expenses.forEach(e => {
    const card = (e.creditCard || '').trim();
    if (card) expenseCards.add(card);
    else hasUnassigned = true;
  });

  if (cardFilterEl) {
    const prevValue = cardFilterEl.value;
    cardFilterEl.innerHTML = '<option value="ALL">All Credit Cards</option>';

    Array.from(expenseCards).sort((a, b) => a.localeCompare(b)).forEach(card => {
      const opt = document.createElement('option');
      opt.value = card;
      opt.textContent = card;
      cardFilterEl.appendChild(opt);
    });

    if (hasUnassigned) {
      const noneOpt = document.createElement('option');
      noneOpt.value = 'NONE';
      noneOpt.textContent = 'No Credit Card / Cash';
      cardFilterEl.appendChild(noneOpt);
    }

    if (Array.from(cardFilterEl.options).some(o => o.value === prevValue)) {
      cardFilterEl.value = prevValue;
    } else {
      cardFilterEl.value = 'ALL';
    }
  }

  if (datalistEl) {
    const suggestions = new Set([
      ...expenseCards,
      ...appState.installments.map(i => (i.issuer === 'OTHER' ? (i.customIssuer || '') : i.issuer)).filter(Boolean),
      'BPI', 'BDO', 'EastWest', 'Chinabank', 'Metrobank', 'UnionBank', 'Security Bank', 'RCBC', 'Atome'
    ]);
    datalistEl.innerHTML = '';
    Array.from(suggestions).sort((a, b) => a.localeCompare(b)).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      datalistEl.appendChild(opt);
    });
  }
}

function getExpenseCardBadge(creditCard) {
  const card = (creditCard || '').trim();
  if (!card) {
    return '<span class="text-[11px] text-slate-400 italic">Cash / None</span>';
  }
  const upper = card.toUpperCase();
  const matchedKey = Object.keys(ISSUER_CONFIG).find(k => k !== 'OTHER' && upper.startsWith(k));
  const badgeClass = matchedKey
    ? ISSUER_CONFIG[matchedKey].badgeClass
    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';

  return `<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}">
    <i class="fa-solid fa-credit-card text-[9px]"></i> ${escapeHtml(card)}
  </span>`;
}

function buildExpenseRow(exp) {
  const tr = document.createElement('tr');
  tr.className = 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition';

  tr.innerHTML = `
    <td class="py-3 px-4">
      <span class="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
        ${escapeHtml(exp.category)}
      </span>
    </td>
    <td class="py-3 px-4">
      <div class="font-bold text-slate-900 dark:text-white text-xs">${escapeHtml(exp.itemName)}</div>
    </td>
    <td class="py-3 px-4">
      ${getExpenseCardBadge(exp.creditCard)}
    </td>
    <td class="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-mono">${escapeHtml(exp.dueDate || '-')}</td>
    <td class="py-3 px-3 text-center">
      <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${exp.isRecurring ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
        ${exp.isRecurring ? 'Monthly Recurring' : 'One-Time'}
      </span>
    </td>
    <td class="py-3 px-4 text-right font-bold font-mono text-rose-600 dark:text-rose-400">${formatPHP(exp.amount)}</td>
    <td class="py-3 px-3 text-center">
      <button onclick="toggleExpensePaid('${exp.id}')" class="text-xs font-semibold px-2.5 py-1 rounded-md transition ${exp.isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'}">
        ${exp.isPaid ? '<i class="fa-solid fa-check mr-1"></i> Paid' : 'Unpaid'}
      </button>
    </td>
    <td class="py-3 px-4 text-center">
      <div class="flex items-center justify-center gap-1">
        <button onclick="editExpense('${exp.id}')" title="Edit" class="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button onclick="deleteExpense('${exp.id}')" title="Delete" class="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </td>
  `;
  return tr;
}

// 4. Render Personal Expenses Table & Summary
function renderExpensesTable() {
  populateExpenseCardControls();

  const catFilter = document.getElementById('filterExpenseCategory').value;
  const cardFilter = document.getElementById('filterExpenseCard')?.value || 'ALL';
  const groupBy = document.getElementById('groupExpenseBy')?.value || 'none';
  const tbody = document.getElementById('expensesTableBody');
  const emptyState = document.getElementById('expensesEmptyState');
  tbody.innerHTML = '';

  const monthExpenses = appState.expenses.filter(e => e.month === appState.activeMonth);
  let filtered = [...monthExpenses];

  if (catFilter !== 'ALL') {
    filtered = filtered.filter(e => e.category === catFilter);
  }
  if (cardFilter === 'NONE') {
    filtered = filtered.filter(e => !(e.creditCard || '').trim());
  } else if (cardFilter !== 'ALL') {
    filtered = filtered.filter(e => (e.creditCard || '').trim() === cardFilter);
  }

  let total = 0;
  let recurring = 0;
  let variable = 0;
  let paid = 0;

  filtered.forEach(e => {
    const amt = Number(e.amount) || 0;
    total += amt;
    if (e.isRecurring) recurring += amt;
    else variable += amt;
    if (e.isPaid) paid += amt;
  });

  if (groupBy === 'creditCard' || groupBy === 'category') {
    const unassignedLabel = 'No Credit Card / Cash';
    const groups = new Map();

    filtered.forEach(exp => {
      const key = groupBy === 'creditCard'
        ? ((exp.creditCard || '').trim() || unassignedLabel)
        : exp.category;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(exp);
    });

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (groupBy === 'creditCard') {
        if (a === unassignedLabel) return 1;
        if (b === unassignedLabel) return -1;
      }
      return a.localeCompare(b);
    });

    sortedKeys.forEach(groupKey => {
      const items = groups.get(groupKey);
      const groupTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const groupPaid = items.filter(item => item.isPaid).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const groupUnpaid = groupTotal - groupPaid;

      const headerTr = document.createElement('tr');
      headerTr.className = 'bg-slate-100/90 dark:bg-slate-700/60 border-t border-b border-slate-200 dark:border-slate-600';
      const iconClass = groupBy === 'creditCard' ? 'fa-credit-card text-indigo-500' : 'fa-tag text-rose-500';
      headerTr.innerHTML = `
        <td colspan="5" class="py-2.5 px-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <i class="fa-solid ${iconClass}"></i> ${escapeHtml(groupKey)}
            </span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
              ${items.length} ${items.length === 1 ? 'item' : 'items'}
            </span>
            <span class="text-[11px] text-slate-500 dark:text-slate-300">
              Paid: <strong class="text-emerald-600 dark:text-emerald-400">${formatPHP(groupPaid)}</strong> · Unpaid: <strong class="text-rose-600 dark:text-rose-400">${formatPHP(groupUnpaid)}</strong>
            </span>
          </div>
        </td>
        <td class="py-2.5 px-4 text-right font-bold font-mono text-xs text-slate-900 dark:text-white">
          ${formatPHP(groupTotal)}
        </td>
        <td colspan="2" class="py-2.5 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Subtotal
        </td>
      `;
      tbody.appendChild(headerTr);

      items.forEach(exp => {
        tbody.appendChild(buildExpenseRow(exp));
      });
    });
  } else {
    filtered.forEach(exp => {
      tbody.appendChild(buildExpenseRow(exp));
    });
  }

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  // Summary figures
  document.getElementById('expSummaryTotal').textContent = formatPHP(total);
  document.getElementById('expSummaryRecurring').textContent = formatPHP(recurring);
  document.getElementById('expSummaryVariable').textContent = formatPHP(variable);
  document.getElementById('expSummaryPaid').textContent = formatPHP(paid);
}

// 5. Render Savings Deposits Table
function renderSavingsTable() {
  const tbody = document.getElementById('savingsTableBody');
  const emptyState = document.getElementById('savingsEmptyState');
  tbody.innerHTML = '';

  const monthSavings = appState.savings.filter(s => s.month === appState.activeMonth);
  const salary = getActiveSalary();
  const netIncome = salary.total || 0;

  let monthTotal = 0;
  monthSavings.forEach(s => { monthTotal += (Number(s.amount) || 0); });

  let allTimeTotal = 0;
  const institutions = new Set();
  appState.savings.forEach(s => {
    allTimeTotal += (Number(s.amount) || 0);
    if (s.institution) institutions.add(s.institution);
  });

  monthSavings.forEach(sav => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition';

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-teal-700 dark:text-teal-300 text-xs">
        <i class="fa-solid fa-vault mr-1 text-teal-500"></i> ${sav.institution}
      </td>
      <td class="py-3 px-4 font-bold text-slate-900 dark:text-white text-xs">${sav.goalName}</td>
      <td class="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-mono">${sav.date || '-'}</td>
      <td class="py-3 px-4 text-right font-bold font-mono text-teal-600 dark:text-teal-400">${formatPHP(sav.amount)}</td>
      <td class="py-3 px-4 text-slate-500 text-[11px]">${sav.notes || '-'}</td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1">
          <button onclick="editSavings('${sav.id}')" title="Edit" class="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteSavings('${sav.id}')" title="Delete" class="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (monthSavings.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  document.getElementById('savSummaryMonth').textContent = formatPHP(monthTotal);
  document.getElementById('savSummaryRate').textContent = netIncome > 0 ? `${((monthTotal / netIncome) * 100).toFixed(1)}% of net income` : '0% of net income';
  document.getElementById('savSummaryAllTime').textContent = formatPHP(allTimeTotal);
  document.getElementById('savSummaryAccounts').textContent = `${institutions.size} Institutions`;
}

// 6. DEBT ELIMINATOR & SNOWBALL STRATEGY ENGINE
function getSnowballTarget() {
  const activeDebts = appState.installments
    .map(inst => ({ ...inst, stats: computeInstallmentStats(inst) }))
    .filter(i => i.stats.remainingBalance > 0);

  if (activeDebts.length === 0) return null;

  if (appState.strategyMethod === 'burden') {
    // Highest monthly burden first (avalanche / cash flow free up)
    activeDebts.sort((a, b) => b.stats.monthlyAmort - a.stats.monthlyAmort);
  } else {
    // Snowball: lowest remaining principal balance first
    activeDebts.sort((a, b) => a.stats.remainingBalance - b.stats.remainingBalance);
  }

  return activeDebts[0];
}

function setStrategyMethod(method) {
  appState.strategyMethod = method;
  const btnSnowball = document.getElementById('btnStrategySnowball');
  const btnBurden = document.getElementById('btnStrategyBurden');
  const explanation = document.getElementById('strategyExplanation');

  if (method === 'snowball') {
    btnSnowball.className = 'py-1.5 px-3 rounded-md bg-white text-amber-900 font-bold shadow-sm transition';
    btnBurden.className = 'py-1.5 px-3 rounded-md text-white hover:bg-white/10 transition';
    explanation.textContent = 'Snowball targets the smallest remaining balance first for the fastest psychological wins and freeing monthly slots.';
  } else {
    btnBurden.className = 'py-1.5 px-3 rounded-md bg-white text-amber-900 font-bold shadow-sm transition';
    btnSnowball.className = 'py-1.5 px-3 rounded-md text-white hover:bg-white/10 transition';
    explanation.textContent = 'Cash Flow strategy targets the largest monthly amortization first to relieve maximum monthly budget pressure immediately.';
  }

  renderSnowballTab();
}

function renderSnowballTab() {
  const activeDebts = appState.installments
    .map(inst => ({ ...inst, stats: computeInstallmentStats(inst) }))
    .filter(i => i.stats.remainingBalance > 0);

  if (appState.strategyMethod === 'burden') {
    activeDebts.sort((a, b) => b.stats.monthlyAmort - a.stats.monthlyAmort);
  } else {
    activeDebts.sort((a, b) => a.stats.remainingBalance - b.stats.remainingBalance);
  }

  const totalOutstanding = activeDebts.reduce((sum, d) => sum + d.stats.remainingBalance, 0);
  document.getElementById('snowballTotalDebt').textContent = formatPHP(totalOutstanding);
  document.getElementById('snowballActiveCount').textContent = `${activeDebts.length} Active Debts`;

  const totals = getActiveMonthTotals();
  document.getElementById('snowballAvailableBuffer').textContent = formatPHP(Math.max(0, totals.netCashFlow));

  const topTarget = activeDebts[0];
  const targetCard = document.getElementById('snowballTopTargetCard');

  if (!topTarget) {
    targetCard.innerHTML = `
      <div class="p-8 text-center text-slate-500">
        <i class="fa-solid fa-trophy text-5xl text-amber-500 mb-3"></i>
        <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">Congratulations! You are Debt-Free!</h3>
        <p class="text-xs text-slate-500 mt-1">All your credit card installments are completely paid off.</p>
      </div>
    `;
  } else {
    const conf = ISSUER_CONFIG[topTarget.issuer] || ISSUER_CONFIG['OTHER'];
    document.getElementById('targetCardIssuerBadge').className = `px-2.5 py-1 rounded text-xs font-bold text-white ${conf.badgeClass}`;
    document.getElementById('targetCardIssuerBadge').textContent = topTarget.issuer;
    document.getElementById('targetCardItemName').textContent = topTarget.itemName;
    
    document.getElementById('targetRemainingBalance').textContent = formatPHP(topTarget.stats.remainingBalance);
    document.getElementById('targetMonthlyAmort').textContent = formatPHP(topTarget.stats.monthlyAmort);
    document.getElementById('targetMonthsLeft').textContent = `${topTarget.stats.remainingMonths} months`;
    document.getElementById('targetFreesUpAmort').textContent = `${formatPHP(topTarget.stats.monthlyAmort)}/mo`;
    document.getElementById('targetFreedCashflow').textContent = `+${formatPHP(topTarget.stats.monthlyAmort)}/mo`;

    // Calculate accelerated payoff with extra payment
    const totalAcceleratedPmt = topTarget.stats.monthlyAmort + appState.extraPayment;
    const acceleratedMonths = (topTarget.stats.remainingBalance / totalAcceleratedPmt).toFixed(1);
    document.getElementById('targetAcceleratedPayoff').textContent = `Payoff in ~${acceleratedMonths} mos!`;

    document.getElementById('targetReason').innerHTML = appState.strategyMethod === 'snowball'
      ? `Smallest balance (<b>${formatPHP(topTarget.stats.remainingBalance)}</b>). Knocking this out frees up <span class="font-bold text-emerald-600">${formatPHP(topTarget.stats.monthlyAmort)}/mo</span> immediately!`
      : `Heaviest monthly burden (<b>${formatPHP(topTarget.stats.monthlyAmort)}/mo</b>). Eliminating this frees up the largest chunk of your salary!`;
  }

  // Populate Elimination Order Table
  const tbody = document.getElementById('snowballTableBody');
  tbody.innerHTML = '';

  let cumulativeFreed = 0;
  let runningSnowballPayment = appState.extraPayment;

  activeDebts.forEach((debt, index) => {
    cumulativeFreed += debt.stats.monthlyAmort;
    const normalMos = debt.stats.remainingMonths;

    // Snowball calculation:
    // The top priority gets base amortization + runningSnowballPayment
    const totalPmt = debt.stats.monthlyAmort + (index === 0 ? runningSnowballPayment : 0);
    const accelMos = totalPmt > 0 ? (debt.stats.remainingBalance / totalPmt).toFixed(1) : normalMos;

    const conf = ISSUER_CONFIG[debt.issuer] || ISSUER_CONFIG['OTHER'];
    const tr = document.createElement('tr');
    tr.className = index === 0 ? 'bg-amber-50/60 dark:bg-amber-950/20 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-750';

    tr.innerHTML = `
      <td class="py-3 px-4 text-center">
        <span class="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-amber-500 text-white shadow' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">
          #${index + 1}
        </span>
      </td>
      <td class="py-3 px-4 font-bold">
        <span class="text-[10px] px-2 py-0.5 rounded text-white ${conf.badgeClass}">${debt.issuer}</span>
      </td>
      <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">${debt.itemName}</td>
      <td class="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">${formatPHP(debt.stats.remainingBalance)}</td>
      <td class="py-3 px-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">${formatPHP(debt.stats.monthlyAmort)}</td>
      <td class="py-3 px-4 text-center font-mono text-slate-500">${normalMos} mos</td>
      <td class="py-3 px-4 text-center font-mono font-extrabold text-amber-600 dark:text-amber-400">${accelMos} mos</td>
      <td class="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+${formatPHP(cumulativeFreed)}/mo</td>
    `;
    tbody.appendChild(tr);
  });
}

function recordTargetPayment() {
  const topTarget = getSnowballTarget();
  if (topTarget) {
    recordMonthlyPayment(topTarget.id);
  }
}

// 7. ANNUAL SUMMARY (12 Months Projections & Table)
function renderAnnualSummary() {
  const selectedYear = parseInt(document.getElementById('annualYearSelect').value, 10);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push(`${selectedYear}-${String(m).padStart(2, '0')}`);
  }

  let grandIncome = 0;
  let grandCC = 0;
  let grandExp = 0;
  let grandSav = 0;

  const monthlyData = months.map(ym => {
    // Income
    const sal = (appState.salaries && appState.salaries[ym]) ? appState.salaries[ym] : appState.defaultSalary;
    const income = sal ? (sal.total || 0) : 0;

    // CC Installments active in this specific month
    let ccTotal = 0;
    appState.installments.forEach(inst => {
      if (isInstallmentActiveInMonth(inst, ym)) {
        ccTotal += Number(inst.monthlyAmort) || 0;
      }
    });

    // Expenses in this month (or default recurring if future month)
    let expTotal = 0;
    const explicitExpenses = appState.expenses.filter(e => e.month === ym);
    if (explicitExpenses.length > 0) {
      expTotal = explicitExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    } else {
      // Project recurring expenses from active month
      const recurring = appState.expenses.filter(e => e.month === appState.activeMonth && e.isRecurring);
      expTotal = recurring.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }

    // Savings
    let savTotal = 0;
    const explicitSavings = appState.savings.filter(s => s.month === ym);
    if (explicitSavings.length > 0) {
      savTotal = explicitSavings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    }

    const totalBills = ccTotal + expTotal;
    const netCashFlow = income - totalBills - savTotal;

    grandIncome += income;
    grandCC += ccTotal;
    grandExp += expTotal;
    grandSav += savTotal;

    return {
      month: ym,
      income,
      ccTotal,
      expTotal,
      totalBills,
      savTotal,
      netCashFlow
    };
  });

  // Update Top Annual KPI Cards
  document.getElementById('annTotalIncome').textContent = formatPHP(grandIncome);
  document.getElementById('annTotalInstallments').textContent = formatPHP(grandCC);
  document.getElementById('annCCShare').textContent = grandIncome > 0 ? `${((grandCC / grandIncome) * 100).toFixed(1)}% of annual income` : '0%';
  document.getElementById('annTotalExpenses').textContent = formatPHP(grandExp);
  document.getElementById('annExpShare').textContent = grandIncome > 0 ? `${((grandExp / grandIncome) * 100).toFixed(1)}% of annual income` : '0%';
  document.getElementById('annTotalSavings').textContent = formatPHP(grandSav);
  document.getElementById('annSavRate').textContent = grandIncome > 0 ? `${((grandSav / grandIncome) * 100).toFixed(1)}% annual savings rate` : '0%';

  // Populate Annual Table
  const tbody = document.getElementById('annualTableBody');
  tbody.innerHTML = '';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  monthlyData.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.className = row.month === appState.activeMonth ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-750';
    
    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
        ${monthNames[idx]} ${selectedYear} ${row.month === appState.activeMonth ? '<span class="text-[10px] text-emerald-600 font-bold ml-1">(Active)</span>' : ''}
      </td>
      <td class="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">${formatPHP(row.income)}</td>
      <td class="py-3 px-4 text-right text-blue-600 dark:text-blue-400">${formatPHP(row.ccTotal)}</td>
      <td class="py-3 px-4 text-right text-rose-600 dark:text-rose-400">${formatPHP(row.expTotal)}</td>
      <td class="py-3 px-4 text-right text-purple-600 dark:text-purple-400 font-bold">${formatPHP(row.totalBills)}</td>
      <td class="py-3 px-4 text-right text-teal-600 dark:text-teal-400">${formatPHP(row.savTotal)}</td>
      <td class="py-3 px-4 text-right font-extrabold ${row.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
        ${formatPHP(row.netCashFlow)}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Annual Trajectory Line/Bar Chart
  const ctxAnnual = document.getElementById('annualChart')?.getContext('2d');
  if (ctxAnnual) {
    if (annualChart) annualChart.destroy();
    annualChart = new Chart(ctxAnnual, {
      type: 'line',
      data: {
        labels: monthNames,
        datasets: [
          {
            label: 'Net Income',
            data: monthlyData.map(d => d.income),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: false,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'Total Bills (CC + Exp)',
            data: monthlyData.map(d => d.totalBills),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: false,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'CC Installments',
            data: monthlyData.map(d => d.ccTotal),
            borderColor: '#3b82f6',
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            borderWidth: 1.5
          },
          {
            label: 'Net Remaining Cash Flow',
            data: monthlyData.map(d => d.netCashFlow),
            borderColor: '#14b8a6',
            fill: false,
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatPHP(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            ticks: { callback: (val) => '₱' + (val >= 1000 ? (val/1000) + 'k' : val) },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// ==================== MODAL OPERATIONS & CRUD ====================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    // Set default date fields if adding new
    if (modalId === 'modalInstallment' && !document.getElementById('instEditId').value) {
      document.getElementById('instStartDate').value = appState.activeMonth;
    } else if (modalId === 'modalExpense') {
      populateExpenseCardControls();
      if (!document.getElementById('expEditId').value) {
        document.getElementById('expDueDate').value = `${appState.activeMonth}-15`;
      }
    } else if (modalId === 'modalSavings' && !document.getElementById('savEditId').value) {
      document.getElementById('savDate').value = `${appState.activeMonth}-15`;
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    // Clear forms on close
    const form = modal.querySelector('form');
    if (form) form.reset();
    const editIdInput = modal.querySelector('input[type="hidden"]');
    if (editIdInput) editIdInput.value = '';
    document.getElementById('instCustomCardRow')?.classList.add('hidden');
  }
}

// --- CREDIT CARD INSTALLMENT CRUD ---

// Realtime calculation helper inside Installment Modal
function recalcInstallmentFields(source) {
  const term = Number(document.getElementById('instTerm').value) || 1;
  const monthlyInput = document.getElementById('instMonthlyAmort');
  const totalInput = document.getElementById('instTotalAmount');
  const monthsPaid = Number(document.getElementById('instMonthsPaid').value) || 0;

  if (source === 'monthly' || source === 'term') {
    const monthly = Number(monthlyInput.value) || 0;
    const computedTotal = (monthly * term).toFixed(2);
    totalInput.value = computedTotal;
  } else if (source === 'total') {
    const total = Number(totalInput.value) || 0;
    if (term > 0) {
      monthlyInput.value = (total / term).toFixed(2);
    }
  }

  const monthlyVal = Number(monthlyInput.value) || 0;
  const remaining = Math.max(0, (term - monthsPaid) * monthlyVal);
  document.getElementById('modalComputedRemaining').textContent = formatPHP(remaining);
}

function handleSaveInstallment(e) {
  e.preventDefault();
  const editId = document.getElementById('instEditId').value;
  const issuer = document.getElementById('instCardIssuer').value;
  const customIssuer = document.getElementById('instCustomCardName').value.trim();
  const itemName = document.getElementById('instItemName').value.trim();
  const startDate = document.getElementById('instStartDate').value;
  const lastPaidDate = document.getElementById('instLastPaidDate').value;
  const term = Number(document.getElementById('instTerm').value) || 1;
  const monthlyAmort = Number(document.getElementById('instMonthlyAmort').value) || 0;
  const totalAmount = Number(document.getElementById('instTotalAmount').value) || (term * monthlyAmort);
  const monthsPaid = Number(document.getElementById('instMonthsPaid').value) || 0;

  if (editId) {
    // Update existing
    const idx = appState.installments.findIndex(i => i.id === editId);
    if (idx !== -1) {
      appState.installments[idx] = {
        ...appState.installments[idx],
        issuer,
        customIssuer,
        itemName,
        startDate,
        lastPaidDate,
        term,
        monthlyAmort,
        totalAmount,
        monthsPaid
      };
      showToast('Installment updated successfully!', 'success');
    }
  } else {
    // Create new
    const newInst = {
      id: 'inst_' + Date.now(),
      issuer,
      customIssuer,
      itemName,
      startDate,
      lastPaidDate,
      term,
      monthlyAmort,
      totalAmount,
      monthsPaid
    };
    appState.installments.push(newInst);
    showToast('New installment recorded!', 'success');
  }

  saveData();
  closeModal('modalInstallment');
  renderAll();
}

function editInstallment(id) {
  const inst = appState.installments.find(i => i.id === id);
  if (!inst) return;

  document.getElementById('instEditId').value = inst.id;
  document.getElementById('modalInstallmentTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-500"></i> Edit Installment';
  document.getElementById('instCardIssuer').value = inst.issuer;
  
  if (inst.issuer === 'OTHER') {
    document.getElementById('instCustomCardRow').classList.remove('hidden');
    document.getElementById('instCustomCardName').value = inst.customIssuer || '';
  } else {
    document.getElementById('instCustomCardRow').classList.add('hidden');
  }

  document.getElementById('instItemName').value = inst.itemName;
  document.getElementById('instStartDate').value = inst.startDate;
  document.getElementById('instLastPaidDate').value = inst.lastPaidDate || '';
  document.getElementById('instTerm').value = inst.term;
  document.getElementById('instMonthlyAmort').value = inst.monthlyAmort;
  document.getElementById('instTotalAmount').value = inst.totalAmount;
  document.getElementById('instMonthsPaid').value = inst.monthsPaid || 0;

  recalcInstallmentFields('monthly');
  openModal('modalInstallment');
}

function deleteInstallment(id) {
  const inst = appState.installments.find(i => i.id === id);
  if (!inst) return;
  if (confirm(`Are you sure you want to delete "${inst.itemName}" (${inst.issuer})?`)) {
    appState.installments = appState.installments.filter(i => i.id !== id);
    saveData();
    renderAll();
    showToast('Installment deleted.', 'info');
  }
}

function recordMonthlyPayment(id) {
  const inst = appState.installments.find(i => i.id === id);
  if (!inst) return;

  if ((inst.monthsPaid || 0) < inst.term) {
    inst.monthsPaid = (inst.monthsPaid || 0) + 1;
    // Set last paid date to today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    inst.lastPaidDate = todayStr;
    saveData();
    renderAll();
    showToast(`Payment recorded for ${inst.itemName}! (${inst.monthsPaid}/${inst.term} paid)`, 'success');
  } else {
    showToast(`${inst.itemName} is already fully paid!`, 'info');
  }
}

// --- PERSONAL EXPENSES CRUD ---

function handleSaveExpense(e) {
  e.preventDefault();
  const editId = document.getElementById('expEditId').value;
  const category = document.getElementById('expCategory').value;
  const itemName = document.getElementById('expItemName').value.trim();
  const creditCard = document.getElementById('expCreditCard').value.trim();
  const amount = Number(document.getElementById('expAmount').value) || 0;
  const dueDate = document.getElementById('expDueDate').value;
  const isRecurring = document.getElementById('expIsRecurring').checked;
  const isPaid = document.getElementById('expIsPaid').checked;

  if (editId) {
    const idx = appState.expenses.findIndex(e => e.id === editId);
    if (idx !== -1) {
      appState.expenses[idx] = {
        ...appState.expenses[idx],
        category,
        itemName,
        creditCard,
        amount,
        dueDate,
        isRecurring,
        isPaid
      };
      showToast('Expense updated!', 'success');
    }
  } else {
    const newExp = {
      id: 'exp_' + Date.now(),
      month: appState.activeMonth,
      category,
      itemName,
      creditCard,
      amount,
      dueDate,
      isRecurring,
      isPaid
    };
    appState.expenses.push(newExp);
    showToast('Personal expense added!', 'success');
  }

  saveData();
  closeModal('modalExpense');
  renderAll();
}

function editExpense(id) {
  const exp = appState.expenses.find(e => e.id === id);
  if (!exp) return;

  document.getElementById('expEditId').value = exp.id;
  document.getElementById('modalExpenseTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-rose-500"></i> Edit Expense';
  document.getElementById('expCategory').value = exp.category;
  document.getElementById('expItemName').value = exp.itemName;
  document.getElementById('expCreditCard').value = exp.creditCard || '';
  document.getElementById('expAmount').value = exp.amount;
  document.getElementById('expDueDate').value = exp.dueDate || '';
  document.getElementById('expIsRecurring').checked = !!exp.isRecurring;
  document.getElementById('expIsPaid').checked = !!exp.isPaid;

  openModal('modalExpense');
}

function deleteExpense(id) {
  if (confirm('Delete this expense?')) {
    appState.expenses = appState.expenses.filter(e => e.id !== id);
    saveData();
    renderAll();
    showToast('Expense deleted.', 'info');
  }
}

function toggleExpensePaid(id) {
  const exp = appState.expenses.find(e => e.id === id);
  if (!exp) return;
  exp.isPaid = !exp.isPaid;
  saveData();
  renderAll();
  showToast(`${exp.itemName} marked as ${exp.isPaid ? 'PAID' : 'UNPAID'}.`, 'info');
}

// Rollover recurring expenses into next month
function rolloverMonth() {
  const [yearStr, monthStr] = appState.activeMonth.split('-');
  let nextYear = parseInt(yearStr, 10);
  let nextMonth = parseInt(monthStr, 10) + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextYM = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

  // Find all recurring expenses in active month
  const recurring = appState.expenses.filter(e => e.month === appState.activeMonth && e.isRecurring);

  if (recurring.length === 0) {
    showToast('No recurring expenses marked to rollover.', 'info');
    return;
  }

  let addedCount = 0;
  recurring.forEach(item => {
    // check if already exists in next month
    const exists = appState.expenses.some(e => e.month === nextYM && e.itemName === item.itemName);
    if (!exists) {
      appState.expenses.push({
        id: 'exp_' + Date.now() + Math.random().toString(36).substr(2, 4),
        month: nextYM,
        category: item.category,
        itemName: item.itemName,
        creditCard: item.creditCard || '',
        amount: item.amount,
        dueDate: item.dueDate ? item.dueDate.replace(appState.activeMonth, nextYM) : '',
        isRecurring: true,
        isPaid: false
      });
      addedCount++;
    }
  });

  // Also carry over default salary if not set
  if (!appState.salaries[nextYM]) {
    appState.salaries[nextYM] = { ...getActiveSalary() };
  }

  saveData();
  appState.activeMonth = nextYM;
  initMonthPicker();
  renderAll();
  showToast(`Rolled over ${addedCount} recurring expenses into ${nextYM}!`, 'success');
}

// --- SAVINGS CRUD ---

function handleSaveSavings(e) {
  e.preventDefault();
  const editId = document.getElementById('savEditId').value;
  const institution = document.getElementById('savInstitution').value;
  const goalName = document.getElementById('savGoalName').value.trim();
  const amount = Number(document.getElementById('savAmount').value) || 0;
  const date = document.getElementById('savDate').value;
  const notes = document.getElementById('savNotes').value.trim();

  if (editId) {
    const idx = appState.savings.findIndex(s => s.id === editId);
    if (idx !== -1) {
      appState.savings[idx] = {
        ...appState.savings[idx],
        institution,
        goalName,
        amount,
        date,
        notes
      };
      showToast('Savings deposit updated!', 'success');
    }
  } else {
    const newSav = {
      id: 'sav_' + Date.now(),
      month: appState.activeMonth,
      institution,
      goalName,
      amount,
      date,
      notes
    };
    appState.savings.push(newSav);
    showToast('Savings deposit recorded!', 'success');
  }

  saveData();
  closeModal('modalSavings');
  renderAll();
}

function editSavings(id) {
  const sav = appState.savings.find(s => s.id === id);
  if (!sav) return;

  document.getElementById('savEditId').value = sav.id;
  document.getElementById('modalSavingsTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-teal-500"></i> Edit Savings Deposit';
  document.getElementById('savInstitution').value = sav.institution;
  document.getElementById('savGoalName').value = sav.goalName;
  document.getElementById('savAmount').value = sav.amount;
  document.getElementById('savDate').value = sav.date || '';
  document.getElementById('savNotes').value = sav.notes || '';

  openModal('modalSavings');
}

function deleteSavings(id) {
  if (confirm('Delete this savings record?')) {
    appState.savings = appState.savings.filter(s => s.id !== id);
    saveData();
    renderAll();
    showToast('Savings record deleted.', 'info');
  }
}

// --- SALARY CONFIGURATION ---

function openSalaryModal() {
  const cur = getActiveSalary();
  document.getElementById('salaryCutoff1').value = cur.cutoff1 || '';
  document.getElementById('salaryCutoff2').value = cur.cutoff2 || '';
  document.getElementById('salaryOther').value = cur.other || '';
  recalcSalaryTotal();
  openModal('modalSalary');
}

function recalcSalaryTotal() {
  const c1 = Number(document.getElementById('salaryCutoff1').value) || 0;
  const c2 = Number(document.getElementById('salaryCutoff2').value) || 0;
  const oth = Number(document.getElementById('salaryOther').value) || 0;
  const total = c1 + c2 + oth;
  document.getElementById('salaryModalTotal').textContent = formatPHP(total);
}

function handleSaveSalary(e) {
  e.preventDefault();
  const c1 = Number(document.getElementById('salaryCutoff1').value) || 0;
  const c2 = Number(document.getElementById('salaryCutoff2').value) || 0;
  const oth = Number(document.getElementById('salaryOther').value) || 0;
  const total = c1 + c2 + oth;

  const salaryObj = { cutoff1: c1, cutoff2: c2, other: oth, total };

  // Set for active month
  if (!appState.salaries) appState.salaries = {};
  appState.salaries[appState.activeMonth] = salaryObj;

  // Set as default if checked
  if (document.getElementById('salaryApplyAll').checked) {
    appState.defaultSalary = { ...salaryObj };
  }

  saveData();
  closeModal('modalSalary');
  renderAll();
  showToast('Monthly salary updated!', 'success');
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');

  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-800 text-white dark:bg-slate-700'
  };

  const icons = {
    success: '<i class="fa-solid fa-circle-check mr-2"></i>',
    error: '<i class="fa-solid fa-circle-exclamation mr-2"></i>',
    info: '<i class="fa-solid fa-bell mr-2"></i>'
  };

  toast.className = `toast px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `${icons[type] || ''}<span>${message}</span>`;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('toast-show'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
