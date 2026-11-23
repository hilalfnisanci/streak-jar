import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const workerScript = readFileSync("public/reminders-sw.js", "utf8");
const scope = "https://streak.example/streak-jar/";

type WorkerClick = {
  notification: { close: () => void; data: { jarId: string } };
  waitUntil: (work: Promise<void>) => void;
};

class TestMessageChannel {
  readonly port1 = {
    onmessage: undefined as ((event: { data: boolean }) => void) | undefined,
    close: () => {
      this.port1.onmessage = undefined;
    },
  };
  readonly port2 = {
    reply: (data: boolean) => queueMicrotask(() => this.port1.onmessage?.({ data })),
  };
}

function client(url: string, matches: boolean) {
  return {
    url,
    focus: vi.fn().mockResolvedValue(undefined),
    postMessage: vi.fn((_data: unknown, ports?: TestMessageChannel["port2"][]) => {
      if (matches) ports?.[0].reply(true);
    }),
  };
}

function startWorker(clients: ReturnType<typeof client>[]) {
  let onClick!: (event: WorkerClick) => void;
  let lookupStarted!: (callback: () => void) => void;
  const lookupTimeout = new Promise<() => void>((resolve) => {
    lookupStarted = resolve;
  });
  const openWindow = vi.fn();
  const close = vi.fn();
  runInNewContext(workerScript, {
    MessageChannel: TestMessageChannel,
    URL,
    clearTimeout: vi.fn(),
    setTimeout: lookupStarted,
    self: {
      addEventListener: (_event: string, listener: (event: WorkerClick) => void) => {
        onClick = listener;
      },
      registration: { scope },
      clients: { matchAll: async () => clients, openWindow },
    },
  });

  return {
    close,
    openWindow,
    click(jarId: string) {
      return new Promise<void>((resolve, reject) => {
        onClick({
          notification: { close, data: { jarId } },
          waitUntil: (work) => {
            void work.then(resolve, reject);
          },
        });
      });
    },
    async expireLookup() {
      const expire = await lookupTimeout;
      expire();
    },
  };
}

describe("reminder notification clicks", () => {
  it("focuses the live matching jar when creation URLs no longer match the visible tabs", async () => {
    const stale = client(`${scope}jar/?id=reading`, false);
    const current = client(scope, true);
    const unrelated = client("https://streak.example/other-app/", true);
    const worker = startWorker([stale, unrelated, current]);

    await worker.click("reading");

    expect(current.focus).toHaveBeenCalledTimes(1);
    expect(current.postMessage).toHaveBeenCalledTimes(2);
    const [[matchRequest, ports], [focusRequest]] = current.postMessage.mock.calls;
    expect(matchRequest).toEqual({
      type: "match-jar-reminder",
      pathname: "/streak-jar/jar/",
      jarId: "reading",
    });
    expect(ports).toHaveLength(1);
    expect(focusRequest).toEqual({ type: "focus-jar-reminder", jarId: "reading" });
    expect(stale.focus).not.toHaveBeenCalled();
    expect(unrelated.postMessage).not.toHaveBeenCalled();
    expect(worker.openWindow).not.toHaveBeenCalled();
    expect(worker.close).toHaveBeenCalledTimes(1);
  });

  it("opens an encoded jar URL under the worker scope if no tab answers", async () => {
    const unrelated = client(scope, false);
    const worker = startWorker([unrelated]);

    const clicked = worker.click("a&b/?#");
    await worker.expireLookup();
    await clicked;

    expect(unrelated.focus).not.toHaveBeenCalled();
    expect(worker.openWindow).toHaveBeenCalledExactlyOnceWith(
      `${scope}jar/?id=a%26b%2F%3F%23#reminder`,
    );
  });
});
