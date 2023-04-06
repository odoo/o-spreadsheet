import { FileStore, ImageProviderInterface } from "../../../src/types/files";
import { Image } from "../../../src/types/image";

export class ImageProvider implements ImageProviderInterface {
  private path = "https://sorrygooglesheet.com/icon-picture";
  private size = {
    width: 1443,
    height: 2168,
  };
  private mimetype = "image/jpeg";

  constructor(_fileStore: FileStore) {}

  async requestImage(): Promise<Image> {
    return { path: this.path, size: this.size, mimetype: this.mimetype };
  }
}
