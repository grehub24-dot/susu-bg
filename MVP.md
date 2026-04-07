# 💻 REVISED MVP SPECIFICATION

## Product Goal

Build a Susu fintech MVP where clients can register securely, manage wallet balances, perform deposits and withdrawals, receive receipts/alerts, and be supported by admin and teller operations.

## 1) Registration and Access

- Client registration channels:
  - Self-registration on Susu landing page
  - Admin-assisted registration in admin portal
- OTP verification is required for:
  - Registration
  - Login
- Login supports:
  - Email + PIN
  - Phone number + PIN
- PIN supports:
  - 4-digit
  - 6-digit
- Post-OTP flow:
  - Temporary OTP session
  - Redirect to PIN reset/setup page
  - Continue to wallet/dashboard

## 2) Client Wallet and Profile

- Client can view wallet/dashboard
- Client can see available amount display
- Client can edit profile bio and profile details

## 3) Transactions and Receipts

- Client can perform:
  - Deposit
  - Withdrawal
- Supported transaction records:
  - Deposit records
  - Withdrawal records
  - Receipt records for both transaction types
- PDF receipt support:
  - Download
  - Print

## 4) Alerts and Notifications

- On successful/updated transactions, system sends:
  - Email alert
  - SMS alert

## 5) Admin Messaging

- Admin can send in-app messages:
  - Individual client message
  - Bulk client message

## 6) Teller Module

- Add teller section for on-site operations
- Teller can process:
  - Client deposits
  - Client withdrawals
- Teller transaction outputs:
  - Instant email alert
  - Instant SMS alert
  - Counter-printable PDF receipt

## 7) Payment Options in Client Section

- Current/manual options:
  - MoMo payment link
  - MoMo QR code scan
  - Bank MoMo number placeholder
  - Bank cheque placeholder
- Placeholder options for future development:
  - Paystack placeholder
  - GhanaPay QR code placeholder

## 8) Required Client Data Fields

- Full Name
- Passport Picture
- Ghana Card upload
- Selfie picture upload
- MoMo Number
- House Address
- GPS Address
- Region
- Hometown

## 9) PIN Reset Security

- Selfie upload is required during PIN reset flow

## 10) Payment Channel Coverage

- Deposit channels:
  - MoMo number
  - Bank account
  - Credit card
- Withdrawal channel:
  - MoMo number

## 11) Identity and Compliance Requirements

- Registration with Ghana Card is required
- Self-registration with PIN code is required
- MoMo line transactions are supported
- Credit card deposits are supported
- Bank account support is included

## 12) USSD

- Keep a placeholder section for USSD usage instructions in client area

## 13) Build-Ready Module Checklist (Mapped to Current Codebase)

### A. Auth + OTP + PIN Reset

- [x] Basic register/login with PIN
  - Backend: `backend/src/controllers/auth.controller.js`, `backend/src/routes/auth.routes.js`
  - Frontend: `frontend/src/app/(auth)/register/page.tsx`, `frontend/src/app/(auth)/login/page.tsx`
- [x] Add email-or-phone login support
  - Update backend validation and lookup logic in `backend/src/controllers/auth.controller.js`
  - Update login form in `frontend/src/app/(auth)/login/page.tsx`
- [ ] Replace static OTP with real generated OTP + verify endpoint
  - Extend auth routes in `backend/src/routes/auth.routes.js`
  - Add OTP verify controller logic in `backend/src/controllers/auth.controller.js`
  - Reuse SMS sender in `backend/src/services/wigal.service.js`
- [x] Add PIN reset flow with selfie upload
  - New reset endpoints under `backend/src/routes/auth.routes.js`
  - Storage/upload handling in backend service layer
  - New frontend reset page under `frontend/src/app/(auth)/`

### B. Client Profile + KYC Fields

- [ ] Add required profile fields to schema
  - Update `supabase/schema.sql` (`users` profile columns and identity file URLs)
- [ ] Add profile read/update API
  - Add controller and route under `backend/src/controllers/` and `backend/src/routes/`
- [x] Add profile page and edit form (bio + fields)
  - Add page under `frontend/src/app/(dashboard)/`

### C. Wallet, Dashboard, Transactions

- [x] Wallet balance and transaction history APIs
  - `backend/src/controllers/wallet.controller.js`
  - `backend/src/controllers/transaction.controller.js`
  - `backend/src/routes/wallet.routes.js`
  - `backend/src/routes/transaction.routes.js`
- [x] Dashboard, deposit, withdraw, transactions pages
  - `frontend/src/app/(dashboard)/dashboard/page.tsx`
  - `frontend/src/app/(dashboard)/deposit/page.tsx`
  - `frontend/src/app/(dashboard)/withdraw/page.tsx`
  - `frontend/src/app/(dashboard)/transactions/page.tsx`

### D. Payments + Placeholders

- [x] Paystack live flow for deposit/withdraw already implemented
  - `backend/src/services/payment.service.js`
  - `backend/src/controllers/webhook.controller.js`
- [x] Add client-visible payment options placeholders
  - Update deposit/payment UI in `frontend/src/app/(dashboard)/deposit/page.tsx`
  - Include: MoMo link, MoMo QR placeholder, bank MoMo number placeholder, bank cheque placeholder, GhanaPay QR placeholder, Paystack placeholder label
- [ ] Add transaction channel metadata
  - Extend transaction payload + DB metadata usage in `backend/src/controllers/transaction.controller.js` and `backend/src/services/payment.service.js`

### E. Alerts + Receipt Delivery

- [x] SMS service exists and is wired for OTP/alerts utility
  - `backend/src/services/wigal.service.js`
- [x] PDF generation + email delivery service exists
  - `backend/src/services/receipt.service.js`
- [ ] Trigger receipt generation + email/SMS after webhook success
  - Integrate `receipt.service.js` in `backend/src/services/payment.service.js` webhook handlers

### F. Admin Operations

- [x] Admin users list, transaction logs, KYC approve endpoint
  - `backend/src/controllers/admin.controller.js`
  - `backend/src/routes/admin.routes.js`
- [x] Add admin in-app messaging (individual + bulk)
  - New DB table in `supabase/schema.sql`
  - New backend controller/routes under `backend/src/controllers/` and `backend/src/routes/`
  - New admin UI page under `frontend/src/app/(dashboard)/`

### G. Teller Module

- [ ] Add teller role + teller APIs for on-site deposits/withdrawals
  - RBAC + role fields in `supabase/schema.sql`
  - New backend teller controller/routes
- [x] Add teller UI for counter operations and printable receipts
  - New teller page under `frontend/src/app/(dashboard)/`
  - Print action connected to generated PDF receipt URL

### H. USSD Instructions Placeholder

- [x] USSD callback backend exists
  - `backend/src/controllers/ussd.controller.js`
  - `backend/src/routes/ussd.routes.js`
- [x] Add client-facing USSD instructions placeholder
  - Add section/page in `frontend/src/app/(dashboard)/`

## 14) Recommended Implementation Order (Next Sprints)

1. Auth hardening: real OTP verification + email/phone login + PIN reset with selfie
2. Profile/KYC schema extension + profile edit API/UI
3. Webhook post-processing: receipt generation + email/SMS notifications
4. Client payment placeholders + channel metadata
5. Admin in-app messaging (individual/bulk)
6. Teller role, APIs, and teller UI
7. USSD instruction placeholder in client dashboard


     