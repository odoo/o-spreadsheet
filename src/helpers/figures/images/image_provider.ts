import { FigureSize } from "../../../types";
import { FileStore, ImageProviderInterface } from "../../../types/files";
import { Image } from "../../../types/image";

export class ImageProvider implements ImageProviderInterface {
  private fileStore: FileStore;

  constructor(fileStore: FileStore) {
    this.fileStore = fileStore;
  }

  async requestImage(): Promise<Image> {
    const file = await this.getImageFromUser();
    const { src, metaData } = await this.fileStore.upload(file);
    const size = await this.getImageOriginalSize(src);
    return { src, size, mimetype: file.type, metaData };
  }

  private getImageFromUser(): Promise<File> {
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

  getImageOriginalSize(src: string): Promise<FigureSize> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = src;
      image.addEventListener("load", () => {
        const size = { width: image.width, height: image.height };
        resolve(size);
      });
      image.addEventListener("error", reject);
    });
  }
}
