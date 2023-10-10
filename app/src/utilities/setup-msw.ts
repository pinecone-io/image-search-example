export const setupMsw = async (): Promise<
  ServiceWorkerRegistration | undefined
> => {
  if (!+import.meta.env.VITE_MOCK_API) {
    return undefined;
  }
  const { worker } = await import("../mocks/browser");
  return worker.start({ onUnhandledRequest: "bypass" });
};
