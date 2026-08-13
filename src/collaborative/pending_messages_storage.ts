import { StateUpdateMessage } from "../types/collaborative/transport_service";

export interface PendingMessagesStorage {
  /** Append one message to the shared list (under write lock). Fire-and-forget. */
  addMessage(message: StateUpdateMessage): void;

  /** Remove one message by nextRevisionId from the shared list (under write lock). Fire-and-forget. */
  removeMessage(revisionId: string): void;

  /**
   * Replace the entire stored list (used after restore to re-persist pending messages).
   * Fire-and-forget.
   */
  save(messages: StateUpdateMessage[]): void;

  /**
   * Acquire the write lock, read and clear all stored messages, release the lock,
   * and return the messages (or null if storage was empty).
   * Concurrent calls are serialized: the second caller reads an already-cleared store
   * and gets null.
   */
  loadAndClaim(): Promise<StateUpdateMessage[] | null>;
}
