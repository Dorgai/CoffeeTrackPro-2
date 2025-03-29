import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export const PostgresSessionStore = connectPg(session);

export const createSessionStore = () => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  
  return new PostgresSessionStore({
    pool,
    createTableIfMissing: true,
    tableName: 'sessions'
  });
}; 