// Don't remove unused import
// organize-imports-ignore
import { demoData, makeLargeDataset } from "./data.js";
import { currenciesData } from "./currencies.js";
import { WebsocketTransport } from "./transport.js";
import { FileStore } from "./file_store.js";

const {
  xml,
  Component,
  whenReady,
  useSubEnv,
  onWillStart,
  onMounted,
  useState,
  onWillUnmount,
  useExternalListener,
  onError,
} = owl;

const { Spreadsheet, Model } = o_spreadsheet;
const { topbarMenuRegistry } = o_spreadsheet.registries;

const uuidGenerator = new o_spreadsheet.helpers.UuidGenerator();

const tags = new Set();

const NOTIFICATION_STYLE =
  "position:absolute;\
  border:2px solid black;\
  background:#F5F5DCD5;\
  padding:20px;\
  z-index:10000;\
  width:140px;";

topbarMenuRegistry.addChild("clear", ["file"], {
  name: "Clear & reload",
  sequence: 10,
  action: async (env) => {
    await fetch("http://localhost:9090/clear");
    document.location.reload();
  },
});

topbarMenuRegistry.addChild("xlsx", ["file"], {
  name: "Save as XLSX",
  sequence: 20,
  action: async (env) => {
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
});

let start;

class Demo extends Component {
  setup() {
    this.state = useState({ key: 0 });
    this.stateUpdateMessages = [];
    this.client = {
      id: uuidGenerator.uuidv4(),
      name: "Local",
    };

    this.fileStore = new FileStore();
    topbarMenuRegistry.addChild("readonly", ["file"], {
      name: "Open in read-only",
      sequence: 11,
      action: () => this.model.updateMode("readonly"),
    });

    topbarMenuRegistry.addChild("dashboard", ["file"], {
      name: "Open in dashboard",
      sequence: 12,
      isReadonlyAllowed: true,
      action: () => this.model.updateMode("dashboard"),
    });

    topbarMenuRegistry.addChild("read_write", ["file"], {
      name: "Open with write access",
      sequence: 13,
      isReadonlyAllowed: true,
      action: () => this.model.updateMode("normal"),
    });

    topbarMenuRegistry.add("notify", {
      name: "Notify?",
      sequence: 1000,
      isReadonlyAllowed: true,
    });

    topbarMenuRegistry.addChild("fakenotify", ["notify"], {
      name: "click me",
      sequence: 13,
      isReadonlyAllowed: true,
      action: () => this.notifyUser({ text: "This is a notification", tag: "notif" }),
    });

    topbarMenuRegistry.addChild("xlsxImport", ["file"], {
      name: "Import XLSX",
      sequence: 25,
      action: async (env) => {
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
          const contents = await Promise.all(files.map((file) => zip.files[file].async("text")));
          const inputFiles = {};
          for (let i = 0; i < contents.length; i++) {
            inputFiles[files[i]] = contents[i];
          }
          this.leaveCollaborativeSession();
          await fetch("http://localhost:9090/clear");
          await this.initiateConnection(inputFiles);
          this.state.key = this.state.key + 1;

          // note : the onchange won't be called if we cancel the dialog w/o selecting a file, so this won't be called.
          // It's kinda annoying (or not possible?) to fire an event on close, so the hidden input will just stay there
          input.remove();
        });
        input.click();
      },
    });

    useSubEnv({
      notifyUser: this.notifyUser,
      raiseError: this.raiseError,
      askConfirmation: this.askConfirmation,
      editText: this.editText,
    });
    useExternalListener(window, "beforeunload", this.leaveCollaborativeSession.bind(this));

    onWillStart(() => this.initiateConnection());

    onMounted(() => console.log("Mounted: ", Date.now() - start));
    onWillUnmount(this.leaveCollaborativeSession.bind(this));
    onError((error) => {
      console.error(error);
      console.error(error.cause);
    });
  }

  async initiateConnection(data = undefined) {
    this.transportService = new WebsocketTransport();
    try {
      const [history, _] = await Promise.all([
        this.fetchHistory(),
        this.transportService.connect(),
      ]);
      this.stateUpdateMessages = history;
    } catch (error) {
      console.warn(
        "Error while connecting to the collaborative server. Starting the spreadsheet without collaborative mode.",
        error
      );
      this.transportService = undefined;
      this.stateUpdateMessages = [];
    }
    this.createModel(data || demoData);
    // this.createModel(makeLargeDataset(26, 10_000, ["numbers"]));
    // this.createModel({});
  }

  createModel(data) {
    this.model = new Model(
      data,
      {
        external: {
          loadCurrencies: async () => currenciesData,
          fileStore: this.fileStore,
        },
        custom: {},
        transportService: this.transportService,
        client: this.client,
        mode: "normal",
      },
      this.stateUpdateMessages
    );
    o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
    o_spreadsheet.__DEBUG__.model = this.model;
    this.model.joinSession();
    this.activateFirstSheet();
  }
  askConfirmation(content, confirm, cancel) {
    if (window.confirm(content)) {
      confirm();
    } else {
      cancel?.();
    }
  }

  activateFirstSheet() {
    const sheetId = this.model.getters.getActiveSheetId();
    const firstSheetId = this.model.getters.getSheetIds()[0];
    if (firstSheetId !== sheetId) {
      this.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo: firstSheetId });
    }
  }

  leaveCollaborativeSession() {
    this.model.leaveSession();
  }

  notifyUser(notification) {
    if (tags.has(notification.tag)) return;
    const div = document.createElement("div");
    const text = document.createTextNode(notification.text);
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

  raiseError(content, callback) {
    window.alert(content);
    callback?.();
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

  /**
   * Fetch the list of revisions of the server since the
   * start of the session.
   *
   * @returns {Promise}
   */
  async fetchHistory() {
    const result = await fetch("http://localhost:9090");
    return result.json();
  }
}

Demo.template = xml/* xml */ `
  <div>
    <Spreadsheet model="model" t-key="state.key"/>
  </div>`;
Demo.components = { Spreadsheet };

// Setup code
async function setup() {
  const templates = await (await fetch("../build/o_spreadsheet.xml")).text();
  start = Date.now();

  const rootApp = new owl.App(Demo);
  rootApp.addTemplates(templates);
  rootApp.mount(document.body, { dev: true });
}
whenReady(setup);
