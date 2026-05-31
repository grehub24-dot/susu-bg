const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const supabase = require('../lib/supabase');

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
};

const getSmtpConfig = () => {
    const host = process.env.SMTP_HOST || process.env.MAILER_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || process.env.MAILER_PORT || 465);
    const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.MAILER_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAILER_PASSWORD;
    const secure = parseBool(process.env.SMTP_SECURE ?? process.env.MAILER_SECURE, port === 465);
    const fromAddress = process.env.SMTP_FROM || process.env.MAILER_FROM || user;
    return { host, port, secure, user, pass, fromAddress };
};

const getTransportCandidates = (smtpConfig) => {
    const configuredPort = Number(smtpConfig.port);
    const candidates = [
        { port: configuredPort, secure: smtpConfig.secure, label: 'configured' },
        { port: 465, secure: true, label: 'fallback-465' },
        { port: 587, secure: false, label: 'fallback-587' }
    ];

    const seen = new Set();
    return candidates.filter((candidate) => {
        const key = `${candidate.port}-${candidate.secure}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const sendMailWithFallback = async (mailOptions) => {
    const smtpConfig = getSmtpConfig();
    if (!smtpConfig.user || !smtpConfig.pass) {
        throw new Error('SMTP credentials missing. Set SMTP_USER and SMTP_PASS.');
    }

    const candidates = getTransportCandidates(smtpConfig);
    let lastError = null;

    for (const candidate of candidates) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: candidate.port,
                secure: candidate.secure,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass
                },
                requireTLS: candidate.port === 587,
                tls: {
                    minVersion: 'TLSv1.2'
                }
            });

            const info = await transporter.sendMail(mailOptions);
            console.log(`[EMAIL SUCCESS] Sent via ${candidate.label} (${candidate.port}/${candidate.secure ? 'ssl' : 'starttls'}). MessageId: ${info.messageId}`);
            return info;
        } catch (error) {
            lastError = error;
            console.error(`[EMAIL RETRY] ${candidate.label} failed:`, error.message);
        }
    }

    throw lastError || new Error('All SMTP transport attempts failed.');
};

const truncateText = (value, maxLength) => {
    const text = String(value ?? '');
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const formatBodyAsHtml = (body) => escapeHtml(body).replace(/\n/g, "<br/>");

const buildEmailTemplateHtml = ({ title, subtitle, bodyHtml, cta, badgeText }) => {
    const brand = "#a8d5ba";
    const text = "#2d3436";
    const muted = "#667085";
    const border = "#EAECF0";
    const bg = "#F9FAFB";
    const cardBg = "#FFFFFF";
    const badgeBg = "#ECFDF3";
    const badgeTextColor = "#027A48";

    const ctaHtml = cta?.url
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto 0;">
            <tr>
                <td align="center" bgcolor="${brand}" style="border-radius: 10px;">
                    <a href="${escapeHtml(cta.url)}" target="_blank" style="display:inline-block;padding:12px 18px;font-family:Arial, sans-serif;font-size:14px;color:${text};text-decoration:none;font-weight:700;">
                        ${escapeHtml(cta.label || "Open")}
                    </a>
                </td>
            </tr>
        </table>`
        : "";

    const badgeHtml = badgeText
        ? `<div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${badgeBg};color:${badgeTextColor};font-size:12px;font-weight:700;letter-spacing:0.2px;">
            ${escapeHtml(badgeText)}
        </div>`
        : "";

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>${escapeHtml(title || "Susu-BG")}</title>
</head>
<body style="margin:0;padding:0;background:${bg};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${bg};padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;">
          <tr>
            <td style="padding:0 0 14px 0;font-family:Arial, sans-serif;color:${text};">
              <div style="font-size:18px;font-weight:800;letter-spacing:0.2px;">Susu-BG</div>
            </td>
          </tr>
          <tr>
            <td style="background:${cardBg};border:1px solid ${border};border-radius:16px;padding:22px 20px;font-family:Arial, sans-serif;color:${text};">
              ${badgeHtml}
              <div style="margin-top:${badgeText ? "12px" : "0"};font-size:20px;font-weight:800;line-height:1.25;">${escapeHtml(title || "")}</div>
              ${subtitle ? `<div style="margin-top:8px;color:${muted};font-size:14px;line-height:1.5;">${escapeHtml(subtitle)}</div>` : ""}
              <div style="margin-top:18px;color:${text};font-size:14px;line-height:1.65;">
                ${bodyHtml || ""}
              </div>
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 6px 0 6px;font-family:Arial, sans-serif;color:${muted};font-size:12px;line-height:1.6;text-align:center;">
              This is an automated message from Susu-BG. If you did not request this, please contact support.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const sanitizeEmailBodyPreview = (body) => {
    const text = String(body ?? '');
    const masked = text.replace(
        /\b(OTP(?:\s+code)?(?:\s+is)?[:\s]+)([A-Z0-9]{6})\b/gi,
        '$1******'
    );
    return truncateText(masked, 5000);
};

const logEmailDelivery = async ({
    userId = null,
    toEmail,
    subject = null,
    bodyPreview = null,
    emailType = 'NOTIFICATION',
    status,
    messageId = null,
    errorMessage = null,
    metadata = null
}) => {
    if (!toEmail) return;
    try {
        const { error } = await supabase.from('email_logs').insert({
            user_id: userId,
            to_email: toEmail,
            subject,
            body_preview: bodyPreview,
            email_type: emailType,
            status,
            message_id: messageId,
            error_message: errorMessage ? truncateText(errorMessage, 2000) : null,
            metadata
        });
        if (error) {
            console.error("Email Log Insert Error:", error.message);
        }
    } catch (error) {
        console.error("Email Log Insert Error:", error instanceof Error ? error.message : String(error));
    }
};

class ReceiptService {
    static async generateAndStoreReceipt(transactionData, userData) {
        try {
            const pdfBuffer = await ReceiptService._generatePdfBuffer(transactionData, userData);

            const fileName = `receipts/${transactionData.reference}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('susu-documents')
                .upload(fileName, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

            const { data: publicUrlData } = supabase.storage
                .from('susu-documents')
                .getPublicUrl(fileName);
            
            const publicUrl = publicUrlData.publicUrl;

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

    static async sendReceiptEmail(email, publicUrl, pdfBuffer, reference) {
        try {
            const smtpConfig = getSmtpConfig();
            const html = buildEmailTemplateHtml({
                title: `Your Receipt (${reference})`,
                subtitle: "Your transaction receipt is attached, and you can also view it online.",
                badgeText: "Receipt",
                bodyHtml: `<div>You can open the receipt using the button below.</div>`,
                cta: { label: "View Receipt", url: publicUrl }
            });

            const mailOptions = {
                from: `"Susu-BG" <${smtpConfig.fromAddress}>`,
                to: email,
                subject: `Your Susu-BG Receipt - ${reference}`,
                text: `Hello, please find attached your transaction receipt. You can also view it here: ${publicUrl}`,
                html,
                attachments: [
                    {
                        filename: `Receipt-${reference}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const info = await sendMailWithFallback(mailOptions);

            await logEmailDelivery({
                toEmail: email,
                subject: mailOptions.subject,
                bodyPreview: truncateText(mailOptions.text, 5000),
                emailType: 'RECEIPT',
                status: 'SENT',
                messageId: info?.messageId || null,
                metadata: { reference, publicUrl }
            });

            await supabase.from('receipts')
                .update({ sent_via_email: true })
                .eq('receipt_url', publicUrl);

        } catch (error) {
            await logEmailDelivery({
                toEmail: email,
                subject: `Your Susu-BG Receipt - ${reference}`,
                bodyPreview: truncateText(`Hello, please find attached your transaction receipt. You can also view it here: ${publicUrl}`, 5000),
                emailType: 'RECEIPT',
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : String(error),
                metadata: { reference, publicUrl }
            });
            console.error("Email Sending Error:", error);
            throw error;
        }
    }

    static async sendNotificationEmail(email, subject, body, options = {}) {
        try {
            const smtpConfig = getSmtpConfig();
            const safeBodyHtml = formatBodyAsHtml(body);
            const title = String(options?.title || subject || "Susu-BG Notification");
            const subtitle = options?.subtitle ? String(options.subtitle) : "";
            const badgeText = options?.badgeText ? String(options.badgeText) : "";
            const cta = options?.cta && typeof options.cta === "object" ? options.cta : null;
            const html = buildEmailTemplateHtml({
                title,
                subtitle,
                badgeText,
                bodyHtml: `<div>${safeBodyHtml}</div>`,
                cta
            });

            const mailOptions = {
                from: `"Susu-BG" <${smtpConfig.fromAddress}>`,
                to: email,
                subject: subject,
                text: body,
                html
            };

            const info = await sendMailWithFallback(mailOptions);
            const safePreview = sanitizeEmailBodyPreview(body);
            await logEmailDelivery({
                userId: options?.userId || null,
                toEmail: email,
                subject,
                bodyPreview: safePreview,
                emailType: String(options?.emailType || 'NOTIFICATION'),
                status: 'SENT',
                messageId: info?.messageId || null,
                metadata: options?.metadata || null
            });
            return info;
        } catch (error) {
            const safePreview = sanitizeEmailBodyPreview(body);
            await logEmailDelivery({
                userId: options?.userId || null,
                toEmail: email,
                subject,
                bodyPreview: safePreview,
                emailType: String(options?.emailType || 'NOTIFICATION'),
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : String(error),
                metadata: options?.metadata || null
            });
            console.error("Notification Email Error:", error.message);
            throw error;
        }
    }
    /** Generate PDF receipt buffer using pdfkit (no puppeteer/chromium needed) */
    static _generatePdfBuffer(transactionData, userData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const buffers = [];

                doc.on('data', (chunk) => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                doc.on('error', reject);

                // Header
                doc.fontSize(22).font('Helvetica-Bold')
                    .fillColor('#2d3436')
                    .text('Susu-BG Transaction Receipt', { align: 'center' });
                doc.moveDown(0.5);

                // Decorative line
                doc.moveTo(50, doc.y)
                    .lineTo(545, doc.y)
                    .strokeColor('#a8d5ba')
                    .lineWidth(2)
                    .stroke();
                doc.moveDown(0.8);

                // Receipt details
                const details = [
                    { label: 'Full Name', value: String(userData.full_name || '') },
                    { label: 'Phone', value: String(userData.phone_number || '') },
                    { label: 'Reference', value: String(transactionData.reference || '') },
                    { label: 'Type', value: String(transactionData.type || '') },
                    { label: 'Amount', value: `GHS ${Number(transactionData.amount || 0).toFixed(2)}` },
                    { label: 'Date', value: transactionData.created_at
                        ? new Date(transactionData.created_at).toLocaleString('en-GB')
                        : '' },
                    { label: 'Status', value: 'SUCCESS' },
                ];

                const startX = 50;
                const labelX = 180;
                let y = doc.y;

                doc.fontSize(11).font('Helvetica');
                for (const item of details) {
                    doc.fillColor('#636e72').text(item.label, startX, y, { width: labelX - startX, align: 'left' });
                    doc.fillColor('#2d3436').font('Helvetica-Bold').text(item.value, labelX, y, { width: 320, align: 'left' });
                    doc.font('Helvetica');
                    y = doc.y + 8;
                }

                doc.y = y;
                doc.moveDown(0.5);

                // Closing line
                doc.moveTo(50, doc.y)
                    .lineTo(545, doc.y)
                    .strokeColor('#a8d5ba')
                    .lineWidth(2)
                    .stroke();
                doc.moveDown(0.8);

                doc.fontSize(10).fillColor('#b2bec3').font('Helvetica')
                    .text('Thank you for using Susu-BG.', { align: 'center' });

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }
}

module.exports = ReceiptService;
