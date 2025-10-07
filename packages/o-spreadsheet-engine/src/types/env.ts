export interface EditTextOptions {
  error?: string;
  placeholder?: string;
}

export type NotificationType = "danger" | "info" | "success" | "warning";

export interface InformationNotification {
  text: string;
  type: NotificationType;
  sticky: boolean;
}
