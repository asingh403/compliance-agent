import { env } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const write = (level: LogLevel, message: string, fields: Fields = {}) => {
  if (priorities[level] < priorities[env.LOG_LEVEL]) return;
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields });
  if (level === "error") console.error(entry);
  else console.log(entry);
};

export const logger = {
  debug: (message: string, fields?: Fields) => write("debug", message, fields),
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
