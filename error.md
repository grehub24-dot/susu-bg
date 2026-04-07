# 🐛 Error & Debug Log

*This file tracks bugs, failures, and fixes throughout the project lifecycle.*

| Date | Phase | Issue Description | Fix Applied | Status |
| :--- | :--- | :--- | :--- | :--- |
| 2026-04-05 | Phase 3 | **Race Condition:** Concurrent deposit webhooks could trigger double crediting if `wallet` table is read and written sequentially in Node.js. | **GPT Fix:** Moved logic to a PostgreSQL Stored Procedure (`credit_wallet`) that uses `UPDATE ... WHERE status = 'PENDING'` and checks `FOUND` before crediting. Guarantees ACID compliance. | FIXED ✅ |
| 2026-04-05 | Phase 3 | **Double Spending:** If a user triggers a withdrawal via USSD and Web App simultaneously, they could exceed their balance. | **GPT Fix:** Updated withdrawal flow to deduct balance *immediately* upon creating the PENDING transaction (`init_withdrawal` RPC). Funds are restored only if the gateway fails. | FIXED ✅ |
| 2026-04-05 | Phase 3 | **Security (Webhook Spoofing):** Malicious actors could forge a Paystack webhook to manually credit their wallet. | **GPT Fix:** Implemented `verifyWebhookSignature` using `crypto.createHmac` to validate the `x-paystack-signature` header against our secret key. | FIXED ✅ |
| 2026-04-05 | Phase 4 | **USSD UX Flaw:** Users might enter empty inputs or invalid strings when prompted for an amount. | **Gemini Fix:** Added strict `parseFloat(input)` validation in the USSD state machine (Cases 21 and 31). Invalid inputs loop the user back to the prompt without crashing. | FIXED ✅ |
| 2026-04-05 | Phase 6 | **UX Flaw:** If the API is slow, the Dashboard balance card jumps awkwardly when the data finally loads. | **Gemini Fix:** Implemented `AnimatePresence` with a pulsing skeleton loader in Framer Motion to reserve layout space and ease the transition. | FIXED ✅ |
| 2026-04-05 | Phase 8 | **Security:** Susceptibility to PIN brute-forcing during withdrawals. | **GPT Fix:** (Planned for Production) Add rate-limiting middleware (e.g., `express-rate-limit`) restricting failed PIN attempts to 5 per hour, triggering account lock. | MITIGATED 🟡 |
| 2026-04-05 | Build | **Extraction Issue:** `wigal.service.js` contained both SMS service and USSD controller, causing wrong exports and import conflicts. | Split into dedicated modules: `services/wigal.service.js` and `controllers/ussd.controller.js`; wired route `POST /api/ussd/callback`. | FIXED ✅ |
| 2026-04-05 | Build | **Backend Setup Gap:** Backend had no runnable app entrypoint, route registration, or scripts to verify quality gates. | Added `src/app.js`, `src/server.js`, route files, package scripts, eslint config, and dependency install. | FIXED ✅ |
