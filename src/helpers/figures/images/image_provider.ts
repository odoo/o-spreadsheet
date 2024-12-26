import { _t } from "../../../translation";
import { FigureSize } from "../../../types";
import { FileStore, ImageProviderInterface } from "../../../types/files";
import { Image } from "../../../types/image";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 mb

export class ImageImportError extends Error {}

export class ImageProvider implements ImageProviderInterface {
  private fileStore: FileStore;

  constructor(fileStore: FileStore) {
    this.fileStore = fileStore;
  }

  async requestImage(): Promise<Image> {
    const file = await this.userImageUpload();
    if (file.size > MAX_FILE_SIZE) {
      throw new ImageImportError(_t("The file you are trying to upload is too large (> 5 mB)"));
    }
    const path = await this.fileStore.upload(file);
    const size = await this.getImageOriginalSize(path);
    return { path, size, mimetype: file.type };
  }

  async uploadFile(file: File): Promise<Image> {
    if (file.size > MAX_FILE_SIZE) {
      throw new ImageImportError(_t("The file you are trying to upload is too large (> 5 mB)"));
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
        if (input.files === null || input.files.length != 1) {
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
      image.src = path;
      image.addEventListener("load", () => {
        const size = { width: image.width, height: image.height };
        resolve(size);
      });
      image.addEventListener("error", reject);
    });
  }
}
