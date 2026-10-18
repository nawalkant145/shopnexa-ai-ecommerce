import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../config/config.env") });

const { Client } = pkg;

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "mern_ecommerce_store",
      password: process.env.DB_PASSWORD || "8004757960",
      port: process.env.DB_PORT || 5432,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    };

const database = new Client(connectionConfig);

try {
    await database.connect();
    console.log("Connected to the database successfully");
    
} catch (error) {
    console.log("Database connection failed: " , error);
    process.exit(1);
    
}
export default database;
