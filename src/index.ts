import { App, Component, whenReady, xml } from "@odoo/owl";
import { SpreadsheetEngine } from "./engine/SpreadsheetEngine";

export class SpreadsheetUI extends Component {
  setup() {
    console.log("SpreadsheetUI initialized");
  }
  method() {
    console.log("SpreadsheetUI method called");
  }
}

export class SpreadsheetApp extends Component {
  static components = { SpreadsheetUI };
  static template = xml`<div>
        <h1>Spreadsheet Application</h1>
        <SpreadsheetUI/>
    </div>`;
  private engine: SpreadsheetEngine = new SpreadsheetEngine();
  setup() {
    console.log("SpreadsheetApp initialized");
    this.engine.method();
  }
}

async function setup() {
  // Initialize the application
  const app = new App(SpreadsheetApp, {});
  await app.mount(document.body);
}

whenReady(setup);
