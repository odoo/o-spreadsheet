import { PENDING_CHANGES_DISCONNECT_DELAY, PERSIST_DEBOUNCE_MS } from "../constants";
import {
  decrypt,
  deriveKey,
  encrypt,
  hashToStorageKey,
  isCryptoAvailable,
} from "../helpers/crypto";
import { debounce } from "../helpers/misc";
import {
  RemoteRevisionMessage,
  StateUpdateMessage,
} from "../types/collaborative/transport_service";
import { UID } from "../types/misc";
import { Get } from "../types/store_engine";
import { SpreadsheetStore } from "./spreadsheet_store";

type DisconnectionReason = "another-tab-editing" | "offline-pending-changes";

interface StorageEnvelope {
  /** cleartext, ordered nextRevisionIds - the cheap cross-tab comparison surface */
  revisionIds: UID[];
  /** AES-GCM encrypted JSON of the pending REMOTE_REVISION messages */
  payload: string;
}

/**
 * Mirrors the collaborative session's pending (unacknowledged) revisions into
 * `localStorage`, encrypted, so a user's disconnected edits survive a page
 * reload. It also drives the disconnected banner and coordinates multiple tabs
 * of the same spreadsheet.
 *
 * The stored entry is scoped to the spreadsheet uuid only (no tab identity).
 * Tabs coordinate by comparing pending revisions by their stable
 * `nextRevisionId`:
 * - a tab always *adopts* (recovers) whatever is stored on load;
 * - when about to persist, if the stored entry holds a revision this tab never
 *   produced ("different"), the tab goes read-only and stops writing;
 * - otherwise ("same") it rewrites its queue, including any new revision.
 *
 * The whole feature is silently disabled when `crypto.subtle` is unavailable -
 * we never write plaintext.
 */
export class LocalRevisionPersistenceStore extends SpreadsheetStore {
  mutators = ["setDisconnected", "setConnected"] as const;

  isDisconnected = false;
  reason: DisconnectionReason | undefined = undefined;

  private active = false;
  private storageKey: string | undefined = undefined;
  private cryptoKey: CryptoKey | undefined = undefined;
  /** every nextRevisionId this tab has produced or recovered */
  private knownIds = new Set<UID>();
  private disconnectTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  private persistDebounced = debounce(() => this.persist(), PERSIST_DEBOUNCE_MS);
  private storageListener = (event: StorageEvent) => this.onStorageEvent(event);

  /** Resolves once the async initialization (crypto + recovery) has completed. */
  readonly whenReady: Promise<void>;

  constructor(get: Get) {
    super(get);
    this.model.on("update", this, this.onModelUpdate);
    if (hasLocalStorage()) {
      window.addEventListener("storage", this.storageListener);
    }
    this.onDispose(() => {
      this.model.off("update", this);
      if (hasLocalStorage()) {
        window.removeEventListener("storage", this.storageListener);
      }
      this.clearDisconnectTimeout();
      this.flush();
    });
    this.whenReady = this.init();
  }

  setDisconnected(reason: DisconnectionReason) {
    if (this.isDisconnected && this.reason === reason) {
      return "noStateChange";
    }
    this.isDisconnected = true;
    this.reason = reason;
    return;
  }

  setConnected() {
    if (!this.isDisconnected) {
      return "noStateChange";
    }
    this.isDisconnected = false;
    this.reason = undefined;
    return;
  }

  private async init(): Promise<void> {
    const uuid = this.getters.getSpreadsheetUuid();
    if (!uuid || !isCryptoAvailable() || !hasLocalStorage()) {
      return;
    }
    this.storageKey = await hashToStorageKey(uuid);
    this.cryptoKey = await deriveKey(uuid);
    await this.recoverFromStorage();
    this.active = true;
    // Catch up on any model update that happened while keys were deriving.
    this.onModelUpdate();
  }

  private async recoverFromStorage(): Promise<void> {
    const envelope = this.readEnvelope();
    if (!envelope || !this.cryptoKey) {
      return;
    }
    const plaintext = await decrypt(this.cryptoKey, envelope.payload);
    if (!plaintext) {
      return;
    }
    let pending: StateUpdateMessage[];
    try {
      pending = JSON.parse(plaintext);
    } catch {
      return;
    }
    const revisions = pending.filter(isRemoteRevision);
    for (const message of revisions) {
      this.knownIds.add(message.nextRevisionId);
    }
    if (revisions.length) {
      this.model.recoverPendingMessages(revisions);
    }
  }

