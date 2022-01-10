export interface NotificationUIEvent {
  type: "NOTIFICATION";
  text: string;
}

export interface ScrollUIEvent {
  type: "SCROLL";
  offsetX: number;
  offsetY: number;
}

export type NotifyUIEvent = NotificationUIEvent | ScrollUIEvent;
