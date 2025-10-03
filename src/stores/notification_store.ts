import { NotificationStoreMethods } from "@odoo/o-spreadsheet-engine/types/stores/notification_store_methods";

export class NotificationStore {
  mutators = [
    "notifyUser",
    "raiseError",
    "askConfirmation",
    "updateNotificationCallbacks",
  ] as const;
  notifyUser: NotificationStoreMethods["notifyUser"] = (notification) =>
    window.alert(notification.text);
  askConfirmation: NotificationStoreMethods["askConfirmation"] = (content, confirm, cancel) => {
    if (window.confirm(content)) {
      confirm();
    } else {
      cancel?.();
    }
  };
  raiseError: NotificationStoreMethods["raiseError"] = (text, callback) => {
    window.alert(text);
    callback?.();
  };

  updateNotificationCallbacks(methods: Partial<NotificationStoreMethods>) {
    this.notifyUser = methods.notifyUser || this.notifyUser;
    this.raiseError = methods.raiseError || this.raiseError;
    this.askConfirmation = methods.askConfirmation || this.askConfirmation;
  }
}