  private onModelUpdate() {
    if (!this.active) {
      return;
    }
    // "another-tab-editing" is terminal until reload: stop watching/persisting.
    if (this.reason === "another-tab-editing") {
      return;
    }
    this.updateDisconnectTimer();
    this.persistDebounced();
  }

  private updateDisconnectTimer() {
    if (this.getters.isFullySynchronized()) {
      this.clearDisconnectTimeout();
      if (this.reason === "offline-pending-changes" && this.setConnected() !== "noStateChange") {
        this.requestRender();
      }
      return;
    }
    if (this.isDisconnected || this.disconnectTimeout !== undefined) {
      return;
    }
    this.disconnectTimeout = setTimeout(() => {
      this.disconnectTimeout = undefined;
      if (!this.getters.isFullySynchronized()) {
        // The owner stays editable; this reason is purely informational.
        if (this.setDisconnected("offline-pending-changes") !== "noStateChange") {
          this.requestRender();
        }
      }
    }, PENDING_CHANGES_DISCONNECT_DELAY);
  }

  private async persist(): Promise<void> {
    if (!this.active || !this.cryptoKey || !this.storageKey) {
      return;
    }
    if (this.reason === "another-tab-editing") {
      return;
    }
    const pending = this.getters.getPendingRevisions().filter(isRemoteRevision);
    const currentIds = pending.map((message) => message.nextRevisionId);
    for (const id of currentIds) {
      this.knownIds.add(id);
    }
    const stored = this.readEnvelope();
    if (stored && stored.revisionIds.some((id) => !this.knownIds.has(id))) {
      // Another tab has stored pending changes this tab never produced.
      this.goReadonly();
      return;
    }
    if (currentIds.length === 0) {
      this.clearStorage();
      return;
    }
    const payload = await encrypt(this.cryptoKey, JSON.stringify(pending));
    this.writeEnvelope({ revisionIds: currentIds, payload });
  }

  private onStorageEvent(event: StorageEvent) {
    if (!this.active || event.key !== this.storageKey || this.reason === "another-tab-editing") {
      return;
    }
    const envelope = event.newValue ? parseEnvelope(event.newValue) : undefined;
    if (envelope && envelope.revisionIds.some((id) => !this.knownIds.has(id))) {
      this.goReadonly();
    }
  }

  private goReadonly() {
    const changed = this.setDisconnected("another-tab-editing");
    this.clearDisconnectTimeout();
    if (!this.getters.isReadonly()) {
      // updateMode triggers a model "update", which re-renders the banner.
      this.model.updateMode("readonly");
    } else if (changed !== "noStateChange") {
      this.requestRender();
    }
  }

  /**
   * Force a re-render. State changes triggered from async callbacks (the
   * disconnect timer, storage events) are not seen by the store render proxy,
   * so we re-render through the model's "update" event - the same signal the
   * spreadsheet already re-renders on. State mutations are idempotent, so this
   * cannot loop.
   */
  private requestRender() {
    this.model.trigger("update");
  }

  private clearDisconnectTimeout() {
    if (this.disconnectTimeout !== undefined) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = undefined;
    }
  }

  /**
   * Flush any pending debounced persist immediately. Awaited on dispose (best
   * effort) and useful to make persistence deterministic in tests.
   */
  flushPersist(): Promise<void> {
    this.persistDebounced.stopDebounce();
    return this.persist();
  }

  private flush() {
    if (this.persistDebounced.isDebouncePending()) {
      void this.flushPersist();
    }
  }

  private readEnvelope(): StorageEnvelope | undefined {
    if (!this.storageKey || !hasLocalStorage()) {
      return undefined;
    }
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      return raw ? parseEnvelope(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  private writeEnvelope(envelope: StorageEnvelope) {
    if (!this.storageKey || !hasLocalStorage()) {
      return;
    }
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(envelope));
    } catch {
      // storage full / unavailable: nothing else to do, the mirror is best-effort
    }
  }

  private clearStorage() {
    if (!this.storageKey || !hasLocalStorage()) {
      return;
    }
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function isRemoteRevision(message: StateUpdateMessage): message is RemoteRevisionMessage {
  return message.type === "REMOTE_REVISION";
}

function parseEnvelope(raw: string): StorageEnvelope | undefined {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.revisionIds) && typeof parsed.payload === "string") {
      return parsed as StorageEnvelope;
    }
  } catch {
    // not a valid envelope
  }
  return undefined;
}
