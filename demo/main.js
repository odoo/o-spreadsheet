import { demoData, makeLargeDataset } from "./data.js";
import { WebsocketTransport } from "./transport.js";

const { xml, Component, useState, whenReady, useSubEnv, onWillStart, onMounted, mount } = owl;

const { Spreadsheet } = o_spreadsheet;
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
    const doc = await env.exportXLSX();
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
    this.key = 1;
    this.data = demoData;
    // this.data = makeLargeDataset(20, 10_000, ["numbers"]);
    this.stateUpdateMessages = [];
    this.state = useState({ isReadonly: false });
    this.client = {
      id: uuidGenerator.uuidv4(),
      name: "Local",
    };

    topbarMenuRegistry.addChild("readonly", ["file"], {
      name: "Open in read-only",
      sequence: 11,
      action: async (env) => {
        this.state.isReadonly = true;
      },
    });

    topbarMenuRegistry.addChild("read_write", ["file"], {
      name: "Open with write access",
      sequence: 12,
      isReadonlyAllowed: true,
      action: async (env) => {
        this.state.isReadonly = false;
      },
    });

    useSubEnv({
      notifyUser: this.notifyUser,
      askConfirmation: this.askConfirmation,
      editText: this.editText,
    });

    onWillStart(() => this.initiateConnection());

    onMounted(() => console.log("Mounted: ", Date.now() - start));
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
  }

  askConfirmation(content, confirm, cancel) {
    if (window.confirm(content)) {
      confirm();
    } else {
      cancel();
    }
  }

  notifyUser(content) {
    window.alert(content);
  }

  editText(title, placeholder, callback) {
    const text = window.prompt(title, placeholder);
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
    <Spreadsheet data="data"
      t-key="key"
      stateUpdateMessages="stateUpdateMessages"
      transportService="transportService"
      isReadonly="state.isReadonly"
      client="client"/>
  </div>`;
Demo.components = { Spreadsheet };

// Setup code
function setup() {
  start = Date.now();
  mount(Demo, document.body, { dev: true });
}
whenReady(setup);
