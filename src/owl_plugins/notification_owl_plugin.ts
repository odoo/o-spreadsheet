import { Plugin } from "@odoo/owl";
import { NotificationCallbacks } from "../types/stores/notification_store_methods";

export class NotificationPlugin extends Plugin {
  notifyUser: NotificationCallbacks["notifyUser"] = (notification) =>
    window.alert(notification.text);
  askConfirmation: NotificationCallbacks["askConfirmation"] = (content, confirm, cancel) => {
    if (window.confirm(content)) {
      confirm();
    } else {
      cancel?.();
    }
  };
  raiseError: NotificationCallbacks["raiseError"] = (text, callback) => {
    window.alert(text);
    callback?.();
  };

  updateNotificationCallbacks(methods: Partial<NotificationCallbacks>) {
    this.notifyUser = methods.notifyUser || this.notifyUser;
    this.raiseError = methods.raiseError || this.raiseError;
    this.askConfirmation = methods.askConfirmation || this.askConfirmation;
  }
}
