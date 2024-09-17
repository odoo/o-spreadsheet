import { FileStore as FileStoreInterface } from "../../src/types/files";

export class FileStore implements FileStoreInterface {
  private fileId = 0;
  async upload(_file: File): Promise<string> {
    return `file/${this.fileId++}`;
  }

  async delete() {}
}
