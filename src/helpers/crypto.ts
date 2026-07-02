/**
 * Client-side encryption helpers used to persist disconnected collaborative
 * changes in `localStorage`.
 *
 * Threat model: this protects spreadsheet content *at rest in localStorage* on
 * a shared machine. An inspector sees only an opaque, hashed storage key and an
 * AES-GCM blob; without the (server-delivered) spreadsheet uuid they can
 * neither locate nor decrypt an entry. It does NOT protect against an attacker
 * who can already run JavaScript in the page (they have the uuid), and there is
 * no anti-rollback protection (an old valid blob could be swapped back in).
 *
 * Everything here is async (Web Crypto is async) and the whole feature is gated
 * behind `isCryptoAvailable()`: when the environment lacks `crypto.subtle`
 * (non-HTTPS, unsupported browser, or an unshimmed test env) the persistence
 * feature is silently disabled — we never fall back to writing plaintext.
 */

// Prefix hashed into the storage key. Kept distinct from KEY_INFO so the
// storage key and the encryption key material are derived independently.
const STORAGE_KEY_PREFIX = "o-spreadsheet-storage-key:";
const KEY_INFO = "o-spreadsheet-encryption-key";
// Static salt: the uuid is already high-entropy, so HKDF only needs domain
// separation here, not a random per-entry salt.
const HKDF_SALT = "o-spreadsheet-hkdf-salt";
const IV_BYTES = 12;

export function isCryptoAvailable(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    !!globalThis.crypto?.subtle &&
    typeof TextEncoder !== "undefined" &&
    typeof TextDecoder !== "undefined"
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive the localStorage key from the spreadsheet uuid. The key is the hex
 * SHA-256 of a prefixed uuid, so the stored key never reveals the uuid itself.
 */
export async function hashToStorageKey(uuid: string): Promise<string> {
  const data = new TextEncoder().encode(STORAGE_KEY_PREFIX + uuid);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

/**
 * Derive an AES-GCM-256 key from the spreadsheet uuid via HKDF-SHA-256. HKDF
 * (rather than PBKDF2) because the uuid is already high-entropy, not a
 * user-chosen password.
 */
export async function deriveKey(uuid: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(uuid),
    "HKDF",
    false,
    ["deriveKey"]
  );
  return globalThis.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(HKDF_SALT),
      info: encoder.encode(KEY_INFO),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string with AES-GCM. Returns `base64(IV ‖ ciphertext‖tag)`
 * using a fresh random 12-byte IV per call.
 */
export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const bytes = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  bytes.set(iv, 0);
  bytes.set(new Uint8Array(ciphertext), IV_BYTES);
  return bytesToBase64(bytes);
}

/**
 * Decrypt a payload produced by `encrypt`. Returns `undefined` on ANY failure
 * (wrong key, tampered blob, or foreign/garbage entry) so callers treat a bad
 * blob as "no saved state".
 */
export async function decrypt(key: CryptoKey, payload: string): Promise<string | undefined> {
  try {
    const bytes = base64ToBytes(payload);
    const iv = bytes.slice(0, IV_BYTES);
    const ciphertext = bytes.slice(IV_BYTES);
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return undefined;
  }
}

// Explicit base64 via btoa/atob — do NOT use `Uint8Array.prototype.toBase64`,
// which the test polyfill stubs to a constant (would corrupt round-trips).
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
