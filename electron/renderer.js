// Don't remove unused import
// organize-imports-ignore
import { currenciesData } from "../demo/currencies.js";
import { ElectronIpcFileStore } from "./electron_ipc_filestore.js";
import { geoJsonService } from "../demo/geo_json/geo_json_service.js";

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

let start;

class Demo extends Component {
  setup() {
    this.state = useState({ key: 0, displayHeader: false });
    this.stateUpdateMessages = [];
    this.client = {
      id: uuidGenerator.uuidv4(),
      name: "Local",
    };
    this.fileStore = new ElectronIpcFileStore();

    topbarMenuRegistry.addChild("display_header", ["view"], {
      name: () => (this.state.displayHeader ? "Hide header" : "Show header"),
      isReadonlyAllowed: true,
      execute: () => (this.state.displayHeader = !this.state.displayHeader),
      icon: "o-spreadsheet-Icon.DISPLAY_HEADER",
      sequence: 1000,
    });

    topbarMenuRegistry.addChild("new", ["file"], {
      name: "New Spreadsheet",
      sequence: 10,
      execute: async (env) => {
        this.createModel();
        stores.resetStores();
        this.state.key = this.state.key + 1;
      },
      icon: "o-spreadsheet-Icon.NEW_SPREADSHEET",
    });

    topbarMenuRegistry.addChild("xlsxImport", ["file"], {
      name: "Open XLSX",
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
          for (let i = 0; i < images.length; i++) {
            const blob = inputFiles[images[i]];
            const file = new File([blob], images[i].split("/").at(-1));
            const imageSrc = await this.fileStore.upload(file);
            inputFiles[images[i]] = { imageSrc };
          }
          await this.createModel(inputFiles);
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

    topbarMenuRegistry.addChild("xlsx", ["file"], {
      name: "Save as XLSX",
      sequence: 30,
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
    const stores = useStoreProvider();

    useExternalListener(window, "unhandledrejection", () => {
      this.notifyUser({
        text: "An unexpected error occurred. Open the developer console for details.",
        sticky: true,
        type: "warning",
      });
    });

    onWillStart(() => this.createModel());

    onMounted(() => console.log("Mounted: ", Date.now() - start));
    // onWillUnmount(this.leaveCollaborativeSession.bind(this));
    onError((error) => {
      console.error(error.cause || error);
      this.notifyUser({
        text: "An unexpected error occurred. Open the developer console for details.",
        sticky: true,
        type: "warning",
      });
    });
  }

  createModel(data) {
    this.model = new Model(data, {
      external: {
        loadCurrencies: async () => currenciesData,
        fileStore: this.fileStore,
        geoJsonService: geoJsonService,
      },
      custom: {},
      client: this.client,
      mode: "normal",
    });
    o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
    o_spreadsheet.__DEBUG__.model = this.model;
    // this.model.joinSession();
    this.activateFirstSheet();
  }

  activateFirstSheet() {
    const sheetId = this.model.getters.getActiveSheetId();
    const firstSheetId = this.model.getters.getSheetIds()[0];
    if (firstSheetId !== sheetId) {
      this.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo: firstSheetId });
    }
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

  const rootApp = new owl.App(Demo, { dev: false, warnIfNoStaticProps: true });
  rootApp.addTemplates(templates);
  rootApp.mount(document.body);
}

whenReady(setup);
