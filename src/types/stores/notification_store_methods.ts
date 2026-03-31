import { InformationNotification } from "../env";

export interface NotificationStoreMethods {
  notifyUser: (notification: InformationNotification) => void;
  raiseError: (text: string, callback?: () => void) => void;
  askConfirmation: (content: string, confirm: () => void, cancel?: () => void) => void;
}
