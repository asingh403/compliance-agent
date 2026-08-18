import { Router } from "express";
import { z } from "zod";
import { activityActions, activityRepository } from "../activity/activity-repository.js";
import { AppError } from "../lib/app-error.js";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["SUCCESS", "WARNING", "FAILED"]).optional(),
  action: z.enum(activityActions).optional(),
  search: z.string().trim().max(128).optional(),
});

export const activityRouter = Router();

activityRouter.get("/", async (request, response) => {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) throw new AppError(422, "INVALID_REQUEST", "Activity filters are invalid");
  const to = new Date();
  const from = new Date(to.getTime() - parsed.data.days * 86_400_000);
  const data = await activityRepository.list({
    from,
    to,
    page: parsed.data.page,
    limit: parsed.data.limit,
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.action ? { action: parsed.data.action } : {}),
    ...(parsed.data.search ? { search: parsed.data.search } : {}),
  });
  response.json({ success: true, data, meta: { requestId: request.requestId } });
});
