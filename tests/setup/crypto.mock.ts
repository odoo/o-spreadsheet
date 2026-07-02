/**
 * jsdom exposes only `crypto.getRandomValues`; the disconnected-changes
 * persistence relies on the full Web Crypto API (`crypto.subtle`) plus
 * `TextEncoder`/`TextDecoder`. Shim them from Node so the crypto-gated feature
 * is actually exercised in tests instead of silently no-op'ing.
 */
import { webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";

if (!globalThis.crypto?.subtle) {
  // Define as an accessor (not a value) so existing tests can still
  // `jest.spyOn(window, "crypto", "get")`.
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    get: () => webcrypto,
  });
}

if (typeof globalThis.TextEncoder === "undefined") {
  // @ts-ignore - Node's TextEncoder is structurally compatible for our use.
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  // @ts-ignore - Node's TextDecoder is structurally compatible for our use.
  globalThis.TextDecoder = TextDecoder;
}
