import pkg from "pg";
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
