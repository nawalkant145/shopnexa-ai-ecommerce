import nodeMailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../config/config.env") });

export const sendEmail = async ({ email, subject, message }) => {
  // 1. If RESEND_API_KEY is available, use HTTPS (Port 443) - never blocked on Render
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "ShopNexa Support <onboarding@resend.dev>",
          to: [email],
          subject,
          html: message,
        }),
      });
      if (response.ok) {
        console.log("Email sent successfully via Resend HTTPS API!");
        return;
      }
      const err = await response.json().catch(() => ({}));
      console.warn("Resend API warning:", err.message);
    } catch (apiErr) {
      console.warn("Resend API error:", apiErr.message);
    }
  }

  // 2. Fallback to Nodemailer SMTP with strict 4-second timeout to prevent Render freezes
  const user = process.env.SMTP_MAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error("SMTP credentials are not configured in environment variables.");
  }

  const transporter = nodeMailer.createTransport({
    service: process.env.SMTP_SERVICE || "gmail",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 4000, // 4 seconds max
    greetingTimeout: 4000,
    socketTimeout: 4000,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: `"ShopNexa Support" <${user}>`,
    to: email,
    subject,
    html: message,
  };

  await transporter.sendMail(mailOptions);
};