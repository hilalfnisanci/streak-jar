const JAR_WINDOW_LOOKUP_MS = 200;

function findOpenJar(windows, pathname, jarId) {
  if (!windows.length) return Promise.resolve(null);

  return new Promise((resolve) => {
    const channels = [];
    const timeout = setTimeout(() => finish(null), JAR_WINDOW_LOOKUP_MS);
    let finished = false;

    function finish(client) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      for (const channel of channels) channel.port1.close();
      resolve(client);
    }

    // Client.url can stay at its creation URL during SPA navigation. Ask
    // in-scope tabs whether the exact jar URL is actually open right now.
    for (const client of windows) {
      const channel = new MessageChannel();
      channels.push(channel);
      channel.port1.onmessage = ({ data }) => {
        if (data === true) finish(client);
      };
      try {
        client.postMessage(
          { type: "match-jar-reminder", pathname, jarId },
          [channel.port2],
        );
      } catch {
        channel.port2.close();
      }
    }
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const jarId = event.notification.data?.jarId;
  if (typeof jarId !== "string" || !jarId) return;

  const scope = new URL(self.registration.scope);
  const target = new URL("jar/", scope);
  target.searchParams.set("id", jarId);
  target.hash = "reminder";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const inScope = windows.filter(({ url }) => {
        const client = new URL(url);
        return client.origin === scope.origin && client.pathname.startsWith(scope.pathname);
      });
      const match = await findOpenJar(inScope, target.pathname, jarId);
      if (match) {
        try {
          await match.focus();
          match.postMessage({ type: "focus-jar-reminder", jarId });
          return;
        } catch {
          // The matched tab may have closed before it could be focused.
        }
      }

      await self.clients.openWindow(target.href);
    })(),
  );
});
