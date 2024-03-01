import { FileStore as FileStoreInterface } from "../../src/types/files";
import { ImageMetadata } from "../../src/types/image";

export class FileStore implements FileStoreInterface {
  private fileId = 0;
  async upload(_file: File): Promise<{ metaData: ImageMetadata; path: string }> {
    return {
      path: `file/${this.fileId++}`,
      metaData: {},
    };
  }

  async delete() {}
}
