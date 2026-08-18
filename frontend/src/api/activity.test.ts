import { afterEach, describe, expect, it, vi } from "vitest";
import { getActivity } from "./activity";

afterEach(() => vi.unstubAllGlobals());

describe("activity API", () => {
  it("requests seven-day activity with encoded filters", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: {
      activities: [], summary: { total: 0, success: 0, warning: 0, failed: 0 },
      pagination: { page: 2, limit: 20, total: 0, pages: 1 }, range: { from: "from", to: "to" },
    }, meta: { requestId: "activity-request" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    await getActivity({ page: 2, limit: 20, search: "request 1", action: "COMPLIANCE_RETRIEVAL", status: "WARNING" });
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/activity?days=7&page=2&limit=20&search=request+1&action=COMPLIANCE_RETRIEVAL&status=WARNING",
      expect.any(Object),
    );
  });
});
