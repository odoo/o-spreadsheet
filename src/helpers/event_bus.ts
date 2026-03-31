/**
 * This is a generic event bus based on the Owl event bus.
 * This bus however ensures type safety across events and subscription callbacks.
 */
export class EventBus<Event extends { type: string }> {
  subscriptions: { [eventType: string]: Subscription[] } = {};

  /**
   * Add a listener for the 'eventType' events.
   *
   * Note that the 'owner' of this event can be anything, but will more likely
   * be a component or a class. The idea is that the callback will be called with
   * the proper owner bound.
   *
   * Also, the owner should be kind of unique. This will be used to remove the
   * listener.
   */
  on<T extends Event["type"], E extends Extract<Event, { type: T }>>(
    type: T,
    owner: any,
    callback: (r: Omit<E, "type">) => void
  ) {
    if (!callback) {
      throw new Error("Missing callback");
    }
    if (!this.subscriptions[type]) {
      this.subscriptions[type] = [];
    }
    this.subscriptions[type].push({
      owner,
      callback,
    });
  }

  /**
   * Emit an event of type 'eventType'.  Any extra arguments will be passed to
   * the listeners callback.
   */
  trigger<T extends Event["type"], E extends Extract<Event, { type: T }>>(
    type: T,
    payload?: Omit<E, "type">
  ) {
    const subs = this.subscriptions[type] || [];
    for (let i = 0, iLen = subs.length; i < iLen; i++) {
      const sub = subs[i];
      sub.callback.call(sub.owner, payload);
    }
  }

  /**
   * Remove a listener
   */
  off<T extends Event["type"]>(eventType: T, owner: any) {
    const subs = this.subscriptions[eventType];
    if (subs) {
      this.subscriptions[eventType] = subs.filter((s) => s.owner !== owner);
    }
  }

  /**
   * Remove all subscriptions.
   */
  clear() {
    this.subscriptions = {};
  }
}

//------------------------------------------------------------------------------
// Types
//------------------------------------------------------------------------------

type Callback = (...args: any[]) => void;

interface Subscription {
  owner: any;
  callback: Callback;
}
