import { afterEach, describe, expect, it, vi } from "vitest";

const { getRuntimeEnv } = vi.hoisted(() => ({ getRuntimeEnv: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare", () => ({ getRuntimeEnv }));
import { checkApiRateLimit } from "@/lib/api-rate-limit";

afterEach(() => { vi.resetAllMocks(); });

describe("Cloudflare discovery rate limiting", () => {
  it("allows ordinary local demo requests when no binding exists", async () => {
    getRuntimeEnv.mockResolvedValue({});
    expect(await checkApiRateLimit(new Request("http://localhost:3000/api/catalog"))).toBeNull();
  });

  it("keys configured checks by the Worker-provided IP and allows successful checks", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    getRuntimeEnv.mockResolvedValue({ API_RATE_LIMITER: { limit } });
    expect(await checkApiRateLimit(new Request("https://pinflix.example/api/catalog", { headers: { "CF-Connecting-IP": "203.0.113.5" } }))).toBeNull();
    expect(limit).toHaveBeenCalledWith({ key: "203.0.113.5" });
  });

  it("returns a non-cacheable 429 with retry guidance when the quota fails", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    getRuntimeEnv.mockResolvedValue({ API_RATE_LIMITER: { limit } });
    const response = await checkApiRateLimit(new Request("http://localhost:3000/api/catalog"));
    expect(limit).toHaveBeenCalledWith({ key: "local-preview" });
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
    expect(response?.headers.get("cache-control")).toContain("no-store");
  });

  it("fails closed without leaking binding errors or IP data", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("Internal binding error for private-ip secret-key"));
    getRuntimeEnv.mockResolvedValue({ API_RATE_LIMITER: { limit } });
    const response = await checkApiRateLimit(new Request("https://pinflix.example/api/catalog"));
    expect(response?.status).toBe(503);
    expect(response?.headers.get("cache-control")).toContain("no-store");
    const text = await response!.text();
    expect(text).not.toContain("private-ip");
    expect(text).not.toContain("secret-key");
  });
});
