import { Plugin, useConfig } from "@odoo/owl";
import { FigureSize } from "../../../types/figure";
import { FileStore, ImageProviderInterface } from "../../../types/files";
import { type Image } from "../../../types/image";

export class ImageProviderPlugin extends Plugin implements ImageProviderInterface {
  // FIXME OWL3: use this.model.config.external.fileStore directly once we have a model plugin
  private fileStore: FileStore | undefined = useConfig("fileStore");

  get canUseImageProvider(): boolean {
    return !!this.fileStore;
  }

  async requestImage(): Promise<Image> {
    if (!this.fileStore) {
      throw new Error("FileStore is not available");
    }
    const file = await this.userImageUpload();
    const path = await this.fileStore.upload(file);
    const size = await this.getImageOriginalSize(path);
    return { path, size, mimetype: file.type };
  }

  async uploadFile(file: File | Blob): Promise<Image> {
    if (!this.fileStore) {
      throw new Error("FileStore is not available");
    }

    const path = await this.fileStore.upload(file);
    const size = await this.getImageOriginalSize(path);
    return { path, size, mimetype: file.type };
  }

  private userImageUpload(): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.addEventListener("change", async () => {
        if (input.files === null || input.files.length !== 1) {
          reject();
        } else {
          resolve(input.files[0]);
        }
      });
      input.click();
    });
  }

  getImageOriginalSize(path: string): Promise<FigureSize> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => {
        const size = { width: image.width, height: image.height };
        resolve(size);
      });
      image.addEventListener("error", reject);
      image.src = path;
    });
  }
}
