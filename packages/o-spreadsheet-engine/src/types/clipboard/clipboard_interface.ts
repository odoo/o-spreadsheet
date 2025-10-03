import { OSClipboardContent } from "../clipboard";

export type ClipboardReadResult =
  | { status: "ok"; content: OSClipboardContent }
  | { status: "permissionDenied" | "notImplemented" };

export interface ClipboardInterface {
  write(clipboardContent: OSClipboardContent): Promise<void>;
  writeText(text: string): Promise<void>;
  read(): Promise<ClipboardReadResult>;
}
