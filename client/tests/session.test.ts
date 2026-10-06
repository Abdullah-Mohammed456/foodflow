import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { userQueryOptions } from "../lib/queries";

test("guest session stays settled across checkout remounts and accepts the login cache", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Sign in required" } }), { status: 401 });
  };
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
  try {
    const first = new QueryObserver(client, userQueryOptions);
    await new Promise<void>((resolve) => {
      const unsubscribe = first.subscribe((result) => {
        if (result.isError) { unsubscribe(); resolve(); }
      });
    });
    for (let mount = 0; mount < 4; mount += 1) {
      const observer = new QueryObserver(client, userQueryOptions);
      const unsubscribe = observer.subscribe(() => {});
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(observer.getCurrentResult().status, "error");
      assert.equal(observer.getCurrentResult().fetchStatus, "idle");
      unsubscribe();
    }
    assert.equal(requests, 1, "remounting checkout must not restart the guest session request");
    const signedIn = { id: "qa-customer", name: "QA Customer", email: "qa@example.test", role: "USER" };
    client.setQueryData(["me"], signedIn);
    const authenticated = new QueryObserver(client, userQueryOptions);
    const unsubscribe = authenticated.subscribe(() => {});
    assert.deepEqual(authenticated.getCurrentResult().data, signedIn);
    assert.equal(authenticated.getCurrentResult().status, "success");
    unsubscribe();
  } finally {
    client.clear();
    globalThis.fetch = originalFetch;
  }
});
