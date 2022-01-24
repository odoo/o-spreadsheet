import { demoData } from "./data.js";
import { currenciesData } from "./currencies.js";
import { WebsocketTransport } from "./transport.js";
owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component, useState } = owl;
const { xml, css } = owl.tags;
const { useSubEnv, onWillStart, onMounted } = owl.hooks;

const { Spreadsheet } = o_spreadsheet;
const { topbarMenuRegistry, currenciesRegistry } = o_spreadsheet.registries;

const uuidGenerator = new o_spreadsheet.helpers.UuidGenerator();

currenciesData.forEach((currency, index) => {
  currenciesRegistry.add(index, currency);
});

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

class App extends Component {
  setup() {
    this.key = 1;
    this.data = demoData;
    // this.data = makeLargeDataset(20, 10_000);
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

  askConfirmation(ev) {
    if (window.confirm(ev.detail.content)) {
      ev.detail.confirm();
    } else {
      ev.detail.cancel();
    }
  }

  notifyUser(ev) {
    window.alert(ev.detail.content);
  }

  editText(ev) {
    const text = window.prompt(ev.detail.title, ev.detail.placeholder);
    ev.detail.callback(text);
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

App.template = xml/* xml */ `
  <div>
    <Spreadsheet data="data"
      t-key="key"
      stateUpdateMessages="stateUpdateMessages"
      transportService="transportService"
      isReadonly="state.isReadonly"
      client="client"
      t-on-ask-confirmation="askConfirmation"
      t-on-notify-user="notifyUser"
      t-on-edit-text="editText"/>
  </div>`;
App.style = css/* scss */ `
  html {
    height: 100%;
    body {
      height: 100%;
      margin: 0px;
    }
    .o-spreadsheet {
      width: 100%;
      height: 100%;
    }
  }
`;
App.components = { Spreadsheet };

// Setup code
function setup() {
  start = Date.now();
  const app = new App();

  app.mount(document.body);
}
whenReady(setup);
