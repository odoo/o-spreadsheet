import { demoData } from "./data.js";
import { WebsocketTransport } from "./transport.js";
owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;
const { useSubEnv } = owl.hooks;

const Spreadsheet = o_spreadsheet.Spreadsheet;

let start;

class App extends Component {
  constructor() {
    super();
    this.key = 1;
    this.transportService = new WebsocketTransport();
    useSubEnv({
      save: this.save.bind(this),
    });
    this.data = demoData;
    // this.data = makeLargeDataset(20, 10_000);
    this.stateUpdateMessages = [];
  }

  async willStart() {
    /**
     * This fetch is used to get the list of revisions of the server since the
     * start of the session.
     */
    const result = await fetch("http://localhost:9000");
    this.stateUpdateMessages = await result.json();
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
}

App.template = xml/* xml */ `
  <div>
    <Spreadsheet data="data"
      t-key="key"
      stateUpdateMessages="stateUpdateMessages"
      transportService="transportService"
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
