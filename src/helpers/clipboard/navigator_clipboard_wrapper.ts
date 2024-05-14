import { ClipboardContent, ClipboardMIMEType } from "./../../types/clipboard";

export type ClipboardResult<T> = {
  status: "ok" | "permissionDenied" | "notImplemented";
  content: T | undefined;
};

export type ClipboardReadResult = ClipboardResult<ClipboardContent>;

export type ClipboardReadTextResult = ClipboardResult<string>;

export interface ClipboardInterface {
  isWriteSupported(): boolean;
  write(clipboardContent: ClipboardContent): Promise<void>;
  writeText(text: string): Promise<void>;
  read(): Promise<ClipboardReadResult>;
  readText(): Promise<ClipboardReadTextResult>;
}

export function instantiateClipboard(): ClipboardInterface | undefined {
  if (!navigator.clipboard) {
    /** If browser's navigator.clipboard is not defined or if the write
     * method is not supported in the browser's navigator.clipboard, we
     * do not instantiate the env clipboard to be able to later check in
     * the grid if we can copy/paste with it.
     */
    return undefined;
  }
  return new WebClipboardWrapper(navigator.clipboard);
}

class WebClipboardWrapper implements ClipboardInterface {
  // Can be undefined because navigator.clipboard doesn't exist in old browsers
  constructor(private clipboard: Clipboard | undefined) {}

  isWriteSupported(): boolean {
    return this.clipboard?.write ? true : false;
  }

  async write(clipboardContent: ClipboardContent): Promise<void> {
    try {
      this.clipboard?.write(this.getClipboardItems(clipboardContent));
    } catch (e) {}
  }

  async writeText(text: string): Promise<void> {
    try {
      this.clipboard?.writeText(text);
    } catch (e) {}
  }

  async read(): Promise<ClipboardReadResult> {
    let permissionResult: PermissionStatus | undefined = undefined;
    try {
      //@ts-ignore - clipboard-read is not implemented in all browsers
      permissionResult = await navigator.permissions.query({ name: "clipboard-read" });
    } catch (e) {}
    try {
      const clipboardItems = await this.clipboard!.read();
      const clipboardContent: ClipboardContent = {};
      for (const item of clipboardItems) {
        for (const type of item.types) {
          const blob = await item.getType(type);
          const text = await blob.text();
          clipboardContent[type as ClipboardMIMEType] = text;
        }
      }
      return { status: "ok", content: clipboardContent };
    } catch (e) {
      const status = permissionResult?.state === "denied" ? "permissionDenied" : "notImplemented";
      return {
        status: status,
        content: undefined,
      };
    }
  }

  async readText(): Promise<ClipboardReadTextResult> {
    let permissionResult: PermissionStatus | undefined = undefined;
    try {
      //@ts-ignore - clipboard-read is not implemented in all browsers
      permissionResult = await navigator.permissions.query({ name: "clipboard-read" });
    } catch (e) {}
    try {
      const clipboardTextContent = await this.clipboard!.readText();
      return { status: "ok", content: clipboardTextContent };
    } catch (e) {
      const status = permissionResult?.state === "denied" ? "permissionDenied" : "notImplemented";
      return {
        status: status,
        content: undefined,
      };
    }
  }

  private getClipboardItems(content: ClipboardContent): ClipboardItems {
    return [
      new ClipboardItem({
        [ClipboardMIMEType.PlainText]: this.getBlob(content, ClipboardMIMEType.PlainText),
        [ClipboardMIMEType.Html]: this.getBlob(content, ClipboardMIMEType.Html),
        [ClipboardMIMEType.OSpreadsheet]: this.getBlob(content, ClipboardMIMEType.OSpreadsheet),
      }),
    ];
  }

  private getBlob(clipboardContent: ClipboardContent, type: ClipboardMIMEType): Blob {
    return new Blob([clipboardContent[type] || ""], {
      type,
    });
  }
}
