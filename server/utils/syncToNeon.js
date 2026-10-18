import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../config/config.env") });

const { Client } = pkg;

export const syncLocalToNeon = async () => {
  const local = new Client({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "mern_ecommerce_store",
    password: process.env.DB_PASSWORD || "8004757960",
    port: process.env.DB_PORT || 5432,
  });

  const neon = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await local.connect();
    console.log("Connected to local database.");

    await neon.connect();
    console.log("Connected to Neon database.");

    // 1. Sync Users
    const usersRes = await local.query("SELECT * FROM users");
    for (const u of usersRes.rows) {
      await neon.query(
        `INSERT INTO users (id, name, email, password, role, avatar, reset_password_token, reset_password_expire, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password = EXCLUDED.password,
           role = EXCLUDED.role;`,
        [
          u.id,
          u.name,
          u.email,
          u.password,
          u.role,
          u.avatar ? JSON.stringify(u.avatar) : null,
          u.reset_password_token,
          u.reset_password_expire,
          u.created_at,
        ]
      );
    }
    console.log(`Synced ${usersRes.rows.length} users to Neon.`);

    // 2. Sync Products
    const prodRes = await local.query("SELECT * FROM products");
    for (const p of prodRes.rows) {
      await neon.query(
        `INSERT INTO products (id, name, description, price, category, ratings, images, stock, created_by, created_at, discount_city, discount_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           category = EXCLUDED.category,
           ratings = EXCLUDED.ratings,
           images = EXCLUDED.images,
           stock = EXCLUDED.stock,
           discount_city = EXCLUDED.discount_city,
           discount_percent = EXCLUDED.discount_percent;`,
        [
          p.id,
          p.name,
          p.description,
          p.price,
          p.category,
          p.ratings,
          JSON.stringify(p.images),
          p.stock,
          p.created_by,
          p.created_at,
          p.discount_city,
          p.discount_percent,
        ]
      );
    }
    console.log(`Synced ${prodRes.rows.length} products to Neon.`);

    console.log("Data migration to Neon completed successfully!");
  } catch (err) {
    console.error("Sync error:", err);
  } finally {
    await local.end();
    await neon.end();
  }
};

syncLocalToNeon();
