import { useCallback, useState } from "react";

export const TRUST_USAGE_STORAGE_KEY = "compliance-hub-trust-usage-v1";

const hasAccepted = () => {
  try {
    return localStorage.getItem(TRUST_USAGE_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
};

export const useTrustUsage = () => {
  const [accepted, setAccepted] = useState(hasAccepted);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(TRUST_USAGE_STORAGE_KEY, "accepted");
    } catch {
      // Acceptance remains valid for this session when storage is unavailable.
    }
    setAccepted(true);
  }, []);

  return { trustUsageAccepted: accepted, acceptTrustUsage: accept };
};
