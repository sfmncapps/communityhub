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

export const sendEmailOtp = async (to, otp) => {
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
    from: process.env.SMTP_USER,
    to,
    subject: "CommunityHub Notification",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h3>CommunityHub Update</h3>
        <p>${String(otp).replace(/\n/g, "<br/>")}</p>
      </div>
    `,
  });

  console.log("✅ Email sent to:", to);
};

// Email Mirroring Trigger for In-App Messaging
export const sendNewMessageNotification = async (toEmail, senderName, messagePreview) => {
  if (!toEmail) return;

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
      from: `"CommunityHub Messaging" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `New message from ${senderName} on CommunityHub`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px;">
          <h2 style="color: #2563eb; margin-top: 0;">💬 New Message Received</h2>
          <p style="font-size: 15px;"><strong>${senderName}</strong> sent you a message:</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px; font-style: italic; margin: 15px 0;">
            "${messagePreview}"
          </div>
          <p style="font-size: 13px; color: #64748b;">Log in to your CommunityHub Dashboard to reply to this conversation.</p>
        </div>
      `,
    });
    console.log(`✅ Message email mirrored to ${toEmail}`);
  } catch (err) {
    console.error("⚠️ Failed to mirror message via email:", err.message);
  }
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