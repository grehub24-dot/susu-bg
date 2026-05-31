# 💻 Code Repository

*This file contains the full source code structure as implemented in subsequent phases.*

## 🟢 PHASE 2: DATABASE & CORE BACKEND (SQL Schema)

```sql
-- PostgreSQL Schema (Supabase)

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE, -- Supabase auth reference (optional depending on auth strategy)
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- Hashed PIN for transactions/login
    kyc_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- Admin approval state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups
CREATE INDEX idx_users_phone ON users(phone_number);

-- 2. Wallets Table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0), -- Prevent negative balance
    currency VARCHAR(3) DEFAULT 'GHS' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Transactions Table (Ledger-based)
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    reference VARCHAR(255) UNIQUE NOT NULL, -- Paystack or external reference
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'PENDING' NOT NULL,
    metadata JSONB, -- Store webhook payload or extra details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for querying transactions efficiently
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_status ON transactions(status);

-- 4. Receipts Table
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE UNIQUE,
    receipt_url TEXT NOT NULL, -- Supabase storage URL for the PDF
    sent_via_email BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Database Functions (Wallet Logic)

-- Securely credit a wallet
CREATE OR REPLACE FUNCTION credit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Update transaction status (Idempotency check: ensures we only credit if PENDING)
    UPDATE transactions 
    SET status = 'SUCCESS', updated_at = now() 
    WHERE reference = p_reference AND status = 'PENDING';

    -- Only update wallet if the transaction update affected a row (prevents double crediting)
    IF FOUND THEN
        UPDATE wallets 
        SET balance = balance + p_amount, updated_at = now()
        WHERE id = p_wallet_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Securely debit a wallet
CREATE OR REPLACE FUNCTION debit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Ensure sufficient balance
    IF (SELECT balance FROM wallets WHERE id = p_wallet_id) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update transaction status
    UPDATE transactions 
    SET status = 'SUCCESS', updated_at = now() 
    WHERE reference = p_reference AND status = 'PENDING';

    IF FOUND THEN
        UPDATE wallets 
        SET balance = balance - p_amount, updated_at = now()
        WHERE id = p_wallet_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Initialize a withdrawal (Lock funds)
CREATE OR REPLACE FUNCTION init_withdrawal(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Ensure sufficient balance
    IF (SELECT balance FROM wallets WHERE id = p_wallet_id) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Create pending transaction
    INSERT INTO transactions (wallet_id, reference, amount, type, status)
    VALUES (p_wallet_id, p_reference, p_amount, 'WITHDRAWAL', 'PENDING');

    -- Deduct balance immediately
    UPDATE wallets 
    SET balance = balance - p_amount, updated_at = now()
    WHERE id = p_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Refund wallet if withdrawal fails
CREATE OR REPLACE FUNCTION refund_wallet(
    p_reference VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_wallet_id UUID;
    v_amount DECIMAL;
BEGIN
    -- Find the pending transaction
    SELECT wallet_id, amount INTO v_wallet_id, v_amount
    FROM transactions 
    WHERE reference = p_reference AND status = 'PENDING';

    IF FOUND THEN
        -- Mark as failed
        UPDATE transactions 
        SET status = 'FAILED', updated_at = now() 
        WHERE reference = p_reference AND status = 'PENDING';

        -- Restore balance
        UPDATE wallets 
        SET balance = balance + v_amount, updated_at = now()
        WHERE id = v_wallet_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## 🟢 PHASE 3: PAYMENT SYSTEM (Service Layer)

```javascript
// backend/src/services/payment.service.js
const crypto = require('crypto');
const axios = require('axios');
const supabase = require('../lib/supabase'); // Admin client

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

class PaymentService {
    
