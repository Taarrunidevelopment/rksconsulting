import emailjs from '@emailjs/browser';

export interface BookingFormData {
  name: string;
  organization: string;
  email: string;
  topic: string;
  message: string;
}

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'rksc.co.in@gmail.com';

export interface SendEmailResult {
  success: boolean;
  message?: string;
  provider?: 'nodemailer' | 'emailjs';
  isConfigurationMissing?: boolean;
}

/**
 * Sends email inquiry via EmailJS client SDK (kept completely intact)
 */
async function sendViaEmailJS(data: BookingFormData): Promise<SendEmailResult> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const autoReplyTemplateId = import.meta.env.VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID;

  if (!serviceId || !templateId || !publicKey) {
    return {
      success: false,
      provider: 'emailjs',
      isConfigurationMissing: true,
      message: 'EmailJS credentials are missing in .env.'
    };
  }

  try {
    const templateParams = {
      to_email: ADMIN_EMAIL,
      admin_email: ADMIN_EMAIL,
      to_name: 'Sharat Kaul',
      reply_to: data.email,

      name: data.name,
      from_name: data.name,
      user_name: data.name,
      email: data.email,
      from_email: data.email,
      user_email: data.email,
      organization: data.organization || 'Not Specified',
      topic: data.topic,
      subject: `[Advisory Inquiry] ${data.topic} from ${data.name}`,
      message: data.message,
      submitted_at: new Date().toLocaleString()
    };

    const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);

    if (response.status === 200) {
      if (autoReplyTemplateId) {
        try {
          await emailjs.send(
            serviceId,
            autoReplyTemplateId,
            { ...templateParams, to_email: data.email },
            publicKey
          );
        } catch (autoErr) {
          console.warn('[EmailJS] Auto-reply warning:', autoErr);
        }
      }
      return { success: true, provider: 'emailjs' };
    }

    return {
      success: false,
      provider: 'emailjs',
      message: `EmailJS status: ${response.status} (${response.text})`
    };
  } catch (err: any) {
    return {
      success: false,
      provider: 'emailjs',
      message: err?.text || err?.message || 'EmailJS sending failed.'
    };
  }
}

/**
 * Hybrid Email Sender:
 * 1. Attempts delivery via Node.js Express Backend (/api/contact) using Nodemailer.
 * 2. If the backend is offline or unconfigured, seamlessly falls back to EmailJS.
 */
export async function sendBookingEmail(data: BookingFormData): Promise<SendEmailResult> {
  // 1. Try Nodemailer backend first
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await res.json().catch(() => null);

    if (res.ok && result?.success) {
      return {
        success: true,
        provider: 'nodemailer',
        message: result.message || 'Delivered via Nodemailer backend.'
      };
    }

    // If backend returned a specific error (e.g. missing password), log it
    if (result && !result.success) {
      console.warn('[Email Service] Backend Nodemailer reported:', result.message);
      // Fallback to EmailJS if configured
      const emailJsResult = await sendViaEmailJS(data);
      if (emailJsResult.success) {
        return emailJsResult;
      }
      return {
        success: false,
        message: result.message || 'Unable to deliver message. Please try again or use direct email.'
      };
    }
  } catch (backendFetchErr) {
    // Backend server is not running or unreachable, fallback silently to EmailJS
    console.info('[Email Service] Backend server unreachable, falling back to EmailJS.');
  }

  // 2. Fallback to EmailJS (kept intact)
  return await sendViaEmailJS(data);
}
