import ErrorHandler from "../middlewares/errorMiddlewares.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import { generatePaymentIntent } from "../utils/generatePaymentIntent.js";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const placeNewOrder = catchAsyncErrors(async (req, res, next) => {
    console.log("🧾 Incoming order data:", req.body);
  const {
    full_name,
    state,
    city,
    country,
    address,
    pincode,
    phone,
    orderedItems,
  } = req.body;
  if (
    !full_name ||
    !state ||
    !city ||
    !country ||
    !address ||
    !pincode ||
    !phone
  ) {
    return next(
      new ErrorHandler("Please provide complete shipping details.", 400)
    );
  }

  const items = Array.isArray(orderedItems)
    ? orderedItems
    : JSON.parse(orderedItems);

  if (!items || items.length === 0) {
    return next(new ErrorHandler("No items in cart.", 400));
  }
  const productIds = items.map((item) => item.product.id);
  const { rows: products } = await database.query(
    `SELECT id, price, stock, name, discount_city, discount_percent FROM products WHERE id = ANY($1::uuid[])`,
    [productIds]
  );

  const customerCity =
    typeof city === "string" && city.trim().length > 0
      ? city.trim().toLowerCase()
      : null;

  let raw_subtotal = 0;
  let total_discount = 0;
  let discounted_subtotal = 0;
  const appliedDiscounts = [];

  const values = [];
  const placeholders = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const product = products.find((p) => p.id === item.product.id);

    if (!product) {
      return next(
        new ErrorHandler(`Product not found for ID: ${item.product.id}`, 404)
      );
    }

    if (item.quantity > product.stock) {
      return next(
        new ErrorHandler(
          `Only ${product.stock} units available for ${product.name}`,
          400
        )
      );
    }

    const unitPrice = Number(product.price) || 0;
    const ruleCity = product.discount_city ? product.discount_city.trim().toLowerCase() : null;
    const ruleDiscountPercent = Number(product.discount_percent) || 0;

    // Location discount rule applies only if customer shipping city matches product discount_city
    const isDiscountApplicable =
      customerCity &&
      ruleCity &&
      customerCity === ruleCity &&
      ruleDiscountPercent > 0;

    let finalUnitPrice = unitPrice;
    let itemDiscountAmount = 0;

    if (isDiscountApplicable) {
      const unitDiscount = parseFloat(((unitPrice * ruleDiscountPercent) / 100).toFixed(2));
      finalUnitPrice = Math.max(0, parseFloat((unitPrice - unitDiscount).toFixed(2)));
      itemDiscountAmount = parseFloat((unitDiscount * item.quantity).toFixed(2));

      appliedDiscounts.push({
        product_id: product.id,
        product_name: product.name,
        target_city: product.discount_city.trim(),
        matched_city: city.trim(),
        discount_percent: ruleDiscountPercent,
        unit_discount: unitDiscount,
        original_price: unitPrice,
        discounted_price: finalUnitPrice,
        quantity: item.quantity,
        total_discount: itemDiscountAmount,
        explanation: `${ruleDiscountPercent}% location discount applied for shipping to ${product.discount_city.trim()} (Saved $${itemDiscountAmount.toFixed(2)})`,
      });
    }

    raw_subtotal += unitPrice * item.quantity;
    total_discount += itemDiscountAmount;
    discounted_subtotal += finalUnitPrice * item.quantity;

    values.push(
      null,
      product.id,
      item.quantity,
      finalUnitPrice,
      itemDiscountAmount,
      item.product.images?.[0]?.url || "",
      product.name
    );

    const offset = index * 7;

    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
        offset + 5
      }, $${offset + 6}, $${offset + 7})`
    );
  }

  const tax_rate = 0.18;
  const shipping_price = discounted_subtotal >= 50 || discounted_subtotal === 0 ? 0 : 2;
  const tax_price = parseFloat((discounted_subtotal * tax_rate).toFixed(2));
  const total_price = Math.round(
    discounted_subtotal + tax_price + shipping_price
  );

  const orderResult = await database.query(
    `INSERT INTO orders (buyer_id, total_price, tax_price, shipping_price, discount_amount, discount_details) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      req.user.id,
      total_price,
      tax_price,
      shipping_price,
      total_discount,
      JSON.stringify(appliedDiscounts),
    ]
  );

  const orderId = orderResult.rows[0].id;

  for (let i = 0; i < values.length; i += 7) {
    values[i] = orderId;
  }

  await database.query(
    `
    INSERT INTO order_items (order_id, product_id, quantity, price, discount_amount, image, title)
    VALUES ${placeholders.join(", ")} RETURNING *
    `,
    values
  );

  await database.query(
    `
    INSERT INTO shipping_info (order_id, full_name, state, city, country, address, pincode, phone)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `,
    [orderId, full_name, state, city, country, address, pincode, phone]
  );

  const paymentResponse = await generatePaymentIntent(orderId, total_price);

  if (!paymentResponse.success) {
    return next(new ErrorHandler("Payment failed. Try again.", 500));
  }

  res.status(200).json({
    success: true,
    message: "Order placed successfully. Please proceed to payment.",
    order_id: orderId,
    total_price,
    discount_amount: total_discount,
    discount_details: appliedDiscounts,
  });


});

