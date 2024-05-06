import { demoData } from "./data.js";
import { currenciesData } from "./currencies.js";

const { xml, Component, whenReady, useSubEnv, useState } = owl;

const { Spreadsheet, Model } = o_spreadsheet;
const { topbarMenuRegistry } = o_spreadsheet.registries;

const { useStoreProvider, NotificationStore } = o_spreadsheet.stores;

const tags = new Set();

const NOTIFICATION_STYLE =
  "position:absolute;\
  border:2px solid black;\
  background:#F5F5DCD5;\
  padding:20px;\
  z-index:10000;\
  width:140px;";

topbarMenuRegistry.addChild("xlsx", ["file"], {
  name: "Save as XLSX",
  sequence: 20,
  execute: async (env) => {
    const doc = await env.model.exportXLSX();
    const zip = new JSZip();
    for (const file of doc.files) {
      if (file.imageSrc) {
        const fetchedImage = await fetch(file.imageSrc).then((response) => response.blob());
        zip.file(file.path, fetchedImage);
      } else {
        zip.file(file.path, file.content.replaceAll(` xmlns=""`, ""));
      }
    }
    zip.generateAsync({ type: "blob" }).then(function (blob) {
      saveAs(blob, doc.name);
    });
  },
  icon: "o-spreadsheet-Icon.EXPORT_XLSX",
});

class Demo extends Component {
  setup() {
    this.state = useState({ key: 0 });

    topbarMenuRegistry.addChild("readonly", ["file"], {
      name: "Open in read-only",
      sequence: 11,
      isVisible: () => this.model.config.mode !== "readonly",
      execute: () => this.model.updateMode("readonly"),
      icon: "o-spreadsheet-Icon.OPEN_READ_ONLY",
    });

    topbarMenuRegistry.addChild("dashboard", ["file"], {
      name: "Open in dashboard",
      sequence: 12,
      isReadonlyAllowed: true,
      isVisible: () => this.model.config.mode !== "dashboard",
      execute: () => this.model.updateMode("dashboard"),
      icon: "o-spreadsheet-Icon.OPEN_DASHBOARD",
    });

    topbarMenuRegistry.addChild("read_write", ["file"], {
      name: "Open with write access",
      sequence: 13,
      isReadonlyAllowed: true,
      isVisible: () => this.model.config.mode !== "normal",
      execute: () => this.model.updateMode("normal"),
      icon: "o-spreadsheet-Icon.OPEN_READ_WRITE",
    });

    topbarMenuRegistry.addChild("xlsxImport", ["file"], {
      name: "Import XLSX",
      sequence: 25,
      execute: async (env) => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("style", "display: none");
        document.body.appendChild(input);
        input.addEventListener("change", async () => {
          if (input.files.length <= 0) {
            return false;
          }
          const myjszip = new JSZip();
          const zip = await myjszip.loadAsync(input.files[0]);
          const files = Object.keys(zip.files);
          const images = [];
          const contents = await Promise.all(
            files.map((file) => {
              if (file.includes("media/image")) {
                images.push(file);
                return zip.files[file].async("blob");
              }
              return zip.files[file].async("text");
            })
          );
          const inputFiles = {};
          for (let i = 0; i < contents.length; i++) {
            inputFiles[files[i]] = contents[i];
          }
          this.leaveCollaborativeSession();
          await fetch("http://localhost:9090/clear");
          for (let i = 0; i < images.length; i++) {
            const blob = inputFiles[images[i]];
            const file = new File([blob], images[i].split("/").at(-1));
            const imageSrc = await this.fileStore.upload(file);
            inputFiles[images[i]] = { imageSrc };
          }
          await this.initiateConnection(inputFiles);
          this.state.key = this.state.key + 1;

          // note : the onchange won't be called if we cancel the dialog w/o selecting a file, so this won't be called.
          // It's kinda annoying (or not possible?) to fire an event on close, so the hidden input will just stay there
          input.remove();
        });
        input.click();
      },
      icon: "o-spreadsheet-Icon.IMPORT_XLSX",
    });
    const stores = useStoreProvider();
    stores.inject(NotificationStore, {
      notifyUser: this.notifyUser,
      raiseError: this.raiseError,
      askConfirmation: this.askConfirmation,
    });
    useSubEnv({
      notifyUser: this.notifyUser,
      raiseError: this.raiseError,
      askConfirmation: this.askConfirmation,
      editText: this.editText,
      loadCurrencies: async () => {
        return currenciesData;
      },
    });

    this.model = new Model(demoData, {
      evalContext: { env: this.env },
      mode: "normal",
    });
    o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
    o_spreadsheet.__DEBUG__.model = this.model;
  }

  askConfirmation(content, confirm, cancel) {
    if (window.confirm(content)) {
      confirm();
    } else {
      cancel();
    }
  }

  notifyUser(notification) {
    if (tags.has(notification.tag)) return;
    var div = document.createElement("div");
    var text = document.createTextNode(notification.text);
    div.appendChild(text);
    div.style = NOTIFICATION_STYLE;
    const element = document.querySelector(".o-spreadsheet");
    div.onclick = () => {
      tags.delete(notification.tag);
      element.removeChild(div);
    };
    element.appendChild(div);
    tags.add(notification.tag);
  }

  raiseError(content) {
    window.alert(content);
  }

  editText(title, callback, options = {}) {
    let text;
    if (!options.error) {
      text = window.prompt(title, options.placeholder);
    } else {
      text = window.prompt(options.error, options.placeholder);
    }
    callback(text);
  }
}

Demo.template = xml/* xml */ `
  <div>
    <Spreadsheet model="model" t-key="state.key"/>
  </div>`;
Demo.components = { Spreadsheet };

// Setup code
async function setup() {
  const templates = await (await fetch("o_spreadsheet.xml")).text();
  const rootApp = new owl.App(Demo);
  rootApp.addTemplates(templates);
  rootApp.mount(document.body, { dev: true });
}
whenReady(setup);
