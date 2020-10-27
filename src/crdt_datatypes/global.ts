import * as Y from "yjs";
import { uuidv4 } from "../helpers/index";
import { UID } from "../types/misc";

export class GlobalCRDT {
  private doc = new Y.Doc();
  // @ts-ignore
  private undoManager: Y.UndoManager;
  private syncing: boolean = false;
  public uuid: UID = uuidv4();
  private get pluginsState(): Y.Map<any> {
    return this.doc.getMap("pluginsState");
  }

  constructor(private sendCommand: (data) => Promise<void>) {
    this.sendCommand = sendCommand;
    this.initUndoManager();
  }

  private initUndoManager() {
    this.undoManager = new Y.UndoManager(this.pluginsState, {
      captureTimeout: 500,
      trackedOrigins: new Set([this.uuid]),
    });
  }

  set(key: string, value: any) {
    this.pluginsState.set(key, value);
  }

  init(key: string) {
    this.pluginsState.set(key, new Y.Map<any>());
  }

  undo() {
    this.undoManager.undo();
  }

  redo() {
    this.undoManager.redo();
  }

  get(key: string) {
    return this.pluginsState.get(key);
  }

  import(changes) {
    console.time("import");
    //TODO remove this
    this.doc = new Y.Doc();
    Y.applyUpdateV2(this.doc, changes);
    this.initUndoManager();
    console.timeEnd("import");
    this.subscribeToUpdates();
  }

  crdtReceived(data: Uint8Array) {
    this.syncing = true;
    Y.applyUpdateV2(this.doc, data);
    this.syncing = false;
  }

  getState() {
    return Y.encodeStateAsUpdateV2(this.doc);
  }

  private subscribeToUpdates() {
    this.doc.on("updateV2", (update: Uint8Array) => {
      if (!this.syncing) {
        this.sendCommand(update);
      }
    });
  }
}
