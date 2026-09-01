import { Plugin } from "@odoo/owl";
import { spreadsheetEnvRegistry } from "../components/spreadsheet/spreadsheet_env_owl_plugin";
import { NotificationStoreMethods } from "../types/stores/notification_store_methods";

export class NotificationPlugin extends Plugin {
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

spreadsheetEnvRegistry.add("notificationPlugin", {
  owlPlugin: NotificationPlugin,
  envKeys: ["notifyUser", "askConfirmation", "raiseError"],
});