    /**
     * Initializes a deposit via Paystack
     */
    static async initDeposit(walletId, amount, email, reference) {
        // 1. Create PENDING transaction in Supabase
        const { error } = await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference: reference,
            amount: amount,
            type: 'DEPOSIT',
            status: 'PENDING'
        });
        
        if (error) throw new Error(`DB Error: ${error.message}`);

        // 2. Call Paystack
        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
            email: email,
            amount: amount * 100, // Paystack uses pesewas/kobo
            reference: reference,
            callback_url: 'https://your-frontend.vercel.app/dashboard'
        }, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });

        return response.data.data.authorization_url;
    }

    /**
     * Initializes a withdrawal to Mobile Money/Bank
     */
    static async initWithdrawal(walletId, amount, recipientCode, reference) {
        // 1. Check Balance and Deduct Immediately (Locking Funds)
        // We do this via an RPC to ensure atomicity
        const { data, error: debitError } = await supabase.rpc('init_withdrawal', {
            p_wallet_id: walletId,
            p_amount: amount,
            p_reference: reference
        });

        if (debitError) throw new Error(`Insufficient funds or DB error: ${debitError.message}`);

        // 2. Call Paystack Transfer API
        try {
            const response = await axios.post(`${PAYSTACK_BASE_URL}/transfer`, {
                source: "balance",
                amount: amount * 100,
                recipient: recipientCode,
                reason: "Susu Withdrawal",
                reference: reference
            }, {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
            });
            return response.data.data;
        } catch (error) {
            // If API call fails immediately, refund the user
            await supabase.rpc('refund_wallet', { p_reference: reference });
            throw new Error(`Transfer failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Verifies Webhook Signature
     */
    static verifyWebhookSignature(req) {
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
                           .update(JSON.stringify(req.body))
                           .digest('hex');
        return hash === req.headers['x-paystack-signature'];
    }

    /**
     * Handles Paystack Webhooks (Idempotent)
     */
    static async handleWebhook(event) {
        const reference = event.data.reference;

        if (event.event === 'charge.success') {
            // Deposit Success -> Credit Wallet
            const amount = event.data.amount / 100;
            await supabase.rpc('credit_wallet', {
                p_wallet_id: event.data.metadata.wallet_id, // Passed during init
                p_amount: amount,
                p_reference: reference
            });
            return { status: 'handled' };
        } 
        
        else if (event.event === 'transfer.success') {
            // Withdrawal Success -> Mark transaction as SUCCESS
            await supabase.from('transactions')
                .update({ status: 'SUCCESS', updated_at: new Date() })
                .eq('reference', reference)
                .eq('status', 'PENDING');
            return { status: 'handled' };
        } 
        
        else if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
            // Withdrawal Failed -> Refund Wallet
            await supabase.rpc('refund_wallet', { p_reference: reference });
            return { status: 'handled' };
        }

        return { status: 'ignored' };
    }
}

module.exports = PaymentService;
```

## 🟢 PHASE 4: WIGAL INTEGRATION (SMS & USSD)

```javascript
// backend/src/services/wigal.service.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const WIGAL_API_KEY = process.env.WIGAL_API_KEY;
const WIGAL_USERNAME = process.env.WIGAL_USERNAME;
const WIGAL_SENDER_ID = process.env.WIGAL_SENDER_ID || 'SUSUBG';
const WIGAL_SMS_URL = 'https://frogapi.wigal.com.gh/api/v3/sms/send';

class WigalService {
    
    /**
     * Sends an SMS via Wigal FrogAPI
     */
    static async sendSMS(phoneNumber, message) {
        try {
            const msgId = uuidv4().substring(0, 10); // Generate unique msgid
            
            const postData = {
                senderid: WIGAL_SENDER_ID,
                destinations: [{
                    destination: phoneNumber,
                    msgid: msgId
                }],
                message: message,
                smstype: 'text'
            };

            const response = await axios.post(WIGAL_SMS_URL, postData, {
                headers: {
                    'Content-Type': 'application/json',
                    'API-KEY': WIGAL_API_KEY,
                    'USERNAME': WIGAL_USERNAME
                }
            });

            return response.data;
        } catch (error) {
            console.error('Wigal SMS Error:', error.response?.data || error.message);
            throw new Error('Failed to send SMS via Wigal');
        }
    }

    /**
     * Send Transaction Alert
     */
    static async sendTransactionAlert(phoneNumber, type, amount, newBalance) {
        const message = `Susu-BG Alert: ${type} of GHS ${amount} was successful. New balance is GHS ${newBalance}. Thank you for saving with us!`;
        return this.sendSMS(phoneNumber, message);
    }

    /**
     * Send OTP
     */
    static async sendOTP(phoneNumber, otp) {
        const message = `Your Susu-BG verification code is ${otp}. Do not share this code with anyone.`;
        return this.sendSMS(phoneNumber, message);
    }
}

module.exports = WigalService;


// backend/src/controllers/ussd.controller.js
// Wigal USSD Webhook Handler
const supabase = require('../lib/supabase'); // Admin client
const PaymentService = require('../services/payment.service');

// Simple in-memory session store for MVP (Use Redis for production)
const sessionStore = new Map();

class USSDController {
    static async handleUSSD(req, res) {
        // Typical USSD Payload from Wigal
        // { sessionid, msisdn, userdata, msgtype }
        // msgtype: "0" (start), "1" (continue)
        
        const { sessionid, msisdn, userdata, msgtype } = req.body;
        
        let responseText = '';
        let isEnd = false;
        
        // Format phone number to standard (assuming Ghana 02... format mapping to +233)
        const phoneNumber = msisdn; 

        // Get or Create Session
        let session = sessionStore.get(sessionid);
        if (!session || msgtype === "0") {
            session = { level: 0, phone: phoneNumber, data: {} };
            sessionStore.set(sessionid, session);
        }

        // Fetch User
        const { data: user } = await supabase.from('users').select('id, full_name').eq('phone_number', phoneNumber).single();

        if (!user) {
            res.send("END You are not registered on Susu-BG. Visit our website to register.");
            return;
        }

        const input = userdata ? userdata.trim() : "";

        // USSD State Machine
        try {
            switch (session.level) {
                case 0:
                    // Main Menu
                    responseText = `Welcome to Susu-BG, ${user.full_name.split(' ')[0]}\n1. Check Balance\n2. Deposit\n3. Withdraw`;
                    session.level = 1;
                    break;

                case 1:
                    if (input === '1') {
                        // Check Balance
                        const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
                        responseText = `Your Susu-BG balance is GHS ${wallet.balance}`;
                        isEnd = true;
                    } 
                    else if (input === '2') {
                        // Deposit
                        responseText = `Enter amount to deposit (GHS):`;
                        session.level = 21; // Deposit flow
                    }
                    else if (input === '3') {
                        // Withdraw
                        responseText = `Enter amount to withdraw (GHS):`;
                        session.level = 31; // Withdraw flow
                    }
                    else {
                        responseText = `Invalid option.\n1. Check Balance\n2. Deposit\n3. Withdraw`;
                    }
                    break;

                case 21: // Deposit - Get Amount
                    const depAmount = parseFloat(input);
                    if (isNaN(depAmount) || depAmount <= 0) {
                        responseText = `Invalid amount. Enter amount to deposit (GHS):`;
                    } else {
                        session.data.amount = depAmount;
                        // In a real flow, we'd trigger a mobile money prompt here via Paystack or Wigal
                        responseText = `Deposit of GHS ${depAmount} initiated. You will receive an prompt to enter your PIN shortly.`;
                        isEnd = true;
                        
                        // We could trigger PaymentService.initDeposit here and send a push to their phone.
                    }
                    break;

                case 31: // Withdraw - Get Amount
                    const withAmount = parseFloat(input);
                    if (isNaN(withAmount) || withAmount <= 0) {
                        responseText = `Invalid amount. Enter amount to withdraw (GHS):`;
                    } else {
                        session.data.amount = withAmount;
                        responseText = `Enter your Susu-BG PIN to withdraw GHS ${withAmount}:`;
                        session.level = 32;
                    }
                    break;

                case 32: // Withdraw - Verify PIN & Execute
                    const pin = input;
                    // Note: In production, verify the PIN against hashed DB PIN
                    // const isValid = await bcrypt.compare(pin, user.pin_hash);
                    
                    const { data: walletData } = await supabase.from('wallets').select('id').eq('user_id', user.id).single();
                    
                    try {
                        // Initiate Withdrawal
                        const ref = `WDL-${Date.now()}`;
                        await PaymentService.initWithdrawal(walletData.id, session.data.amount, phoneNumber, ref);
                        responseText = `Withdrawal of GHS ${session.data.amount} is being processed. You will receive an SMS shortly.`;
                    } catch (err) {
                        responseText = `Withdrawal failed: ${err.message}`;
                    }
                    isEnd = true;
                    break;

                default:
                    responseText = "Invalid session state.";
                    isEnd = true;
                    break;
            }
        } catch (error) {
            console.error("USSD Error:", error);
            responseText = "An error occurred. Please try again later.";
            isEnd = true;
        }

        // Cleanup session if end
        if (isEnd) {
            sessionStore.delete(sessionid);
        } else {
            sessionStore.set(sessionid, session);
        }

        // Format Wigal USSD Response (CON for continue, END for terminate)
        const formattedResponse = `${isEnd ? 'END' : 'CON'} ${responseText}`;
        
        // Wigal expects plain text response
        res.set('Content-Type', 'text/plain');
        res.send(formattedResponse);
    }
}

module.exports = USSDController;
```

## 🟢 PHASE 5: RECEIPT SYSTEM (Service Layer)

```javascript
// backend/src/services/receipt.service.js
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const supabase = require('../lib/supabase'); // Admin client
const fs = require('fs');
const path = require('path');

class ReceiptService {
    
    /**
     * Generates a PDF receipt and uploads to Supabase
     */
    static async generateAndStoreReceipt(transactionData, userData) {
        try {
            // 1. Generate HTML
            const htmlContent = `
                <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
                    <div style="border: 1px solid #eee; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto;">
                        <h2 style="color: #4CAF50; text-align: center;">Susu-BG Transaction Receipt</h2>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p><strong>Name:</strong> ${userData.full_name}</p>
                        <p><strong>Phone:</strong> ${userData.phone_number}</p>
                        <p><strong>Transaction Ref:</strong> ${transactionData.reference}</p>
                        <p><strong>Type:</strong> ${transactionData.type}</p>
                        <p><strong>Amount:</strong> GHS ${transactionData.amount}</p>
                        <p><strong>Date:</strong> ${new Date(transactionData.created_at).toLocaleString()}</p>
                        <p><strong>Status:</strong> <span style="color: green;">SUCCESS</span></p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="text-align: center; font-size: 12px; color: #777;">Thank you for using Susu-BG.</p>
                    </div>
                </body>
                </html>
            `;

            // 2. Convert to PDF using Puppeteer
            const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(htmlContent);
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
            await browser.close();

            // 3. Upload to Supabase Storage
            const fileName = `receipts/${transactionData.reference}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('susu-documents')
                .upload(fileName, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

            // 4. Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('susu-documents')
                .getPublicUrl(fileName);
            
            const publicUrl = publicUrlData.publicUrl;

            // 5. Store in Database
            const { error: dbError } = await supabase.from('receipts').insert({
                transaction_id: transactionData.id,
                receipt_url: publicUrl,
                sent_via_email: false
            });

            if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

            return { publicUrl, pdfBuffer };
            
        } catch (error) {
            console.error("Receipt Generation Error:", error);
            throw error;
        }
    }

    /**
     * Sends Receipt via Email
     */
    static async sendReceiptEmail(email, publicUrl, pdfBuffer, reference) {
        try {
            // Using standard Nodemailer (could use Resend/SendGrid in production)
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const mailOptions = {
                from: '"Susu-BG" <no-reply@susubg.com>',
                to: email,
                subject: `Your Susu-BG Receipt - ${reference}`,
                text: `Hello, please find attached your transaction receipt. You can also view it here: ${publicUrl}`,
                attachments: [
                    {
                        filename: `Receipt-${reference}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            await transporter.sendMail(mailOptions);

            // Update receipt sent status
            await supabase.from('receipts')
                .update({ sent_via_email: true })
                .eq('receipt_url', publicUrl);

        } catch (error) {
            console.error("Email Sending Error:", error);
            throw error;
        }
    }
}

module.exports = ReceiptService;
```

## 🟢 PHASE 6: FRONTEND (Next.js / Tailwind / Framer Motion)

```tsx
// frontend/src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
    const [balance, setBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // GPT Support: Fetch Data from API
        const fetchDashboardData = async () => {
            try {
                // In reality, this would be authenticated API calls
                // const res = await fetch('/api/wallet/balance', { headers: { 'Authorization': `Bearer ${token}` }});
                // const data = await res.json();
                
                // Mocking API delay for loading state
                setTimeout(() => {
                    setBalance(2450.50);
                    setTransactions([
                        { id: 1, type: 'DEPOSIT', amount: 500, date: '2023-10-25', status: 'SUCCESS' },
                        { id: 2, type: 'WITHDRAWAL', amount: 200, date: '2023-10-24', status: 'SUCCESS' },
                        { id: 3, type: 'DEPOSIT', amount: 150, date: '2023-10-20', status: 'SUCCESS' }
                    ]);
                    setIsLoading(false);
                }, 1500);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };

        fetchDashboardData();
    }, []);

    // Framer Motion Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1, 
            transition: { staggerChildren: 0.1 } 
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className="min-h-screen bg-[#FFF5F5] p-4 md:p-8 text-[#2D3436]">
            <motion.div 
                className="max-w-4xl mx-auto space-y-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <motion.header variants={itemVariants} className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold font-serif">Welcome back, Kwesi</h1>
                        <p className="text-gray-500 text-sm">Your financial overview</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#E8B4B8] flex items-center justify-center text-white font-bold">
                        K
                    </div>
                </motion.header>

                {/* Balance Card (Hero-Centric) */}
                <motion.section variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8B4B8] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                    <p className="text-gray-500 font-medium mb-2 flex items-center gap-2">
                        <CreditCard size={18} className="text-[#D4AF37]" />
                        Total Balance
                    </p>
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-12 w-48 bg-gray-200 rounded animate-pulse"
                            />
                        ) : (
                            <motion.h2 
                                key="balance"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-5xl font-bold tracking-tight text-[#2D3436]"
                            >
                                GHS {balance?.toFixed(2)}
                            </motion.h2>
                        )}
                    </AnimatePresence>
                </motion.section>

                {/* Quick Actions */}
                <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
                    <Link href="/deposit">
                        <motion.button 
                            whileHover={{ scale: 1.02, backgroundColor: '#A8D5BA' }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-white text-[#2D3436] py-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 transition-colors border border-transparent hover:border-[#A8D5BA]"
                        >
                            <div className="w-10 h-10 rounded-full bg-[#E8F5EE] text-[#4CAF50] flex items-center justify-center">
                                <ArrowDownRight size={20} />
                            </div>
                            <span className="font-medium">Deposit</span>
                        </motion.button>
                    </Link>
                    <Link href="/withdraw">
                        <motion.button 
                            whileHover={{ scale: 1.02, backgroundColor: '#E8B4B8', color: 'white' }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-[#2D3436] text-white py-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                <ArrowUpRight size={20} />
                            </div>
                            <span className="font-medium">Withdraw</span>
                        </motion.button>
                    </Link>
                </motion.section>

                {/* Recent Transactions */}
                <motion.section variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Activity size={18} className="text-[#A8D5BA]" />
                            Recent Activity
                        </h3>
                        <Link href="/transactions" className="text-sm text-[#D4AF37] font-medium hover:underline">
                            View All
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between items-center p-3 animate-pulse">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                        <div>
                                            <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                                            <div className="w-16 h-3 bg-gray-200 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="w-16 h-5 bg-gray-200 rounded"></div>
                                </div>
                            ))
                        ) : (
                            transactions.map((tx) => (
                                <motion.div 
                                    key={tx.id} 
                                    whileHover={{ x: 4 }}
                                    className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                                >
                                    <div className="flex gap-3 items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-[#E8F5EE] text-[#4CAF50]' : 'bg-[#FFF0F0] text-[#E53935]'}`}>
                                            {tx.type === 'DEPOSIT' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#2D3436]">{tx.type === 'DEPOSIT' ? 'Wallet Top-up' : 'Withdrawal'}</p>
                                            <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-[#4CAF50]' : 'text-[#E53935]'}`}>
                                            {tx.type === 'DEPOSIT' ? '+' : '-'}GHS {tx.amount.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block mt-1">{tx.status}</p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.section>
            </motion.div>
        </div>
    );
}
```

## 🟢 PHASE 7: ADMIN PANEL (Service Layer)

```javascript
// backend/src/controllers/admin.controller.js
const supabase = require('../lib/supabase'); // Admin Client

class AdminController {
    
    /**
     * Get All Users with their Wallet Balances
     */
    static async getUsers(req, res) {
        try {
            // Join users with their wallets
            const { data, error } = await supabase
                .from('users')
                .select(`
                    id, full_name, phone_number, created_at, kyc_status,
                    wallets ( balance, currency )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * View Global Transaction Logs
     */
    static async getTransactions(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id, reference, amount, type, status, created_at,
                    wallets (
                        users ( full_name, phone_number )
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Manual KYC Approval (Admin Action)
     */
    static async approveKYC(req, res) {
        try {
            const { userId } = req.params;
            
            // Validate user exists
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('id, phone_number')
                .eq('id', userId)
                .single();
                
            if (fetchError || !user) throw new Error("User not found");

            // Update KYC Status
            const { error: updateError } = await supabase
                .from('users')
                .update({ kyc_status: 'APPROVED', updated_at: new Date() })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Trigger SMS Notification via Wigal
            const WigalService = require('../services/wigal.service');
            await WigalService.sendSMS(
                user.phone_number, 
                "Susu-BG Alert: Your KYC verification has been approved. You now have full access to all features!"
            );

            res.json({ success: true, message: "KYC Approved Successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = AdminController;
```

Act as a senior frontend developer. Build UI for the admin panel
Build a complete mobile-first 3D UI for: [FEATURE]

Stack:

React / Next.js

Tailwind CSS

Framer Motion

Include:

Layout

Components

Animations

API integration

Loading + error states

Design Style:

Modern 3D

Glassmorphism

Soft shadows

Smooth motion

Constraints:

Production-ready

Mobile-first

Fast performance

Output:

File structure

Full code

let it be enterprise level feel in the UI/UX design . let is have a side bar and theme toggle

reference" https://dribbble.com/shots/20346157-Tagih-Simple-Neat-Banking-Admin-Dashboard "," https://dribbble.com/shots/23649078-BankDash-Admin-Dashboard ",

Done

- Built the admin section around a proper banking model: bank revenue and all client balances .
- Removed more of the generic dashboard/template feel and replaced it with bank-facing finance views.
- Added backend support that is safe even before the new revenue table is created in Supabase.
Best Model

- Client balances = sum of every customer wallet balance in wallets.balance
- Bank revenue = separate ledger entries for fees, loan interest, investment returns, commissions, penalties, and maintenance income
- Admin dashboard should show both, but never mix them into one fake “balance” number
Built

- Added revenue_ledger schema to schema.sql
- Extended admin financial aggregation in admin.controller.js
- Exposed the summary endpoint in admin.routes.js
- Reworked the admin UI in page.tsx
Admin UI Now Shows

- Revenue Overview
- Revenue This Month
- Transaction Fees
- Loan Interest
- Investment Return
- Revenue Mix
- Recent Revenue
- All Client Balances
- Average Client Balance
- Deposits / Withdrawals / Net Flow
- 7-day client balance trend
Important Behavior

- If revenue_ledger is not yet created in Supabase, the backend does not break
- It falls back to transaction-fee revenue derived from transaction metadata where available
- Loan interest, investment return, commissions, and other revenue categories will stay 0 until real ledger rows are being inserted
Checks

- Backend lint: passed
- Frontend type check: passed
- Frontend lint: no errors in this work; only pre-existing warnings in other files
What You Need To Do Next

- Apply the new SQL changes from schema.sql to your Supabase database
- Start writing real rows into revenue_ledger whenever the bank earns:
  - transaction fees
  - loan interest
  - investment returns
  - commissions
  - penalties
  - maintenance/account charges
Next Best Build

- Wire automatic inserts into revenue_ledger from the payment flow and future loan/investment modules, so the admin dashboard becomes fully live with real revenue sources end-to-end.
If you want, I can continue immediately with that next step and wire automatic revenue ledger posting for transaction fees first.

based on the explaination ,i want you to set the admin to view the individual users and groups transactions,KYC for both, Messaging, Audit revenue ,system health and settings.