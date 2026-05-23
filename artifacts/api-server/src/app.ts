import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";

import router from "./routes";
import { logger } from "./lib/logger";



import { pool } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);



app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://fitness-hub-fittrack.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (_, res) => {
  res.json({
    status: "ok",
    message: "API running",
  });
});

app.use("/api", router);

app.get("/api/debug-db", async (_, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      result: result.rows,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    });
  } catch (err) {
    console.error("DEBUG DB ERROR:", err);

    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    });
  }
});

app.get("/api/test-db", async (_, res) => {
  let client;

  try {
    console.log("Attempting DB connection...");

    client = await pool.connect();

    console.log("DB connected successfully");

    const result = await client.query("SELECT NOW()");

    console.log("Query executed successfully");

    res.json({
      success: true,
      result: result.rows,
    });
  } catch (err) {
    console.error("RAW DB TEST ERROR:", err);

    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default app;