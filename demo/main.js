import { demoData, makeLargeDataset } from "./data.js";
owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;

const start = Date.now();

const Spreadsheet = o_spreadsheet.Spreadsheet;
class App extends Component {
  data = demoData;
  // data = makeLargeDataset();

  mounted() {
    console.log("Mounted: ", Date.now() - start);
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
  <Spreadsheet data="data"
    t-on-ask-confirmation="askConfirmation"
    t-on-notify-user="notifyUser"/>`;
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
  const app = new App();
  app.mount(document.body);
}
whenReady(setup);
