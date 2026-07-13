import { StateUpdateMessage } from "../types/collaborative/transport_service";
import { PendingMessagesStorage } from "./pending_messages_storage";

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StoredPayload {
  entries: StateUpdateMessage[];
  savedAt: number;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Persists a session's pending collaborative messages to localStorage using
 * AES-256-GCM encryption. The AES key is derived from the spreadsheetId via
 * HKDF. The localStorage key is a SHA-256 hash of the spreadsheetId, so an
 * attacker with access to localStorage cannot derive the encryption key from
 * the storage key alone.
 *
 * A single Web Lock serializes all storage operations (addMessage, removeMessage,
 * save, loadAndClaim). Each operation acquires the lock, performs its read-modify-write,
 * then releases it immediately. loadAndClaim reads and clears the stored list atomically;
 * a concurrent second call therefore finds an empty store and returns null, preventing
 * double-replay across tabs without the need for a page-lifetime lock.
 *
 * Call `await storage.init()` once before creating the Model, then pass the
 * storage instance via `ModelConfig.pendingChangesStorage`.
 *
 * Known limitations:
 * - If the encrypted payload exceeds the ~5 MB localStorage quota, the write
 *   fails silently and pending messages are lost.
 */
export class LocalStoragePendingMessages implements PendingMessagesStorage {
  private cryptoKey: CryptoKey | undefined;
  /** Set in init() — empty string until then, used as a no-op sentinel. */
  private storageKey: string = "";
  private lockName: string = "";

  constructor(private readonly spreadsheetId: string) {}

  /**
   * Must be called (and awaited) once before the Model is constructed.
   * Derives the AES key from the spreadsheetId.
   * Silently no-ops if crypto or storage APIs are unavailable.
   */
  async init(): Promise<void> {
    try {
      const spreadsheetIdBytes = new TextEncoder().encode(this.spreadsheetId);

      // Derive the storage key as a SHA-256 hash of the spreadsheetId.
      const storageKeyHash = await crypto.subtle.digest("SHA-256", spreadsheetIdBytes);
      const hashStr = arrayBufferToBase64(storageKeyHash);
      this.storageKey = `o-spreadsheet-pending-${hashStr}`;
      this.lockName = `o-spreadsheet-lock-${hashStr}`;

      // Derive the AES-256-GCM encryption key — must be set after storageKey so the
      // invariant "cryptoKey set ↔ storageKey set" holds even if this step throws.
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        spreadsheetIdBytes,
        { name: "HKDF" },
        false,
        ["deriveKey"]
      );
      this.cryptoKey = await crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new TextEncoder().encode("o-spreadsheet-pending-messages"),
          info: new TextEncoder().encode("o-spreadsheet-pending-changes"),
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );

      // Remove stale entries older than 7 days
      const payload = await this.readAndDecrypt();
      if (payload && Date.now() - payload.savedAt > STALE_THRESHOLD_MS) {
        localStorage.removeItem(this.storageKey);
      }
    } catch {
      // Graceful degradation: unavailable crypto or storage → no persistence
    }
  }

  /** Append a message to the shared list. Fire-and-forget. */
  addMessage(message: StateUpdateMessage): void {
    void this.withLock(async () => {
      const payload = await this.readAndDecrypt();
      const entries = payload?.entries ?? [];
      if (entries.some((e) => e.nextRevisionId === message.nextRevisionId)) {
        return;
      }
      await this.encryptAndWrite({ entries: [...entries, message], savedAt: Date.now() });
    });
  }

  /** Remove a message by nextRevisionId. Fire-and-forget. */
  removeMessage(revisionId: string): void {
    void this.withLock(async () => {
      const payload = await this.readAndDecrypt();
      if (!payload) {
        return;
      }
      const entries = payload.entries.filter((e) => e.nextRevisionId !== revisionId);
      if (entries.length === 0) {
        localStorage.removeItem(this.storageKey);
      } else {
        await this.encryptAndWrite({ entries, savedAt: payload.savedAt });
      }
    });
  }

  /** Replace the entire stored list. Fire-and-forget. */
  save(messages: StateUpdateMessage[]): void {
    void this.withLock(async () => {
      if (messages.length === 0) {
        localStorage.removeItem(this.storageKey);
        return;
      }
      await this.encryptAndWrite({ entries: messages, savedAt: Date.now() });
    });
  }

  /**
   * Acquire the lock, read and clear the stored list, release the lock,
   * and return the messages (or null). A concurrent second call finds empty
   * storage and returns null — preventing double-replay across tabs.
   */
  async loadAndClaim(): Promise<StateUpdateMessage[] | null> {
    if (!this.cryptoKey) {
      return null;
    }

    // Fallback for environments without Web Locks (e.g. tests)
    if (typeof navigator === "undefined" || !navigator.locks) {
      const payload = await this.readAndDecrypt();
      localStorage.removeItem(this.storageKey);
      return payload?.entries.length ? payload.entries : null;
    }

    return new Promise((resolve) => {
      void navigator.locks.request(this.lockName, async () => {
        const payload = await this.readAndDecrypt();
        localStorage.removeItem(this.storageKey);
        resolve(payload?.entries.length ? payload.entries : null);
        // Lock released when this async function returns
      });
    });
  }

  /**
   * Run `fn` under the exclusive write lock.
   * Falls back to running `fn` directly if Web Locks are unavailable.
   */
  private async withLock(fn: () => Promise<void>): Promise<void> {
    if (!this.cryptoKey) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.locks) {
      await fn().catch(() => {});
      return;
    }
    await navigator.locks.request(this.lockName, async () => {
      await fn().catch(() => {});
    });
  }

  private async encryptAndWrite(payload: StoredPayload): Promise<void> {
    if (!this.cryptoKey) {
      return;
    }
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.cryptoKey,
      plaintext
    );
    localStorage.setItem(
      this.storageKey,
      `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(ciphertext)}`
    );
  }

  private async readAndDecrypt(): Promise<StoredPayload | null> {
    if (!this.cryptoKey) {
      return null;
    }
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return null;
    }
    const colonIndex = stored.indexOf(":");
    if (colonIndex === -1) {
      return null;
    }
    const iv = new Uint8Array(base64ToArrayBuffer(stored.slice(0, colonIndex)));
    const ciphertext = base64ToArrayBuffer(stored.slice(colonIndex + 1));
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        this.cryptoKey,
        ciphertext
      );
      const payload: StoredPayload = JSON.parse(new TextDecoder().decode(plaintext));
      if (!payload.entries || !Array.isArray(payload.entries)) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}
