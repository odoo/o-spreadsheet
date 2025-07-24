export class ElectronIpcFileStore {
  async upload(file) {
    alert("file upload" + file);
  }

  async delete(path) {
    alert("file deleting" + path);
  }

  async getFile(path) {
    alert("getFile " + path);
    const file = await window.electronAPI.openFile();
    console.log("file", file);
  }
}
