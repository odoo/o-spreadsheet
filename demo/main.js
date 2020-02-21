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
    this.data = demoData;
    // this.data = makeLargeDataset();
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

  onSave(ev) {
    const data = ev.detail.data;
    const downloadObjectAsJson = function(exportObj, exportName) {
      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", exportName + ".json");
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    };
    downloadObjectAsJson(data, "export");
  }

  onLoad(ev) {
    // <input type="file" id="selectFiles" value="Import" /><br /> <button id="import">Import</button> <textarea id="result"></textarea>
    let data = false;
    const uploadAnchorNode = document.createElement("input");
    uploadAnchorNode.setAttribute("type", "file");
    uploadAnchorNode.setAttribute("id", "selectFiles");
    document.body.appendChild(uploadAnchorNode);
    uploadAnchorNode.addEventListener("change", () => {
      const files = document.getElementById("selectFiles").files;
      if (files.length <= 0) {
        return false;
      }
      const fr = new FileReader();
      fr.onload = e => {
        data = JSON.parse(e.target.result);
        this.data = data;
        ev.detail.loadData(this.data);
        uploadAnchorNode.remove();
      };
      fr.readAsText(files.item(0));
    });
    uploadAnchorNode.click();
  }
}

App.template = xml`
  <div>
    <Spreadsheet data="data"
      t-on-ask-confirmation="askConfirmation"
      t-on-notify-user="notifyUser"
      t-on-save-content="onSave"
      t-on-load-content="onLoad"/>
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
