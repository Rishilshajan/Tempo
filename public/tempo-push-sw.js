self.addEventListener("push", (event) => {
  let message;
  try {
    message = event.data?.json();
  } catch {
    return;
  }
  if (!message || typeof message.title !== "string") return;
  event.waitUntil(self.registration.showNotification(message.title, {
    body: typeof message.body === "string" ? message.body : "",
    icon: "/icon-192.png",
    tag: typeof message.tag === "string" ? message.tag : undefined,
    data: { taskId: message.taskId },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL("/dashboard", self.location.origin);
  const taskId = event.notification.data?.taskId;
  if (typeof taskId === "string") url.searchParams.set("notificationTask", taskId);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const workspace = windows.find((client) => new URL(client.url).pathname === "/dashboard");
    if (workspace) {
      const navigated = await workspace.navigate(url.href);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});
