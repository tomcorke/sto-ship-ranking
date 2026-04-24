import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { __resetDatasetForTests, loadDataset } from "../shipsData.ts";

function makeCsvResponse(body = ""): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/csv" } });
}

describe("loadDataset", () => {
  beforeEach(() => {
    __resetDatasetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetDatasetForTests();
  });

  it("returns the same Dataset reference on repeated calls (cache hit)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(makeCsvResponse(""));

    const first = await loadDataset();
    const second = await loadDataset();

    expect(second).toBe(first);
    // Cache means exactly one network fetch across both calls.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("shares the inflight promise between concurrent callers", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const pA = loadDataset();
    const pB = loadDataset();

    // Exactly one network call was issued even though two callers entered.
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveFetch?.(makeCsvResponse(""));
    const [a, b] = await Promise.all([pA, pB]);

    expect(b).toBe(a);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws on a non-ok response and leaves the cache empty for retry", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(makeCsvResponse(""));

    await expect(loadDataset()).rejects.toThrow(/500/);
    // A retry after the error proceeds to a fresh network fetch.
    const ok = await loadDataset();
    expect(ok.ships).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
