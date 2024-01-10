import { createAbstractStore } from "../store_engine";
import { InformationNotification } from "../types";

export interface NotificationStore {
  notifyUser: (notification: InformationNotification) => any;
  raiseError: (text: string, callback?: () => void) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
}
export const NotificationStore = createAbstractStore<NotificationStore>("Notifications");
