import { ClipboardMIMEType, OSClipboardContent } from "./../../types/clipboard";

export type ClipboardReadResult =
  | { status: "ok"; content: OSClipboardContent }
  | { status: "permissionDenied" | "notImplemented" };

export interface ClipboardInterface {
  write(clipboardContent: OSClipboardContent): Promise<void>;
  writeText(text: string): Promise<void>;
  read(): Promise<ClipboardReadResult>;
}

export function instantiateClipboard(): ClipboardInterface {
  return new WebClipboardWrapper(navigator.clipboard);
}

class WebClipboardWrapper implements ClipboardInterface {
  // Can be undefined because navigator.clipboard doesn't exist in old browsers
  constructor(private clipboard: Clipboard | undefined) {}

  async write(clipboardContent: OSClipboardContent): Promise<void> {
    if (this.clipboard?.write) {
      try {
        await this.clipboard?.write(this.getClipboardItems(clipboardContent));
      } catch (e) {
        /**
         * Some browsers do not support writing custom mimetypes in the clipboard.
         * Therefore, we try to catch any errors and fallback on writing only standard
         * mimetypes to prevent the whole copy action from crashing.
         */
        try {
          await this.clipboard?.write([
            new ClipboardItem({
              [ClipboardMIMEType.PlainText]: this.getBlob(
                clipboardContent,
                ClipboardMIMEType.PlainText
              ),
              [ClipboardMIMEType.Html]: this.getBlob(clipboardContent, ClipboardMIMEType.Html),
            }),
          ]);
        } catch (e) {}
      }
    } else {
      await this.writeText(clipboardContent[ClipboardMIMEType.PlainText] ?? "");
    }
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
    if (this.clipboard?.read) {
      try {
        const clipboardItems = await this.clipboard.read();
        const clipboardContent: OSClipboardContent = {};
        for (const item of clipboardItems) {
          for (const type of item.types) {
            // TODORAR read should work based on the type (if starts with, text, etc)
            const blob = await item.getType(type);
            if (type === ClipboardMIMEType.Png) {
              clipboardContent[type] = blob;
            } else {
              const text = await blob.text();
              clipboardContent[type] = text;
            }
          }
        }
        return { status: "ok", content: clipboardContent };
      } catch (e) {
        const status = permissionResult?.state === "denied" ? "permissionDenied" : "notImplemented";
        return { status };
      }
    } else {
      return {
        status: "ok",
        content: {
          [ClipboardMIMEType.PlainText]: await this.clipboard?.readText(),
        },
      };
    }
  }

  private getClipboardItems(content: OSClipboardContent): ClipboardItems {
    const clipboardItemData = {
      [ClipboardMIMEType.PlainText]: this.getBlob(content, ClipboardMIMEType.PlainText),
      [ClipboardMIMEType.Html]: this.getBlob(content, ClipboardMIMEType.Html),
      [ClipboardMIMEType.Png]: this.getBlob(content, ClipboardMIMEType.Png),
    };
    return [new ClipboardItem(clipboardItemData)];
  }

  private getBlob(clipboardContent: OSClipboardContent, type: ClipboardMIMEType): Blob {
    const content = clipboardContent[type];
    if (content instanceof Blob) {
      return content;
    }
    return new Blob([clipboardContent[type] || ""], {
      type,
    });
  }
}
