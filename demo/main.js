import { demoData } from "./data.js";
import { WebsocketTransport } from "./transport.js";
owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;
const { useSubEnv } = owl.hooks;

const { Spreadsheet } = o_spreadsheet;
const { topbarMenuRegistry } = o_spreadsheet.registries;

topbarMenuRegistry.addChild("clear", ["file"], {
  name: "Clear & reload",
  sequence: 10,
  action: async (env) => {
    await fetch("http://localhost:9000/clear");
    document.location.reload();
  },
});

let start;

class App extends Component {
  constructor() {
    super();
    this.key = 1;
    this.data = demoData;
    // this.data = makeLargeDataset(20, 10_000);
    this.stateUpdateMessages = [];
  }

  async willStart() {
    this.transportService = new WebsocketTransport();
    try {
      const [history,] = await Promise.all([
        this.fetchHistory(),
        this.transportService.connect(),
      ]);
      this.stateUpdateMessages = history;
    } catch (error) {
      console.warn("Error while connecting to the collaborative server. Starting the spreadsheet without collaborative mode.", error);
      this.transportService = undefined;
      this.stateUpdateMessages = [];
    }
  }

  mounted() {
    console.log("Mounted: ", Date.now() - start);
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
      isReadonly="false"
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
