import Razorpay from "razorpay";
import database from "../database/db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Load .env explicitly (since this file runs independently)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../config/config.env") });
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Debug check (optional, remove later)
console.log("🧩 Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
console.log("🧩 Razorpay Key Secret:", process.env.RAZORPAY_KEY_SECRET ? "Loaded ✅" : "❌ Missing");

// ✅ Initialize Razorpay instance
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

export async function generatePaymentIntent(orderId, totalPrice) {
  try {
    const numericTotal = Number(totalPrice) || 0;

    // ✅ Free order (100% discount or 0 total) - no Razorpay order required
    if (numericTotal <= 0) {
      console.log("🎁 Free order detected (total = 0). Marking paid automatically:", orderId);
      await database.query(
        `INSERT INTO payments (order_id, payment_type, payment_status, payment_intent_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (order_id) DO UPDATE SET payment_status = 'Paid', payment_intent_id = EXCLUDED.payment_intent_id`,
        [orderId, "Online", "Paid", `free_${orderId}`]
      );

      await database.query(`UPDATE orders SET paid_at = NOW() WHERE id = $1`, [orderId]);

      // Reduce product stock for free orders immediately
      const { rows: items } = await database.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      for (const item of items) {
        await database.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }

      return {
        success: true,
        orderId: `free_${orderId}`,
        amount: 0,
        currency: "INR",
        isFree: true,
      };
    }

    // ✅ Razorpay requires minimum ₹1.00 (100 paise) for INR transactions
    const amountInPaise = Math.max(100, Math.round(numericTotal * 100));

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now().toString().slice(-8)}`, // ✅ short & valid
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    await database.query(
      `INSERT INTO payments (order_id, payment_type, payment_status, payment_intent_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (order_id) DO UPDATE SET payment_intent_id = EXCLUDED.payment_intent_id, payment_status = EXCLUDED.payment_status`,
      [orderId, "Online", "Pending", order.id]
    );

    console.log("✅ Razorpay Order Created:", order.id, "Amount (paise):", amountInPaise);

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  } catch (error) {
    console.error("💥 Razorpay Payment Error:", error);
    return { success: false, message: "Payment Failed." };
  }
}

