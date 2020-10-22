import { demoData, makeLargeDataset } from "./data.js";
owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;
const { useSubEnv, useRef } = owl.hooks;

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
    this.spread = useRef("spread");
    try {
      cacheData = JSON.parse(window.localStorage.getItem("o-spreadsheet"));
    } catch (_) {
      window.localStorage.removeItem("o-spreadsheet");
    }
    this.data = cacheData || demoData;
    useSubEnv({
      save: this.save.bind(this),
    });
    this.queue = [];
    this.isConnected = false;
    this.socket = new WebSocket(`ws://${window.location.hostname}:9000`);
    this.socket.addEventListener("open", () => {
      this.isConnected = true;
      this.processQueue();
    });
    this.socket.addEventListener("error", (e) => {
      console.log(e);
    });
    this.socket.addEventListener("message", async (ev) => {
      if (ev.data instanceof Blob) {
        
        const reader = new FileReader();
        reader.onload = (e) => {
          this.spread.comp.model.dispatch("CRDT_RECEIVED", { data: new Uint8Array(e.target.result) });
        };
        reader.readAsArrayBuffer(ev.data);
      }
      // if (msg.type === "multiuser_command") {
        // const command = Object.assign(msg.payload.payload, { type: msg.payload.type });
        // should not be broadcast directly
        // this.spread.comp.model.dispatch("MULTIUSER", { command });
      // }
    });
    // this.data = makeLargeDataset(20, 10_000);
  }

  willStart() {}

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

  processQueue() {
    for (let msg of this.queue) {
      this.socket.send(msg);
    }
  }

  sendCommand(ev) {
    const data = ev.detail.command;
    // const msg = JSON.stringify({ type: "multiuser_command", payload: command });
    // const command = JSON.stringify(this.spread.comp.model.exportData());
    if (!this.isConnected) {
      this.queue.push(data);
    } else {
      this.socket.send(data);
    }
  }

  sendCommand2(networkCommand) {
    const clientId = networkCommand.clientId;
    const commands = networkCommand.commands;
    const msg = JSON.stringify({ type: "multiuser_command", payload: { clientId, commands } });
    if (!this.isConnected) {
      this.queue.push(msg);
    } else {
      this.socket.send(msg);
    }
  }

  async getTicket() {
    return (await jsonRPC(`http://${window.location.hostname}:9000/timestamp`, {})).timestamp;

    function jsonRPC(url, data) {
      return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-type", "application/binary");
        // const csrftoken = document.querySelector("[name=csrfmiddlewaretoken]").value;
        // xhr.setRequestHeader("X-CSRFToken", csrftoken);
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject({
              status: this.status,
              statusText: xhr.statusText,
            });
          }
        };
        xhr.onerror = function () {
          reject({
            status: this.status,
            statusText: xhr.statusText,
          });
        };
        xhr.send(JSON.stringify(data));
      });
    }
  }
}

App.template = xml`
  <div>
    <Spreadsheet data="data" t-key="key"
      t-ref="spread"
      getTicket="getTicket"
      t-on-ask-confirmation="askConfirmation"
      t-on-notify-user="notifyUser"
      t-on-edit-text="editText"
      t-on-send-crdt="sendCommand"
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