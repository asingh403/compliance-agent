const developmentBaseUrl = "http://localhost:5001/api/v1";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!configuredBaseUrl && import.meta.env.PROD) {
  throw new Error("VITE_API_BASE_URL is required for production builds");
}

const rawBaseUrl = configuredBaseUrl || developmentBaseUrl;

try {
  new URL(rawBaseUrl);
} catch {
  throw new Error("VITE_API_BASE_URL must be a valid absolute URL");
}

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
