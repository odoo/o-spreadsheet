import { demoData, makeLargeDataset } from "./data.js";
owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;
const { useSubEnv } = owl.hooks;

const Spreadsheet = o_spreadsheet.Spreadsheet;
const menuItemRegistry = o_spreadsheet.registries.topbarMenuRegistry;

menuItemRegistry.add("file", { name: "File", sequence: 10 });
menuItemRegistry.addChild("save", ["file"], {
  name: "Save",
  sequence: 30,
  action: (env) => env.save(env.export()),
});
menuItemRegistry.addChild("clear", ["file"], {
  name: "Clear save",
  sequence: 30,
  action: (env) => window.localStorage.removeItem("o-spreadsheet"),
});

let start;

class App extends Component {
  constructor() {
    super();
    this.key = 1;
    let cacheData;
    try {
      cacheData = JSON.parse(window.localStorage.getItem("o-spreadsheet"));
    } catch (_) {
      window.localStorage.removeItem("o-spreadsheet");
    }
    this.data = cacheData || demoData;
    useSubEnv({
      save: this.save.bind(this),
    });
    this.data = makeLargeDataset(20, 1000);
  }

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

  editText(ev) {
    const text = window.prompt(ev.detail.title, ev.detail.placeholder);
    ev.detail.callback(text);
  }

  saveContent(ev) {
    this.save(ev.detail.data);
  }

  save(content) {
    window.localStorage.setItem("o-spreadsheet", JSON.stringify(content));
  }
}

App.template = xml`
  <div>
    <Spreadsheet data="data" t-key="key"
      t-on-ask-confirmation="askConfirmation"
      t-on-notify-user="notifyUser"
      t-on-edit-text="editText"
      t-on-save-content="saveContent"/>
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
  start = Date.now();
  const app = new App();

  app.mount(document.body);
}
whenReady(setup);
