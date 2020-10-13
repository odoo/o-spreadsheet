import { Model } from "../src/model";
import "./canvas.mock";
import { CommandTypes, Getters } from "../src/types";

export interface ServerConfig {
  autoDispatch: boolean;
}

const DEFAULT_CONFIG: ServerConfig = {
  autoDispatch: true,
};

export class MultiuserInstance {
  private server: Server;

  constructor(numberClients: number = 2, config: ServerConfig = DEFAULT_CONFIG, data?: any) {
    this.server = new Server(Object.assign({}, DEFAULT_CONFIG, config));
    if (!data) {
      data = new Model().exportData();
    }
    for (let i = 0; i < numberClients; i++) {
      this.server.addClient(i.toString(), data);
    }
  }

  getServer(): Server {
    return this.server;
  }

  getClients(): Client[] {
    return this.server.getClients();
  }

  getClient(key: string): Client {
    return this.server.getClient(key);
  }
}

class Server {
  private clients: { [key: string]: Client } = {};
  private queue: { [clientId: string]: any[] } = {};
  private config: ServerConfig;
  private timestamp: number = 0;

  constructor(config: ServerConfig) {
    this.config = config;
  }

  sendCommand(clientId: string, command?: any) {
    for (let id in this.clients) {
      if (clientId !== id) {
        this.queue[id].push(command);
      }
    }
    if (this.config.autoDispatch) {
      this.processQueues();
    }
  }

  nextTimestamp() {
    return this.timestamp;
  }

  getQueue(key: string) {
    return this.queue[key];
  }

  processQueues() {
    for (let key in this.clients) {
      this.processQueue(key);
    }
  }

  processQueue(key: string) {
    const client = this.clients[key];
    while (this.queue[key].length) {
      client.dispatch("MULTIUSER", { command: this.queue[key].shift() });
    }
  }

  addClient(key: string, dataClient: any) {
    this.clients[key] = new Client(this, key, dataClient);
    this.queue[key] = [];
  }

  getClient(key: string): Client {
    return this.clients[key];
  }

  getClients(): Client[] {
    return Object.values(this.clients);
  }

  removeClient(key: string) {
    delete this.clients[key];
    delete this.queue[key];
  }
}

class Client {
  private model: Model;
  private parent: Server;
  private id: string;

  constructor(parent: Server, id: string, data: any = {}) {
    this.parent = parent;
    this.id = id;
    this.model = new Model(data, {
      network: {
        sendCommand: (type: string, payload?: any) => this.parent.sendCommand(this.id, payload),
      },
    });
  }

  dispatch(type: CommandTypes, payload?: any) {
    this.model.dispatch(type, payload);
  }

  getModel(): Model {
    return this.model;
  }

  getters(): Getters {
    return this.model.getters;
  }
}
