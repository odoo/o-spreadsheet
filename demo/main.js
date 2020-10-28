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

function rpc(route, method, data) {
  const url = `http://${window.location.hostname}:9000/${route}`;
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url);
    // xhr.setRequestHeader("Content-type", "application/binary");
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
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
    xhr.send(data);
  });
}

class App extends Component {
  constructor() {
    super();
    this.key = 1;
    let cacheData;
    this.spread = useRef("spread");
    useSubEnv({
      save: this.save.bind(this),
    });
    this.queue = [];
    this.stateQueue = [];
    this.isConnected = false;
    this.isStateConnected = false;
    this.socket = new WebSocket(`ws://${window.location.hostname}:9000`);
    this.stateSocket = new WebSocket(`ws://${window.location.hostname}:9000/sync-state`);
    this.stateSocket.addEventListener("open", () => {
      this.isStateConnected = true;
      this.processQueue(this.stateQueue, this.stateSocket);
    });
    this.socket.addEventListener("open", () => {
      this.isConnected = true;
      this.processQueue(this.queue, this.socket);
    });
    this.socket.addEventListener("error", (e) => {
      console.log(e);
    });
    this.blockRequest = false;
    this.socket.addEventListener("message", async (ev) => {
      if (ev.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.spread.comp.model.crdtReceived(new Uint8Array(e.target.result))
          // this.spread.comp.model.dispatch("CRDT_RECEIVED", {
          //   data: new Uint8Array(e.target.result),
          // });
        };
        reader.readAsArrayBuffer(ev.data);
      }
      // if (msg.type === "multiuser_command") {
      // const command = Object.assign(msg.payload.payload, { type: msg.payload.type });
      // should not be broadcast directly
      // this.spread.comp.model.dispatch("MULTIUSER", { command });
      // }
    });
    this.stateSocket.addEventListener("message", async (ev) => {
      if (this.blockRequest) {
        return;
      }
      this.blockRequest = true;
      if (ev.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.spread.comp.model.importCRDT(new Uint8Array(e.target.result));
        };
        reader.readAsArrayBuffer(ev.data);
      }
    });
    // this.data = makeLargeDataset(45, 5000);
  }

  async willStart() {
    // try {
    //   cacheData = JSON.parse(window.localStorage.getItem("o-spreadsheet"));
    // } catch (_) {
    //   window.localStorage.removeItem("o-spreadsheet");
    // }
    // this.data = cacheData || demoData;
    const first = JSON.parse(await rpc("get-status", "GET"));

    // For testing puposes we need to load all data every time
    this.data = JSON.parse(await rpc("get-json", "GET"));
    // this.data = makeLargeDataset(45, 1000);
    if (!first) {
      const crdtResponse = await this.getCRDT();
      // const enc = new TextEncoder();
      // this.crdtData = enc.encode(crdtResponse);
      this.crdtData = new Uint8Array(JSON.parse(crdtResponse).data);
      console.log(this.crdtData);
      // this.crdtData = new Uint8Array(crdtResponse);
    }
    // if (first) {
    //   this.data = JSON.parse(await rpc("get-json", "GET"));
    // } else {
    //   const crdtResponse = await this.getCRDT();
    //   const enc = new TextEncoder();
    //   this.crdtData = enc.encode(crdtResponse);
    // }
  }

  getCRDT() {
    return new Promise(async (resolve, reject) => {
      const crdt = await rpc("get-crdt", "GET");
      if (crdt) {
        resolve(crdt);
      } else {
        // FIXME clear timer if unmounted
        setTimeout(() => {
          return this.getCRDT();
        }, 1000);
      }
    });
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
    //window.localStorage.setItem("o-spreadsheet", JSON.stringify(content));
    const data = this.spread.comp.model.getCRDTState();
    this.sendState2(data);
  }

  processQueue(queue, socket) {
    for (let msg of queue) {
      socket.send(msg);
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

  async sendState2(data) {
    if (!this.isConnected) {
      this.stateQueue.push(data);
    } else {
      console.log(this.stateSocket.readyState);
      this.stateSocket.send(data);
    }
  }

  async sendState(ev) {
    console.log("sendState", ev);
    const data = ev.detail.command;
    console.log(data);
    this.sendState2(data);
    // const msg = JSON.stringify({ type: "multiuser_command", payload: command });
    // const command = JSON.stringify(this.spread.comp.model.exportData());
    // if (!this.isConnected) {
    //   this.stateQueue.push(data);
    // } else {
    //   console.log(this.stateSocket.readyState);
    //   this.stateSocket.send(data);
    // }
  }
}

App.template = xml/* xml */ `
  <div>
    <Spreadsheet data="data" crdtData="crdtData" t-key="key"
      t-ref="spread"
      t-on-ask-confirmation="askConfirmation"
      t-on-notify-user="notifyUser"
      t-on-edit-text="editText"
      t-on-send-crdt-state="sendState"
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
