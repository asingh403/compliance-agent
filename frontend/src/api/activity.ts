import { apiRequest } from "./client";
import type { ActivityAction, ActivityData, ActivityStatus } from "./types";

export interface ActivityFilters {
  page: number;
  limit: number;
  search?: string;
  action?: ActivityAction;
  status?: ActivityStatus;
}

export const getActivity = (filters: ActivityFilters, signal?: AbortSignal) => {
  const query = new URLSearchParams({ days: "7", page: String(filters.page), limit: String(filters.limit) });
  if (filters.search) query.set("search", filters.search);
  if (filters.action) query.set("action", filters.action);
  if (filters.status) query.set("status", filters.status);
  return apiRequest<ActivityData>(`/activity?${query.toString()}`, { ...(signal ? { signal } : {}) });
};
