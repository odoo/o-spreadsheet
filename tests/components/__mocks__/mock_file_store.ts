import { FileStore as FileStoreInterface } from "../../../src/types/files";

export class FileStore implements FileStoreInterface {
  async upload(_file: File): Promise<string> {
    return "test_path";
  }
}
