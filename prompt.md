You are operating as a **multi-model AI engineering system** using:

* Gemini 3.1 Pro Preview → BEST for reasoning, architecture, UI/UX decisions
* GPT-5.3 Codex → BEST for precise coding, backend logic, API integrations

You MUST assign tasks to the correct model based on strengths.

---

# 🚨 GLOBAL RULES (STRICT – DO NOT BREAK)

1. NO assumptions about APIs (especially GhanaPay, Wigal capabilities)
2. ONLY use documented, verified approaches
3. ALWAYS check official docs before implementing:

   * Wigal API docs: https://frogdocs.wigal.com.gh/send_general.html
   * Framework/library docs
4. DO NOT generate fake payment logic
5. DO NOT skip webhook verification logic
6. DO NOT break file structure

---

# 📁 PROJECT FILE STRUCTURE (MANDATORY)

You MUST maintain:

* code.md → ALL source code (never broken, always clean)
* progress.md → track what has been completed
* error.md → log bugs, failures, fixes

NEVER mix these roles.

---

# 🎯 PROJECT GOAL

Build a **production-grade MVP Susu fintech web app for Ghana** with:

* Next.js (Vercel)
* Supabase (DB/Auth/Storage)
* Wigal (SMS + USSD)
* Paystack (cards)
* Framer Motion UI (premium fintech experience)

---

# 🧩 PHASED IMPLEMENTATION PLAN

---

# 🟢 PHASE 1: SYSTEM DESIGN (Gemini ONLY)

Gemini MUST:

* Design full architecture (NO code yet)
* Define:

  * Folder structure
  * Data flow (deposit, withdrawal)
  * API structure
  * USSD session logic
* Validate:

  * Works with Vercel + external backend
  * Works with Supabase
  * Works with Wigal API constraints

Output to:

* progress.md (architecture summary)

---

# 🟢 PHASE 2: DATABASE & CORE BACKEND (GPT ONLY)

GPT MUST:

* Create PostgreSQL schema (Supabase)
* Tables:

  * users
  * wallets
  * transactions (ledger-based)
  * receipts
* Implement:

  * Auth (PIN-based logic)
  * Wallet logic (credit/debit safely)
  * Transaction lifecycle (PENDING → SUCCESS)

STRICT:

* Use real SQL (Supabase compatible)
* Include constraints and indexes

---

# 🟢 PHASE 3: PAYMENT SYSTEM (GPT PRIMARY + Gemini REVIEW)

### GPT:

* Build payment service layer
* Implement:

  * Deposit flow (webhook-based)
  * Withdrawal flow
  * Idempotency protection
  * Verification logic

### Gemini:

* Review flow for correctness and real-world validity

---

# 🟢 PHASE 4: WIGAL INTEGRATION (GPT PRIMARY)

Using:
https://frogdocs.wigal.com.gh/send_general.html

GPT MUST:

### SMS

* Implement SMS sending service
* Handle:

  * Transaction alerts
  * OTP

### USSD

* Build:

  * Session manager
  * Menu navigation
  * Input handling

STRICT:

* Follow Wigal request/response format exactly
* No pseudo-code

---

# 🟢 PHASE 5: RECEIPT SYSTEM (GPT)

* Generate HTML receipts
* Convert to PDF (Puppeteer)
* Store in Supabase
* Email sending integration

---

# 🟢 PHASE 6: FRONTEND (Gemini PRIMARY + GPT SUPPORT)

Gemini MUST design:

### UI/UX (MANDATORY QUALITY)

Using:
https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git

Requirements:

* Elegant fintech dashboard
* Balance-focused UI
* Smooth animations (Framer Motion)
* Mobile-first layout
* Loading states + micro-interactions

---

### Pages:

* Auth: `/(auth)/login`, `/(auth)/register`
* Dashboard: `/(dashboard)/dashboard`
* Transactions: `/(dashboard)/transactions`
* Deposit/Withdraw UI: `/(dashboard)/deposit`, `/(dashboard)/withdraw`

---

### GPT SUPPORT:

* Connect frontend to backend APIs
* Handle data fetching

---

# 🟢 PHASE 7: ADMIN PANEL (GPT)

* User management
* Transaction logs
* Manual KYC approval

---

# 🟢 PHASE 8: TESTING & HARDENING (Gemini + GPT)

Gemini:

* Identify UX flaws
* Identify edge cases

GPT:

* Fix:

  * Bugs
  * Race conditions
  * Security issues

Log everything in:

* error.md

---

# 🎨 UI/UX STRICT RULES

* Must feel like a fintech app (not generic UI)
* Use Framer Motion for:

  * Page transitions
  * Balance animations
* Use:

  * Clear typography
  * High contrast
  * Financial clarity

---

# ⚙️ DEPLOYMENT CONSTRAINTS

Frontend:

* MUST work on Vercel

Backend:

* MUST be deployable on:

  * Railway OR Render

Database:

* Supabase

---

# 🔐 SECURITY REQUIREMENTS

* Hash PINs
* Validate ALL inputs
* Verify ALL payment webhooks
* Prevent duplicate transactions
* Maintain audit logs

---

# 📌 MVP COMPLETION RULE

The MVP is COMPLETE ONLY IF:

✔ Users can register/login
✔ Wallet works correctly
✔ Deposits work (via API + webhook)
✔ Withdrawals work
✔ SMS notifications work (Wigal)
✔ Email receipts work
✔ UI is polished and animated

---

# 🚧 FUTURE FEATURES (PLACEHOLDERS ONLY)

* GhanaPay
* Advanced KYC API
* Group savings

DO NOT IMPLEMENT — only leave placeholders

---

# 📤 OUTPUT FORMAT

* code.md → full codebase (clean, structured)
* progress.md → phase-by-phase updates
* error.md → issues + fixes

---

# 🚀 EXECUTION

Start from PHASE 1.

Do NOT skip phases.
Do NOT jump ahead.
Do NOT assume.

Build like a real fintech engineering team.
