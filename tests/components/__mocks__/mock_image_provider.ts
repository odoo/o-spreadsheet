import { FigureSize } from "../../../src/types";
import { FileStore, ImageProviderInterface } from "../../../src/types/files";

export class ImageProvider implements ImageProviderInterface {
  private path = "https://sorrygooglesheet.com/icon-picture";
  private size = {
    width: 1443,
    height: 2168,
  };

  constructor(_fileStore: FileStore) {}

  async requestImage(): Promise<{ path: string; size: FigureSize }> {
    return { path: this.path, size: this.size };
  }
}
