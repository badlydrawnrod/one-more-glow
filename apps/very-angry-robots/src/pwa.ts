export function registerAppServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const baseUrl = import.meta.env.BASE_URL;
  const workerUrl = new URL(`${baseUrl}sw.js`, window.location.origin);
  void navigator.serviceWorker.register(workerUrl, { scope: baseUrl })
    .catch((error: unknown) => console.warn("Robots offline support could not be enabled.", error));
}
