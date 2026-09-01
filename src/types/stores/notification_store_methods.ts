import { InformationNotification } from "../env";

export interface NotificationCallbacks {
  notifyUser: (notification: InformationNotification) => void;
  raiseError: (text: string, callback?: () => void) => void;
  askConfirmation: (content: string, confirm: () => void, cancel?: () => void) => void;
}
