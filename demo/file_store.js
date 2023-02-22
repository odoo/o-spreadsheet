export class FileStore {
  serverUrl = "http://localhost:9090/upload-image";

  /**
   * Upload a file to the server to be saved. Returns the path of the file
   */
  async upload(file) {
    const fd = new FormData();
    fd.append("image", file /*, optional filename */);
    const res = await fetch(this.serverUrl, {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      return await res.text();
    } else {
      throw new Error(res.statusText);
    }
  }

  async delete(path) {
    console.warn("cannot delete file. Not implemented");
  }
}
