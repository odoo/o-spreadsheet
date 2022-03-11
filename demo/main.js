import { demoData, makeLargeDataset } from "./data.js";
import { WebsocketTransport } from "./transport.js";

const {
  xml,
  Component,
  whenReady,
  useSubEnv,
  onWillStart,
  onMounted,
  mount,
  onWillUnmount,
  useExternalListener,
} = owl;

const { Spreadsheet, Model } = o_spreadsheet;
const { topbarMenuRegistry } = o_spreadsheet.registries;

const uuidGenerator = new o_spreadsheet.helpers.UuidGenerator();

topbarMenuRegistry.addChild("clear", ["file"], {
  name: "Clear & reload",
  sequence: 10,
  action: async (env) => {
    await fetch("http://localhost:9000/clear");
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
      zip.file(file.path, file.content.replaceAll(` xmlns=""`, ""));
    }
    zip.generateAsync({ type: "blob" }).then(function (blob) {
      saveAs(blob, doc.name);
    });
  },
});

let start;

class Demo extends Component {
  setup() {
    this.stateUpdateMessages = [];
    this.client = {
      id: uuidGenerator.uuidv4(),
      name: "Local",
    };

    topbarMenuRegistry.addChild("readonly", ["file"], {
      name: "Open in read-only",
      sequence: 11,
      action: async (env) => {
        this.model.updateReadOnly(true);
      },
    });

    topbarMenuRegistry.addChild("read_write", ["file"], {
      name: "Open with write access",
      sequence: 12,
      isReadonlyAllowed: true,
      action: async (env) => {
        this.model.updateReadOnly(false);
      },
    });

    useSubEnv({
      notifyUser: this.notifyUser,
      askConfirmation: this.askConfirmation,
      editText: this.editText,
    });
    useExternalListener(window, "beforeunload", this.leaveCollaborativeSession.bind(this));

    onWillStart(() => this.initiateConnection());

    onMounted(() => console.log("Mounted: ", Date.now() - start));
    onWillUnmount(this.leaveCollaborativeSession.bind(this));
  }

  async initiateConnection() {
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
    this.model = new Model(
      // demoData,
      makeLargeDataset(26, 10_000, ["formulas"]),
      {
        evalContext: { env: this.env },
        transportService: this.transportService,
        client: this.client,
        isReadonly: false,
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
      cancel();
    }
  }

  activateFirstSheet() {
    const sheetId = this.model.getters.getActiveSheetId();
    const [firstSheet] = this.model.getters.getSheets();
    if (firstSheet.id !== sheetId) {
      this.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo: firstSheet.id });
    }
  }

  leaveCollaborativeSession() {
    this.model.leaveSession();
  }

  notifyUser(content) {
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

  /**
   * Fetch the list of revisions of the server since the
   * start of the session.
   *
   * @returns {Promise}
   */
  async fetchHistory() {
    const result = await fetch("http://localhost:9000");
    return result.json();
  }
}

Demo.template = xml/* xml */ `
  <div>
    <Spreadsheet model="model"/>
  </div>`;
Demo.components = { Spreadsheet };

// Setup code
function setup() {
  start = Date.now();
  mount(Demo, document.body, { dev: true });
}
whenReady(setup);
