import { demoData, makeLargeDataset } from "./data.js";
owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;

let start;

const Spreadsheet = o_spreadsheet.Spreadsheet;
class App extends Component {
  constructor() {
    super();
    this.key = 1;
    this.data = demoData;
    this.data = makeLargeDataset();
  }

  mounted() {
    console.timeEnd("mounting");
  }

  askConfirmation(ev) {
    if (window.confirm(ev.detail.content)) {
      ev.detail.confirm();
    }
  }

  notifyUser(ev) {
    window.alert(ev.detail.content);
  }
}

App.template = xml`
  <div>
    <Spreadsheet data="data" t-key="key"
      t-on-ask-confirmation="askConfirmation"
      t-on-notify-user="notifyUser"/>
  </div>`;
App.style = css`
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
  console.time('mounting')
  const app = new App();

  app.mount(document.body);
}
whenReady(setup);
