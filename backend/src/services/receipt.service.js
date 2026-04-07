const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const supabase = require('../lib/supabase');

const getSmtpConfig = () => {
    const host = process.env.SMTP_HOST || process.env.MAILER_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || process.env.MAILER_PORT || 465);
    const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.MAILER_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAILER_PASSWORD;
    const secure = String(process.env.SMTP_SECURE || process.env.MAILER_SECURE || (port === 465))
        .toLowerCase() === 'true';
    return { host, port, secure, user, pass };
};

class ReceiptService {
    static async generateAndStoreReceipt(transactionData, userData) {
        try {
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

            const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(htmlContent);
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
            await browser.close();

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
            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.secure,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass
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
