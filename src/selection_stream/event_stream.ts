export interface StreamCallbacks<Event> {
  handleEvent: (event: Event) => void;
  release?: () => void;
}

interface StreamSubscription<Event> {
  owner: unknown;
  callbacks: StreamCallbacks<Event>;
}

interface SpyStreamSubscription<Event> {
  owner: unknown;
  callbacks: Omit<StreamCallbacks<Event>, "unsubscribe">;
}

/**
 * Stateless sequence of events that can be processed by consumers.
 *
 * There are three kind of consumers:
 * - the main consumer
 * - the default consumer
 * - observer consumers
 *
 * Main consumer
 * -------------
 * Anyone can capture the event stream and become the main consumer.
 * If there is already a main consumer, it is kicked off and it will no longer
 * receive events.
 * The main consumer can release the stream at any moment to stop listening
 * events.
 *
 * Default consumer
 * ----------------
 * When the main consumer releases the stream and until the stream is captured
 * again, all events are transmitted to the default consumer.
 *
 * Observer consumers
 * ------------------
 * Observers permanently receive events.
 *
 */
export class EventStream<Event> {
  private observers: SpyStreamSubscription<Event>[] = [];
  /**
   * the one we default to when someone unsubscribes
   */
  private defaultSubscription?: StreamSubscription<Event>;
  private mainSubscription?: StreamSubscription<Event>;

  registerAsDefault(owner: unknown, callbacks: StreamCallbacks<Event>) {
    this.defaultSubscription = { owner, callbacks };
    if (!this.mainSubscription) {
      this.mainSubscription = this.defaultSubscription;
    }
  }

  /**
   * Register callbacks to observe the stream
   */
  observe(owner: unknown, callbacks: Omit<StreamCallbacks<Event>, "unsubscribe">) {
    this.observers.push({ owner, callbacks });
  }

  /**
   * Capture the stream for yourself
   */
  capture(owner: unknown, callbacks: StreamCallbacks<Event>) {
    if (this.observers.find((sub) => sub.owner === owner)) {
      throw new Error("You are already subscribed forever");
    }
    if (this.mainSubscription?.owner) {
      this.mainSubscription.callbacks.release?.();
    }
    this.mainSubscription = { owner, callbacks };
  }

  release(owner: unknown) {
    if (
      this.mainSubscription?.owner !== owner ||
      this.observers.find((sub) => sub.owner === owner)
    ) {
      return;
    }
    this.mainSubscription?.callbacks.release?.();
    this.mainSubscription = this.defaultSubscription;
  }

  /**
   * Check if you are currently the main stream consumer
   */
  isListening(owner: unknown): boolean {
    return this.mainSubscription?.owner === owner;
  }

  /**
   * Push an event to the stream and broadcast it to consumers
   */
  send(event: Event): void {
    this.mainSubscription?.callbacks.handleEvent(event);
    [...this.observers].forEach((sub) => sub.callbacks.handleEvent(event));
  }
}
