import { FigureSize } from "./figure";
import { Image } from "./image";

type FilePath = string;

/**
 * FileStore manage the transfer of file with the server.
 */
export interface FileStore {
  /**
   * Upload a file to a server and returns its path.
   */
  upload(file: File): Promise<FilePath>;

  /**
   * Delete a file from the server
   */
  delete(filePath: FilePath): Promise<void>;
}

/**
 * ImageProvider can request the user to input an image file before sending it to a server.
 */
export interface ImageProviderInterface {
  /**
   * RequestImage ask the user to input an image file. Then send it to a server trough an FileStore. Finally it return the path and the size of the image in the server.
   */
  requestImage(): Promise<Image>;
  getImageOriginalSize(path: string): Promise<FigureSize>;
}
