const { xml, whenReady, useListener } = owl;
const { Spreadsheet, Model, compatibility } = o_spreadsheet;

const { topbarMenuRegistry } = o_spreadsheet.registries;
const { App, Component } = compatibility;

const LAST_SAVED_KEY = "lastSavedFileName";

class Demo extends Component {
  setup() {
    this.createModel();
    useListener(window, "beforeunload", this.closeFile.bind(this));
    topbarMenuRegistry.addChild("xlsx_save", ["file"], {
      name: "Save XLSX",
      sequence: 20,
      execute: async (env) => {
        const doc = await env.model().exportXLSX();
        const zip = new JSZip();
        for (const file of doc.files) {
          if (file.imageSrc) {
            const fetchedImage = await fetch(file.imageSrc).then((response) => response.blob());
            zip.file(file.path, fetchedImage);
          } else {
            zip.file(file.path, file.content.replaceAll(` xmlns=""`, ""));
          }
        }
        zip.generateAsync({ type: "blob" }).then(async (blob) => {
          await this.overwrite(blob);
        });
      },
      icon: "o-spreadsheet-Icon.EXPORT_XLSX",
      isEnabledOnLockedSheet: true,
    });
    topbarMenuRegistry.addChild("xlsx_save_as", ["file"], {
      name: "Save as XLSX",
      sequence: 20,
      execute: async (env) => {
        const doc = await env.model().exportXLSX();
        const zip = new JSZip();
        for (const file of doc.files) {
          if (file.imageSrc) {
            const fetchedImage = await fetch(file.imageSrc).then((response) => response.blob());
            zip.file(file.path, fetchedImage);
          } else {
            zip.file(file.path, file.content.replaceAll(` xmlns=""`, ""));
          }
        }
        zip.generateAsync({ type: "blob" }).then(async (blob) => {
          await this.saveAs(blob, doc.name);
        });
      },
      icon: "o-spreadsheet-Icon.EXPORT_XLSX",
      isEnabledOnLockedSheet: true,
    });
    this.writableStream = undefined;
    this.fileHandle = window.localStorage.getItem(LAST_SAVED_KEY); // TODO: is not saved serialized
    // debugger;
    // if  (this.fileHandle) {
    //   const permissionOptions= {mode:"readwrite"};
    //   if (!this.fileHandle.queryPermission(permissionOptions)) {
    //     this.fileHandle.requestPermission(permissionOptions);
    //   }
    // }
  }

  async closeFile() {
    if (this.writableStream) {
      try {
        this.writableStream.close();
      } catch (error) {
        console.error(error);
        return "Could not save file";
      }
    }
  }

  async saveAs(content, fileName) {
    console.log(`saving ${fileName}`);
    if (!fileName) {
      fileName = `${new Date().toLocaleDateString().replaceAll("/", "-")}.xlsx`;
    }
    if (!fileName.endsWith(".xlsx")) {
      fileName += ".xlsx";
    }
    try {
      // create a new handle
      const newHandle = await window.showSaveFilePicker({
        startIn: "documents",
        suggestedName: fileName,
        types: [{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }],
      });

      // create a FileSystemWritableFileStream to write to
      this.writableStream = await newHandle.createWritable();

      // write our file by replacing its content
      await this.writableStream.write({ type: "write", position: 0, data: content });

      window.localStorage.setItem(LAST_SAVED_KEY, newHandle); // TODO: does not serialize
    } catch (error) {
      if (error?.name === "AbortError") {
        console.log("saving cancelled by user");
        return;
      }
      console.error(error);
    }
  }

  async overwrite(content) {
    // write our file by replacing its content
    await this.writableStream.write({ type: "write", position: 0, data: content });
  }

  createModel() {
    const startingSpreadsheet = {
      sheets: [
        {
          colNumber: 26,
          rowNumber: 2000,
          cells: {
            A1: "hello 👋",
            A2: "I am a cell",
            A3: "I behave like in other spreadsheet applications",
            A4: "I can contain formulas like =SUM(D1:D3) ------->",
            D4: "=SUM(D1:D3)",
            D1: "1",
            D2: "2",
            D3: "3",
          },
        },
      ],
    };

    this.model = new Model(startingSpreadsheet, {
      mode: "normal",
    });
    o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
    o_spreadsheet.__DEBUG__.model = this.model;
  }
}

Demo.template = xml/* xml */ `
<div class="vw-100 vh-100">
  <Spreadsheet model="this.model"/>
</div>
`;
Demo.components = { Spreadsheet };
Demo.props = {};

async function setup() {
  const templates = await (await fetch("../build/o_spreadsheet.xml")).text();

  const app = new App({ dev: true, templates });
  const root = app.createRoot(Demo);
  root.mount(document.body);
}

whenReady(setup);