export const fetchSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const result = await database.query(
    `
    SELECT 
 o.*, 
 COALESCE(
 json_agg(
json_build_object(
'order_item_id', oi.id,
'order_id', oi.order_id,
'product_id', oi.product_id,
'quantity', oi.quantity,
'price', oi.price,
'discount_amount', oi.discount_amount,
'image', oi.image,
'title', oi.title
 )
 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
 ) AS order_items,
 json_build_object(
 'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pincode,
 'phone', s.phone
 ) AS shipping_info
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.id = $1
GROUP BY o.id, s.id;
`,
    [orderId]
  );

  res.status(200).json({
    success: true,
    message: "Order fetched.",
    orders: result.rows[0],
  });
});


export const fetchMyOrders = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(
    `
        SELECT o.*, COALESCE(
 json_agg(
  json_build_object(
 'order_item_id', oi.id,
 'order_id', oi.order_id,
 'product_id', oi.product_id,
 'quantity', oi.quantity,
 'price', oi.price,
 'discount_amount', oi.discount_amount,
 'image', oi.image,
 'title', oi.title
  ) 
 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
 ) AS order_items,
json_build_object(
 'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pincode,
 'phone', s.phone
 ) AS shipping_info 
 FROM orders o
 LEFT JOIN order_items oi ON o.id = oi.order_id
 LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.buyer_id = $1 AND o.paid_at IS NOT NULL
GROUP BY o.id, s.id
        `,
    [req.user.id]
  );

  res.status(200).json({
    success: true,
    message: "All your orders are fetched.",
    myOrders: result.rows,
  });
});

export const fetchAllOrders = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`
            SELECT o.*,
 COALESCE(json_agg(
 json_build_object(
 'order_item_id', oi.id,
 'order_id', oi.order_id,
 'product_id', oi.product_id,
 'quantity', oi.quantity,
 'price', oi.price,
 'discount_amount', oi.discount_amount,
 'image', oi.image,
 'title', oi.title
)
) FILTER (WHERE oi.id IS NOT NULL), '[]' ) AS order_items, json_build_object(
'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pincode,
 'phone', s.phone 
) AS shipping_info
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id

LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.paid_at IS NOT NULL
GROUP BY o.id, s.id
        `);

  res.status(200).json({
    success: true,
    message: "All orders fetched.",
    orders: result.rows,
  });
});

export const updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.body;
  if (!status) {
    return next(new ErrorHandler("Provide a valid status for order.", 400));
  }
  const { orderId } = req.params;
  const results = await database.query(
    `
    SELECT * FROM orders WHERE id = $1
    `,
    [orderId]
  );

  if (results.rows.length === 0) {
    return next(new ErrorHandler("Invalid order ID.", 404));
  }

  const updatedOrder = await database.query(
    `
    UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING *
    `,
    [status, orderId]
  );

  res.status(200).json({
    success: true,
    message: "Order status updated.",
    updatedOrder: updatedOrder.rows[0],
  });
});

export const deleteOrder = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const results = await database.query(
    `
        DELETE FROM orders WHERE id = $1 RETURNING *
        `,
    [orderId]
  );
  if (results.rows.length === 0) {
    return next(new ErrorHandler("Invalid order ID.", 404));
  }

  res.status(200).json({
    success: true,
    message: "Order deleted.",
    order: results.rows[0],
  });
});

export const cancelOrder = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;

  const results = await database.query(
    `SELECT * FROM orders WHERE id = $1 AND buyer_id = $2`,
    [orderId, req.user.id]
  );

  if (results.rows.length === 0) {
    return next(new ErrorHandler("Order not found or unauthorized.", 404));
  }

  const order = results.rows[0];

  if (order.order_status !== "Processing") {
    return next(
      new ErrorHandler(`Cannot cancel an order that is already ${order.order_status}.`, 400)
    );
  }

  const updatedOrder = await database.query(
    `UPDATE orders SET order_status = 'Cancelled' WHERE id = $1 RETURNING *`,
    [orderId]
  );

  // ✅ Check if payment was made for this order and initiate Razorpay refund
  let isRefundInitiated = false;
  try {
    const paymentResult = await database.query(
      `SELECT * FROM payments WHERE order_id = $1`,
      [orderId]
    );

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];
      if (payment.payment_status === "Paid" && payment.payment_intent_id) {
        // Fetch captured payments associated with this Razorpay order ID
        const paymentsForOrder = await razorpay.orders.fetchPayments(
          payment.payment_intent_id
        );
        const paidPayment =
          paymentsForOrder?.items?.find((p) => p.status === "captured") ||
          paymentsForOrder?.items?.[0];

        if (paidPayment && paidPayment.id) {
          await razorpay.payments.refund(paidPayment.id, {
            amount: Math.round(order.total_price * 100),
            notes: { reason: "Customer cancelled order" },
          });

          await database.query(
            `UPDATE payments SET payment_status = 'Refunded' WHERE order_id = $1`,
            [orderId]
          );
          isRefundInitiated = true;
          console.log("✅ Razorpay refund initiated for order:", orderId);
        }
      }
    }
  } catch (refundErr) {
    console.error("💥 Razorpay Refund Warning:", refundErr.message || refundErr);
  }

  res.status(200).json({
    success: true,
    message: isRefundInitiated
      ? "Order cancelled and payment refund initiated via Razorpay."
      : "Order cancelled successfully.",
    order: updatedOrder.rows[0],
    refundInitiated: isRefundInitiated,
  });
});
