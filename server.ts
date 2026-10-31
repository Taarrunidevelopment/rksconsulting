import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'prasannahegde3377@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    adminEmail: ADMIN_EMAIL,
    isPasswordConfigured: Boolean(GMAIL_APP_PASSWORD),
    timestamp: new Date().toISOString()
  });
});

// Contact / Booking form endpoint
app.post('/api/contact', async (req: Request, res: Response): Promise<any> => {
  const { name, organization, email, topic, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Please provide full name, email, and message.'
    });
  }

  // Validate Gmail App Password configuration
  if (!GMAIL_APP_PASSWORD) {
    console.warn('[Nodemailer Server] GMAIL_APP_PASSWORD is not set in .env.');
    return res.status(503).json({
      success: false,
      isConfigMissing: true,
      message: 'GMAIL_APP_PASSWORD is not configured in .env. Please create a 16-character Google App Password in your Google Account security settings.'
    });
  }

  try {
    // Create Nodemailer Transporter using Gmail service
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ADMIN_EMAIL,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const formattedMessage = (message || '').replace(/\n/g, '<br/>');
    const submissionTime = new Date().toLocaleString();

    // 1. Email to Admin (prasannahegde3377@gmail.com)
    const adminMailOptions = {
      from: `"RKS Advisory Desk" <${ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      replyTo: email, // Clicking "Reply" in your inbox replies directly to the client
      subject: `[Advisory Inquiry] ${topic || 'Consultation'} — ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0d11; color: #f2f4f8; border-radius: 12px; border: 1px solid #242933; padding: 32px;">
          <div style="border-bottom: 1px solid #242933; padding-bottom: 20px; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c9a46c;">RKS CONSULTING · EXECUTIVE INQUIRY</span>
            <h2 style="font-size: 22px; margin: 8px 0 0; color: #fafaf8; font-weight: 700;">New Consultation Request</h2>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #66717d; width: 140px; font-family: monospace;">Full Name:</td>
              <td style="padding: 8px 0; color: #fafaf8; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #66717d; font-family: monospace;">Organization:</td>
              <td style="padding: 8px 0; color: #fafaf8;">${organization || 'Not Specified'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #66717d; font-family: monospace;">Client Email:</td>
              <td style="padding: 8px 0; color: #38bdf8;"><a href="mailto:${email}" style="color: #38bdf8; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #66717d; font-family: monospace;">Discussion Topic:</td>
              <td style="padding: 8px 0; color: #c9a46c; font-weight: 600;">${topic || 'Executive Dialogue'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #66717d; font-family: monospace;">Submitted At:</td>
              <td style="padding: 8px 0; color: #969ba3; font-size: 12px;">${submissionTime}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding: 20px; background-color: #141820; border-radius: 8px; border-left: 3px solid #c9a46c;">
            <div style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #c9a46c; margin-bottom: 8px;">Executive Message / Scope:</div>
            <div style="color: #fafaf8; font-size: 14px; line-height: 1.6;">${formattedMessage}</div>
          </div>

          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #242933; font-size: 12px; color: #66717d; text-align: center;">
            Direct reply will be sent to <strong>${email}</strong>.
          </div>
        </div>
      `
    };

    await transporter.sendMail(adminMailOptions);

    // 2. Automated Confirmation Email to the Client / User
    try {
      const clientMailOptions = {
        from: `"Prasanna Hegde | RKS Consulting" <${ADMIN_EMAIL}>`,
        to: email,
        subject: `Dialogue Initiated: Consultation Inquiry Received — RKS Consulting`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0d11; color: #f2f4f8; border-radius: 12px; border: 1px solid #242933; padding: 32px;">
            <div style="border-bottom: 1px solid #242933; padding-bottom: 20px; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c9a46c;">RKS CONSULTING · EXECUTIVE ADVISORY</span>
              <h2 style="font-size: 22px; margin: 8px 0 0; color: #fafaf8; font-weight: 700;">Dialogue Initiated</h2>
            </div>

            <p style="font-size: 15px; color: #fafaf8; line-height: 1.6;">
              Dear ${name},
            </p>

            <p style="font-size: 14px; color: #969ba3; line-height: 1.6;">
              Thank you for requesting a conversation regarding <strong>${topic || 'Advisory Engagement'}</strong>.
              Your message has been delivered directly to our executive advisory desk (<span style="color: #fafaf8; font-family: monospace;">${ADMIN_EMAIL}</span>).
            </p>

            <div style="margin: 20px 0; padding: 16px 20px; background-color: #141820; border-radius: 8px; border: 1px solid #242933;">
              <div style="font-family: monospace; font-size: 11px; color: #66717d; text-transform: uppercase; margin-bottom: 6px;">Inquiry Scope Recorded:</div>
              <div style="font-size: 13px; color: #c9a46c; font-weight: 500;">${topic || 'Executive Dialogue'}</div>
            </div>

            <p style="font-size: 14px; color: #969ba3; line-height: 1.6;">
              Our team will review your scope and follow up with you at <strong style="color: #fafaf8;">${email}</strong> shortly.
            </p>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #242933; font-size: 12px; color: #66717d; line-height: 1.5;">
              <strong style="color: #fafaf8;">Prasanna Hegde</strong><br/>
              Technology Strategy & Semiconductor Advisory<br/>
              <a href="mailto:${ADMIN_EMAIL}" style="color: #c9a46c; text-decoration: none;">${ADMIN_EMAIL}</a>
            </div>
          </div>
        `
      };

      await transporter.sendMail(clientMailOptions);
    } catch (clientMailErr) {
      // Non-fatal: logged if client email bounced or failed
      console.warn('[Nodemailer Server] Client confirmation email warning:', clientMailErr);
    }

    return res.json({
      success: true,
      provider: 'nodemailer',
      message: 'Inquiry delivered successfully to admin and confirmation sent to client.'
    });
  } catch (error: any) {
    console.error('[Nodemailer Server] Transporter error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to send email via Nodemailer.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Backend Server] Nodemailer API listening on http://localhost:${PORT}`);
  console.log(`[Backend Server] Admin recipient: ${ADMIN_EMAIL}`);
});
