import * as owl from "@odoo/owl";

/**
 * This is a generic event bus based on the Owl event bus.
 * This bus however ensures type safety across events and subscription callbacks.
 */
export class EventBus<Event extends { type: string }> {
  private bus = new owl.core.EventBus();

  on<T extends Event["type"], E extends Extract<Event, { type: T }>>(
    type: T,
    owner: any,
    callback: (r: Omit<E, "type">) => void
  ) {
    this.bus.on(type, owner, callback);
  }

  trigger<T extends Event["type"], E extends Extract<Event, { type: T }>>(
    type: T,
    payload?: Omit<E, "type">
  ) {
    this.bus.trigger(type, payload);
  }

  off<T extends Event["type"]>(eventType: T, owner: any) {
    this.bus.off(eventType, owner);
  }

  clear() {
    this.bus.clear();
  }
}

interface SetScrollBarEvent {
  type: "set-scrollbar-values";
  offsetX: number;
  offsetY: number;
}

interface ModelUpdateEvent {
  type: "update";
}

interface UnexpectedCollaborativeRevision {
  type: "unexpected-revision-id";
}

type ModelEvent = SetScrollBarEvent | ModelUpdateEvent | UnexpectedCollaborativeRevision;

export class ModelBus extends EventBus<ModelEvent> {}
