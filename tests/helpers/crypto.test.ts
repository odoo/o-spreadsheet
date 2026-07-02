import {
  decrypt,
  deriveKey,
  encrypt,
  hashToStorageKey,
  isCryptoAvailable,
} from "../../src/helpers/crypto";

describe("crypto helpers", () => {
  test("isCryptoAvailable is true in the (shimmed) test environment", () => {
    expect(isCryptoAvailable()).toBe(true);
  });

  test("isCryptoAvailable is false when crypto.subtle is unavailable", () => {
    const realCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) },
    });
    try {
      expect(isCryptoAvailable()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: realCrypto });
    }
  });

  test("encrypt/decrypt round-trips a payload", async () => {
    const key = await deriveKey("some-uuid");
    const plaintext = JSON.stringify({ hello: "world", n: 42 });
    const encrypted = await encrypt(key, plaintext);
    expect(encrypted).not.toContain("hello");
    expect(await decrypt(key, encrypted)).toBe(plaintext);
  });

  test("encrypt uses a random IV, so the same plaintext yields different blobs", async () => {
    const key = await deriveKey("some-uuid");
    const a = await encrypt(key, "same");
    const b = await encrypt(key, "same");
    expect(a).not.toBe(b);
    expect(await decrypt(key, a)).toBe("same");
    expect(await decrypt(key, b)).toBe("same");
  });

  test("decrypt with the wrong key returns undefined", async () => {
    const key = await deriveKey("uuid-a");
    const otherKey = await deriveKey("uuid-b");
    const encrypted = await encrypt(key, "secret");
    expect(await decrypt(otherKey, encrypted)).toBeUndefined();
  });

  test("decrypt of a garbage payload returns undefined", async () => {
    const key = await deriveKey("uuid-a");
    expect(await decrypt(key, "not-a-valid-payload")).toBeUndefined();
  });

  test("deriveKey from the same uuid produces interoperable keys", async () => {
    const key1 = await deriveKey("uuid-x");
    const key2 = await deriveKey("uuid-x");
    const encrypted = await encrypt(key1, "payload");
    expect(await decrypt(key2, encrypted)).toBe("payload");
  });

  test("hashToStorageKey is stable, hex, and does not reveal the uuid", async () => {
    const uuid = "abc-123";
    const key1 = await hashToStorageKey(uuid);
    const key2 = await hashToStorageKey(uuid);
    expect(key1).toBe(key2);
    expect(key1).not.toContain(uuid);
    expect(key1).toMatch(/^[0-9a-f]{64}$/);
  });

  test("hashToStorageKey differs for different uuids", async () => {
    expect(await hashToStorageKey("uuid-a")).not.toBe(await hashToStorageKey("uuid-b"));
  });
});
