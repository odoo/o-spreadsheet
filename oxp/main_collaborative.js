import { SERVER_ADDRESS, WebsocketTransport } from "./transport.js";
import { savedFile } from "./savedFile.js";
import * as interactions from "./interactions.js";

const { xml, Component, useSubEnv, onWillStart, onWillUnmount, useExternalListener } = owl;
const { Spreadsheet, Model, helpers } = o_spreadsheet;

class Demo extends Component {
  static template = xml/* xml */ `<Spreadsheet model="model" />`;
  static components = { Spreadsheet };

  setup() {
    useSubEnv({ ...interactions });
    onWillStart(this.initiateConnection);
    onWillUnmount(() => this.model.leaveSession());
    useExternalListener(window, "beforeunload", () => this.model.leaveSession());
  }

  async initiateConnection() {
    const transportService = new WebsocketTransport();
    const [existingHistory, _] = await Promise.all([
      fetch(SERVER_ADDRESS), // receive the existing history
      transportService.connect(), // start receiving live updates
    ]);
    const existingHistoryJson = await existingHistory.json();
    this.model = new Model(
      savedFile,
      {
        transportService,
        client: this.generateClientIdName(),
      },
      existingHistoryJson
    );
  }

  generateClientIdName() {
    const id = new helpers.UuidGenerator().uuidv4();
    return {
      id,
      name: "Local (" + id.substr(0, 8) + ")",
    };
  }
}

// Setup code
const templates = await (await fetch("../dist/o_spreadsheet.xml")).text();
const rootApp = new owl.App(Demo);
rootApp.addTemplates(templates);
rootApp.mount(document.body);
