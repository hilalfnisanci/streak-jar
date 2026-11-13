export function createJarId() {
  return globalThis.crypto?.randomUUID?.() ?? `jar-${Date.now()}`;
}
