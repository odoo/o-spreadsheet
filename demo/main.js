// Don't remove unused import
// organize-imports-ignore
import { demoData, makeLargeDataset } from "./data.js";
import { makePivotDataset } from "./pivot.js";
import { currenciesData } from "./currencies.js";
import { WebsocketTransport } from "./transport.js";
import { FileStore } from "./file_store.js";
import { geoJsonService } from "./geo_json/geo_json_service.js";

const {
  xml,
  Component,
  whenReady,
  onWillStart,
  onMounted,
  useState,
  onWillUnmount,
  useExternalListener,
  onError,
} = owl;

const { Spreadsheet, Model } = window.o_spreadsheet;
const { topbarMenuRegistry } = window.o_spreadsheet.registries;
const { useStoreProvider } = window.o_spreadsheet.stores;

const uuidGenerator = new o_spreadsheet.helpers.UuidGenerator();

const NOTIFICATION_STYLE =
  "position:absolute;\
  right:0px;\
  border:2px solid black;\
  background:#F5F5DCD5;\
  padding:20px;\
  z-index:10000;\
  width:140px;";

topbarMenuRegistry.addChild("reload", ["file"], {
  name: "Clear & reload demo",
  sequence: 10,
  execute: async (env) => {
    await fetch(`http://${window.location.hostname}:9090/clear`);
    document.location.reload();
  },
  icon: "o-spreadsheet-Icon.CLEAR_AND_RELOAD",
});

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

let start;

class Demo extends Component {
  setup() {
    this.state = useState({ key: 0, displayHeader: false });
    this.stateUpdateMessages = [];
    this.client = {
      id: uuidGenerator.uuidv4(),
      name: "Local",
    };
    this.fileStore = new FileStore();

    topbarMenuRegistry.addChild("clear", ["file"], {
      name: "Clear",
      sequence: 10.5,
      execute: async () => {
        stores.resetStores();
        this.leaveCollaborativeSession();
        await fetch(`http://${window.location.hostname}:9090/clear`);
        await this.initiateConnection({});
        this.state.key = this.state.key + 1;
      },
      icon: "o-spreadsheet-Icon.CLEAR_AND_RELOAD",
    });

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

    topbarMenuRegistry.addChild("display_header", ["view"], {
      name: () => (this.state.displayHeader ? "Hide header" : "Show header"),
      isReadonlyAllowed: true,
      execute: () => (this.state.displayHeader = !this.state.displayHeader),
      icon: "o-spreadsheet-Icon.DISPLAY_HEADER",
      sequence: 1000,
    });

    topbarMenuRegistry.add("notify", {
      name: "Dummy notifications",
      sequence: 1000,
      isReadonlyAllowed: true,
    });

    topbarMenuRegistry.addChild("fake_notify_sticky", ["notify"], {
      name: "fake notify (sticky)",
      sequence: 13,
      isReadonlyAllowed: true,
      execute: () =>
        this.notifyUser({
          text: "I'm a sticky notification ! You want me to leave ? COME FIGHT WITH ME !!!",
          sticky: true,
          type: "warning",
        }),
    });

    topbarMenuRegistry.addChild("fake_notify_no_sticky", ["notify"], {
      name: "fake notify (no sticky)",
      sequence: 14,
      isReadonlyAllowed: true,
      execute: () =>
        this.notifyUser({
          text: "I'm not a sticky notification, Just a simple notification. So... CiaoByeBye, see you in another universe...",
          sticky: false,
          type: "warning",
        }),
    });

    topbarMenuRegistry.addChild("throw error", ["notify"], {
      name: "Uncaught error",
      sequence: 11,
      execute: () => a / 0,
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
          stores.resetStores();
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

    useExternalListener(window, "beforeunload", this.leaveCollaborativeSession.bind(this));
    useExternalListener(window, "unhandledrejection", this.notifyError.bind(this));
    useExternalListener(window, "error", this.notifyError.bind(this));

    onWillStart(() => this.initiateConnection());

    onMounted(() => console.log("Mounted: ", Date.now() - start));
    onWillUnmount(this.leaveCollaborativeSession.bind(this));
    onError((error) => {
      console.error(error.cause || error);
      this.notifyError();
    });
  }

  notifyError() {
    this.notifyUser({
      text: "An unexpected error occurred. Open the developer console for details.",
      sticky: true,
      type: "warning",
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
    // this.createModel(makePivotDataset(10_000));
    // this.createModel(makeLargeDataset(26, 10_000, ["numbers"]));
    // this.createModel(makeLargeDataset(26, 10_000, ["formulas"]));
    // this.createModel(makeLargeDataset(26, 10_000, ["arrayFormulas"]));
    // this.createModel(makeLargeDataset(26, 10_000, ["vectorizedFormulas"]));
    // this.createModel({});
  }

  createModel(data) {
    this.model = new Model(
      data,
      {
        external: {
          loadCurrencies: async () => currenciesData,
          fileStore: this.fileStore,
          geoJsonService: geoJsonService,
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
    const div = document.createElement("div");
    const text = document.createTextNode(notification.text);
    div.appendChild(text);
    div.style = NOTIFICATION_STYLE;
    const element = document.querySelector(".o-spreadsheet") || document.body; // if we crash on launch, the spreadsheet is not mounted yet
    div.onclick = () => {
      element.removeChild(div);
    };
    element.appendChild(div);

    if (!notification.sticky) {
      setTimeout(() => {
        if (document.body.contains(div)) {
          element.removeChild(div);
        }
      }, 5000);
    }
  }

  /**
   * Fetch the list of revisions of the server since the
   * start of the session.
   *
   * @returns {Promise}
   */
  async fetchHistory() {
    const result = await fetch(`http://${window.location.hostname}:9090`);
    return result.json();
  }
}

Demo.template = xml/* xml */ `
  <div t-if="state.displayHeader" class="d-flex flex flex-column justify-content">
    <div class="p-3 border-bottom">A header</div>
    <div class="flex-fill" style="height: 100dvh !important;width: 100dvw !important;">
      <Spreadsheet model="model" notifyUser="notifyUser" t-key="state.key"/>
    </div>
  </div>
  <div t-else="" style="height: 100dvh !important;width: 100dvw !important;">
    <Spreadsheet model="model" t-key="state.key" notifyUser="notifyUser"/>
  </div>
`;
Demo.components = { Spreadsheet };
Demo.props = {};

// Setup code
async function setup() {
  const templates = await (await fetch("../build/o_spreadsheet.xml")).text();
  start = Date.now();

  const rootApp = new owl.App(Demo, { dev: true, warnIfNoStaticProps: true });
  rootApp.addTemplates(templates);
  rootApp.mount(document.body);
}

whenReady(setup);
