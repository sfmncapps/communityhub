import nodemailer from "nodemailer";
import twilio from "twilio";

const twilioClient = process.env.TWILIO_SID
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const formatPhone = (num) => {
  if (!num) return num;
  const cleaned = String(num).trim().replace(/\s+/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  return `+91${cleaned}`;
};

// Generic Email Dispatcher supporting Resend, SendGrid, and SMTP
export const sendEmailNotification = async ({ to, subject, htmlText, senderName = "CommunityHub" }) => {
  if (!to) return;

  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;

  // 1. Resend API Dispatch
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${senderName} <notifications@communityhub.org>`,
          to: [to],
          subject: subject,
          html: htmlText,
        }),
      });
      if (res.ok) {
        console.log(`✅ [Resend Email Sent] To: ${to} | Subject: ${subject}`);
        return;
      }
    } catch (err) {
      console.warn("Resend email dispatch error:", err.message);
    }
  }

  // 2. SendGrid API Dispatch
  if (sendgridKey) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sendgridKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: "notifications@communityhub.org", name: senderName },
          subject: subject,
          content: [{ type: "text/html", value: htmlText }],
        }),
      });
      if (res.ok || res.status === 202) {
        console.log(`✅ [SendGrid Email Sent] To: ${to} | Subject: ${subject}`);
        return;
      }
    } catch (err) {
      console.warn("SendGrid email dispatch error:", err.message);
    }
  }

  // 3. Nodemailer SMTP Fallback
  if (process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${senderName}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlText,
      });

      console.log(`✅ [SMTP Email Sent] To: ${to} | Subject: ${subject}`);
      return;
    } catch (err) {
      console.warn("SMTP email dispatch error:", err.message);
    }
  }

  console.log(`ℹ️ [Email Dispatch Simulated] To: ${to} | Subject: ${subject}`);
};

export const sendEmailOtp = async (to, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3>CommunityHub Update</h3>
      <p>${String(otp).replace(/\n/g, "<br/>")}</p>
    </div>
  `;
  await sendEmailNotification({ to, subject: "CommunityHub Notification", htmlText: html });
};

// Email Mirroring Trigger for In-App Messaging (RFP Deliverable)
export const sendNewMessageNotification = async (toEmail, senderName, messagePreview) => {
  if (!toEmail) return;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px;">
      <h2 style="color: #2563eb; margin-top: 0;">💬 New Message Received</h2>
      <p style="font-size: 15px;"><strong>${senderName}</strong> sent you a message on CommunityHub:</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px; font-style: italic; margin: 15px 0;">
        "${messagePreview}"
      </div>
      <p style="font-size: 13px; color: #64748b;">Log in to your CommunityHub Dashboard to reply to this conversation.</p>
    </div>
  `;

  await sendEmailNotification({
    to: toEmail,
    subject: `New message from ${senderName} on CommunityHub`,
    htmlText: html,
    senderName: "CommunityHub Messaging",
  });
};

export const sendSmsOtp = async (to, otp) => {
  if (!twilioClient) throw new Error("Twilio not configured");
  const phone = formatPhone(to);
  await twilioClient.messages.create({
    from: process.env.TWILIO_SMS_FROM,
    to: phone,
    body: `Your OTP is ${otp}. Valid for 10 minutes.`,
  });
};

export const sendWhatsAppOtp = async (to, otp) => {
  if (!twilioClient) throw new Error("Twilio not configured");
  const phone = formatPhone(to);

  if (process.env.TWILIO_WA_CONTENT_SID) {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WA_FROM,
      to: `whatsapp:${phone}`,
      contentSid: process.env.TWILIO_WA_CONTENT_SID,
      contentVariables: JSON.stringify({ 1: otp }),
    });
    return;
  }

  await twilioClient.messages.create({
    from: process.env.TWILIO_WA_FROM,
    to: `whatsapp:${phone}`,
    body: `Your OTP is ${otp}. Valid for 10 minutes.`,
  });
};