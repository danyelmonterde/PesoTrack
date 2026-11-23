# 🇵🇭 PesoTrack PH - Credit Card Installments & Expense Tracker

A modern, responsive, and privacy-first web application designed for Filipinos to track credit card installments, personal expenses, savings deposits, and monthly salary cutoffs, with built-in **Debt Snowball & Cash Flow Elimination Strategies** and **Annual Summary Projections**.

---

## ✨ Features

### 1. 💳 Credit Card Installment Tracker
- **Philippine Card & Loan Issuers Supported (Dropdown):**
  - **BPI** (Bank of the Philippine Islands)
  - **BDO** (Banco de Oro)
  - **EASTWEST**
  - **CHINABANK**
  - **ATOME** & **ATOME CASH**
  - **METROBANK**
  - **SPAYLATER** (Shopee PayLater)
  - **SLOAN** (Shopee Loan)
  - **TONIK** Digital Bank
  - **OTHER / Custom Issuers** (Maya Credit, Security Bank, RCBC, etc.)
- **Details Encoded:**
  - Item / Purchase Name
  - Payment Start Date (`YYYY-MM`)
  - Last Paid Date (`YYYY-MM-DD`)
  - Installment Term (in months: 3, 6, 9, 12, 18, 24, 36)
  - Monthly Amortization (in Philippine Pesos ₱)
  - **Auto-Computed Total Amount:** Instantly syncs with Monthly Amortization and Term
  - Real-time tracking of:
    - Months Paid vs Months Remaining
    - Remaining Principal Balance
    - Visual progress bar for every installment
    - Quick action button to mark 1-month payment with automatic date timestamp

### 2. ⚡ Real-Time Computation of Total Bills & Cash Flow
- Real-time KPI summaries:
  - **Total Monthly CC Amortization**
  - **Total Remaining Debt Balance**
  - **Total Monthly Personal Expenses**
  - **Total Bills to Pay** (CC Installments + Personal Expenses)
  - **Net Discretionary Cash Flow** (Salary − Total Bills − Savings)
  - Visual breakdown chart and Cash Flow Waterfall diagram.

### 3. 📝 Personal Expenses (Non-Installments)
- Track everyday living expenses and bills:
  - Categories: Housing / Rent, Utilities (Meralco, Maynilad), Groceries & Food, Internet / Mobile (PLDT, Globe), Transport (Grab, Toll, Gas), Subscriptions (Netflix, Spotify), Insurance, Family Allowance, and Miscellaneous.
  - Track Due Dates and Paid / Unpaid status with one click.
  - Monthly Recurring vs One-time flags.
  - **Rollover Month:** Instantly duplicate recurring bills into the next month so you don't have to re-enter them!

### 4. 💰 Savings & Investment Deposits
- Encode deposits for:
  - **Pag-IBIG MP2**
  - **Maya Savings**
  - **SeaBank**
  - **GoTyme Bank**
  - **Tonik Stash**
  - **Emergency Fund** (Traditional Banks)
  - **Stocks / REITs / UITF**
- Track savings rate (% of monthly income saved) and cumulative deposits across all months.

### 5. 🎯 Smart Debt Eliminator & Snowball Strategy
- **Debt Snowball Method:** Automatically prioritizes your credit card with the smallest remaining balance for fast psychological wins and to immediately liberate monthly cash flow slots.
- **Cash Flow Burden Method:** Targets the heaviest monthly amortization to relieve budget pressure immediately.
- **Top Elimination Recommendation Card:** Recommends exactly which card to kill first, how much monthly amortization it frees up upon elimination, and gives an interactive **Extra Payment Acceleration Slider** (₱0 to ₱30,000/mo) to simulate debt freedom timelines.
- **Payoff Sequence Table:** Full step-by-step roadmap showing regular payoff vs snowball accelerated payoff and cumulative cash flow unlocked.

### 6. 💵 Monthly Salary & 15th/30th Cutoffs
- Encode Philippine payroll cutoffs:
  - 15th Cutoff
  - 30th / End-of-month Cutoff
  - Freelance / Bonuses / 13th month pay
- Calculates net take-home pay and debt-to-income ratios.

### 7. 📅 12-Month Annual Summary & Trajectory
- Select year (2025, 2026, 2027, etc.)
- 12-month visual financial trajectory chart (Chart.js)
- Month-by-month table of:
  - Income
  - CC Installments
  - Personal Expenses
  - Total Bills
  - Savings
  - Net Cash Flow

### 8. 🔒 Privacy & Backup
- **100% Client-Side:** No server required. Your financial data stays exclusively on your device in browser `localStorage`.
- **Export & Import JSON:** Backup your data or transfer between devices anytime.
- **Preloaded Philippine Sample Data:** Test out realistic numbers with one click.

---

## 🚀 How to Run

Because this is a modern self-contained HTML5/CSS3/JavaScript application, you can run it immediately without installing any build tools:

1. **Directly open `index.html` in any web browser** (Google Chrome, Microsoft Edge, Firefox, Brave, Safari):
   - Double-click `index.html` in Windows File Explorer, or
   - Right-click `index.html` -> "Open with" -> Google Chrome / Microsoft Edge.

2. **Or start a local web server (optional):**
   ```powershell
   # If Python is installed:
   python -m http.server 8080

   # Or using npx:
   npx serve .
   ```
   Then open `http://localhost:8080` in your browser.
