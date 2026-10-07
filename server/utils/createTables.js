import { createUserTable } from "../models/userTables.js";
import { createOrderItemTable } from "../models/orderItemsTable.js";
import { createOrdersTable } from "../models/ordersTable.js";
import { createPaymentsTable } from "../models/paymentsTable.js";
import { createProductReviewsTable } from "../models/productReviewsTable.js";
import { createProductsTable } from "../models/productTable.js";
import { createShippingInfoTable } from "../models/shippinginfoTable.js";
import database from "../database/db.js";

export const createDatabaseIndexes = async () => {
  try {
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`,
      `CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_products_ratings ON products(ratings DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);`,
    ];
    for (const query of indexQueries) {
      await database.query(query);
    }
    console.log("⚡ Database Performance Indexes Verified.");
  } catch (error) {
    console.warn("Index creation warning:", error.message);
  }
};

export const createTables = async () => {
  try {
    await createUserTable();
    await createProductsTable();
    await createProductReviewsTable();
    await createOrdersTable();
    await createOrderItemTable();
    await createShippingInfoTable();
    await createPaymentsTable();
    await createDatabaseIndexes();
    console.log("All Tables & Indexes Created Successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};