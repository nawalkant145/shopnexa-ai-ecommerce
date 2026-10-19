import nodeMailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../config/config.env") });

export const sendEmail = async ({ email, subject, message }) => {
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