import { FileStore } from "../../src/types/files";

export class MockFileStore implements FileStore {
  private fileId = 0;
  async upload(_file: File): Promise<string> {
    return `file/${this.fileId++}`;
  }

  async getFile(fileUrl) {
    return new File([], "mock", { type: "image/png" });
  }
}
