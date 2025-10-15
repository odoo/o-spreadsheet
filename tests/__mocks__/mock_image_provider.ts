import { FileStore, ImageProviderInterface } from "@odoo/o-spreadsheet-engine/types/files";
import { Image } from "@odoo/o-spreadsheet-engine/types/image";
import { FigureSize } from "../../src/types";

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

  async getImageOriginalSize(path: string): Promise<FigureSize> {
    return this.size;
  }

  async uploadFile(file: File | Blob): Promise<Image> {
    return { path: this.path, size: this.size, mimetype: this.mimetype };
  }
}
