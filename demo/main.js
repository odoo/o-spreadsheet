// Don't remove unused import
// organize-imports-ignore
import { demoData, makeLargeDataset } from "./data.js";
import { makePivotDataset } from "./pivot.js";
import { currenciesData } from "./currencies.js";
import { WebsocketTransport } from "./transport.js";
import { FileStore } from "./file_store.js";
import { geoJsonService } from "./geo_json/geo_json_service.js";

const {
  xml,
  Component,
  whenReady,
  onWillStart,
  onMounted,
  useState,
  onWillUnmount,
  useExternalListener,
  onError,
  markRaw,
} = owl;

const { Spreadsheet, Model } = o_spreadsheet;
const { topbarMenuRegistry } = o_spreadsheet.registries;
const { useStoreProvider } = o_spreadsheet.stores;

const uuidGenerator = new o_spreadsheet.helpers.UuidGenerator();

// ─── Mode detection ───────────────────────────────────────────────────────────

function isDevMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("mode")) return params.get("mode") === "dev";
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

const DEV_MODE = isDevMode();
const SERVER_BASE = `http://${window.location.hostname}:9090`;

// ─── Virtual demo files (dev mode) ───────────────────────────────────────────

const VIRTUAL_FILE_DATA = {
  "virtual-demo-data": () => demoData,
  "virtual-empty": () => ({}),
  "virtual-large-numbers": () => makeLargeDataset(26, 10_000, ["numbers"]),
  "virtual-large-floats": () => makeLargeDataset(26, 10_000, ["floats"]),
  "virtual-large-long-floats": () => makeLargeDataset(26, 10_000, ["longFloats"]),
  "virtual-large-strings": () => makeLargeDataset(26, 10_000, ["strings"]),
  "virtual-large-formulas": () => makeLargeDataset(26, 10_000, ["formulas"]),
  "virtual-large-formulas-squished": () => makeLargeDataset(26, 10_000, ["formulasSquished"]),
  "virtual-large-array-formulas": () => makeLargeDataset(26, 10_000, ["arrayFormulas"]),
  "virtual-large-vectorized-formulas": () => makeLargeDataset(26, 10_000, ["vectorizedFormulas"]),
  "virtual-large-split-vlookup": () => makeLargeDataset(26, 10_000, ["splitVlookup"]),
  "virtual-pivot": () => makePivotDataset(10_000),
};

// ─── Server-backed file storage (dev mode) ───────────────────────────────────

class ServerFileStorage {
  async listFiles() {
    const res = await fetch(`${SERVER_BASE}/files`);
    return res.json();
  }

  async loadFile(id) {
    const res = await fetch(`${SERVER_BASE}/files/${id}`);
    return res.json();
  }

  async createFile(name, snapshot = undefined) {
    const res = await fetch(`${SERVER_BASE}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot ? { name, snapshot } : { name }),
    });
    const data = await res.json();
    return data.id;
  }

  async deleteFile(id) {
    await fetch(`${SERVER_BASE}/files/${id}`, { method: "DELETE" });
  }

  async renameFile(id, name) {
    await fetch(`${SERVER_BASE}/files/${id}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async clearFile(id) {
    await fetch(`${SERVER_BASE}/files/${id}/clear`, { method: "POST" });
  }

  // Returns { messages, snapshot } for the file
  async getFileData(id) {
    return this.loadFile(id);
  }
}

// ─── IndexedDB-backed file storage (end-user mode) ───────────────────────────

class LocalFileStorage {
  constructor() {
    this.dbName = "o-spreadsheet-files";
    this.dbVersion = 1;
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  _tx(store, key) {
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(store).objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _getAll(store) {
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(store).objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _put(store, value) {
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(store, "readwrite").objectStore(store).put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _delete(store, key) {
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(store, "readwrite").objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async listFiles() {
    const all = await this._getAll("files");
    return all
      .map(({ id, name, createdAt, lastModified, totalRevisions, snapshotDate }) => ({
        id,
        name,
        createdAt: createdAt || lastModified,
        lastModified,
        totalRevisions: totalRevisions || 0,
        snapshotDate: snapshotDate || lastModified,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async loadFile(id) {
    return this._tx("files", id);
  }

  async saveFile(id, name, data, totalRevisions) {
    const existing = await this._tx("files", id);
    const now = Date.now();
    await this._put("files", {
      ...(existing || {}),
      id,
      name,
      data,
      createdAt: (existing && existing.createdAt) || now,
      lastModified: now,
      snapshotDate: now,
      totalRevisions,
    });
  }

  async createFile(name) {
    const id = crypto.randomUUID();
    const now = Date.now();
    await this._put("files", {
      id,
      name,
      data: {},
      createdAt: now,
      lastModified: now,
      snapshotDate: now,
      totalRevisions: 0,
    });
    return id;
  }

  async renameFile(id, name) {
    const file = await this._tx("files", id);
    await this._put("files", { ...file, name });
  }

  async deleteFile(id) {
    await this._delete("files", id);
  }

  async getLastOpenedFileId() {
    const entry = await this._tx("meta", "lastOpenedFileId");
    return entry ? entry.value : null;
  }

  async setLastOpenedFileId(id) {
    await this._put("meta", { key: "lastOpenedFileId", value: id });
  }

  async backupAll() {
    const files = await this._getAll("files");
    const meta = await this._getAll("meta");
    return { version: 1, files, meta };
  }

  async restoreAll(backup) {
    await new Promise((resolve, reject) => {
      const req = this.db.transaction("files", "readwrite").objectStore("files").clear();
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const req = this.db.transaction("meta", "readwrite").objectStore("meta").clear();
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });
    for (const file of backup.files) await this._put("files", file);
    for (const entry of backup.meta) await this._put("meta", entry);
  }
}

// ─── Date formatting helper ───────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main App component ───────────────────────────────────────────────────────

class App extends Component {
  setup() {
    this.devMode = DEV_MODE;
    this.storage = DEV_MODE ? new ServerFileStorage() : new LocalFileStorage();
    this.fileStore = DEV_MODE ? new FileStore() : null;

    this.state = useState({
      files: [],
      currentFileId: null,
      loading: true,
      modelKey: 0,
      hoveredFileId: null,
      tooltipY: 0,
      sidebarOpen: localStorage.getItem("sidebarOpen") !== "false",
      colorScheme: "light",
      displayHeader: false,
    });

    this.model = null;
    this.transportService = null;
    this.client = { id: uuidGenerator.uuidv4(), name: "Local" };
    this.stores = useStoreProvider();

    // Revision tracking (end-user mode only)
    this.pendingRevisions = 0;
    this.totalRevisionsBase = 0;

    onMounted(() => this._registerMenus());

    onWillStart(async () => {
      if (!DEV_MODE) {
        await this.storage.init();
      }
      await this._loadFileList();

      if (DEV_MODE) {
        const files = this.state.files;
        const firstId = files.length > 0 ? files[0].id : null;
        if (firstId) await this._openFile(firstId);
      } else {
        const lastId = await this.storage.getLastOpenedFileId();
        const fileExists = this.state.files.some((f) => f.id === lastId);
        if (lastId && fileExists) {
          await this._openFile(lastId);
        } else if (this.state.files.length > 0) {
          await this._openFile(this.state.files[0].id);
        } else {
          const id = await this.storage.createFile("Spreadsheet 1");
          await this._loadFileList();
          await this._openFile(id);
        }
      }

      this.state.loading = false;
    });

    useExternalListener(window, "beforeunload", () => this._onUnload());
    useExternalListener(window, "visibilitychange", () => {
      if (document.visibilityState === "hidden") this._onUnload();
    });
    useExternalListener(window, "unhandledrejection", this._notifyError.bind(this));
    useExternalListener(window, "error", (ev) => {
      console.error("Global error caught:", ev.error || ev.message);
      this._notifyError();
    });

    onWillUnmount(() => this._onUnload());
    onError((error) => {
      console.error(error.cause || error);
      this._notifyError();
    });
  }

  _registerMenus() {
    // Sidebar toggle — available in both modes
    topbarMenuRegistry.addChild("local_files", ["file"], {
      name: () => (this.state.sidebarOpen ? "Hide files" : "Show files"),
      sequence: 5,
      isReadonlyAllowed: true,
      isEnabledOnLockedSheet: true,
      execute: () => {
        this.state.sidebarOpen = !this.state.sidebarOpen;
        localStorage.setItem("sidebarOpen", this.state.sidebarOpen);
      },
    });

    if (!DEV_MODE) return;

    // Dev-only menus
    topbarMenuRegistry.addChild("readonly", ["file"], {
      name: "Open in read-only",
      sequence: 11,
      isVisible: () => this.model && this.model.config.mode !== "readonly",
      execute: () => this.model.updateMode("readonly"),
      icon: "o-spreadsheet-Icon.OPEN_READ_ONLY",
      isEnabledOnLockedSheet: true,
    });

    topbarMenuRegistry.addChild("dashboard", ["file"], {
      name: "Open in dashboard",
      sequence: 12,
      isReadonlyAllowed: true,
      isVisible: () => this.model && this.model.config.mode !== "dashboard",
      execute: () => this.model.updateMode("dashboard"),
      icon: "o-spreadsheet-Icon.OPEN_DASHBOARD",
      isEnabledOnLockedSheet: true,
    });

    topbarMenuRegistry.addChild("read_write", ["file"], {
      name: "Open with write access",
      sequence: 13,
      isReadonlyAllowed: true,
      isVisible: () => this.model && this.model.config.mode !== "normal",
      execute: () => this.model.updateMode("normal"),
      icon: "o-spreadsheet-Icon.OPEN_READ_WRITE",
      isEnabledOnLockedSheet: true,
    });

    topbarMenuRegistry.addChild("dark_mode", ["file"], {
      name: "Toggle dark mode",
      sequence: 14,
      isReadonlyAllowed: true,
      execute: () =>
        (this.state.colorScheme = this.state.colorScheme === "dark" ? "light" : "dark"),
      icon: "o-spreadsheet-Icon.DARK_MODE",
      isEnabledOnLockedSheet: true,
    });

    topbarMenuRegistry.addChild("display_header", ["view"], {
      name: () => (this.state.displayHeader ? "Hide header" : "Show header"),
      isReadonlyAllowed: true,
      execute: () => (this.state.displayHeader = !this.state.displayHeader),
      icon: "o-spreadsheet-Icon.DISPLAY_HEADER",
      isEnabledOnLockedSheet: true,
      sequence: 1000,
      separator: true,
    });

    topbarMenuRegistry.add("notify", {
      name: "Dummy notifications",
      sequence: 1000,
      isReadonlyAllowed: true,
    });

    topbarMenuRegistry.addChild("fake_notify_sticky", ["notify"], {
      name: "fake notify (sticky)",
      sequence: 13,
      isReadonlyAllowed: true,
      execute: () =>
        this.notifyUser({
          text: "I'm a sticky notification ! You want me to leave ? COME FIGHT WITH ME !!!",
          sticky: true,
          type: "warning",
        }),
      isEnabledOnLockedSheet: true,
    });

    topbarMenuRegistry.addChild("fake_notify_no_sticky", ["notify"], {
      name: "fake notify (no sticky)",
      sequence: 14,
      isReadonlyAllowed: true,
      execute: () =>
        this.notifyUser({
          text: "I'm not sticky. CiaoByeBye.",
          sticky: false,
          type: "warning",
        }),
      isEnabledOnLockedSheet: true,
    });

    topbarMenuRegistry.addChild("throw_error", ["notify"], {
      name: "Uncaught error",
      sequence: 11,
      execute: () => {
        // eslint-disable-next-line no-undef
        a / 0;
      },
      isEnabledOnLockedSheet: true,
    });
  }

  async _loadFileList() {
    this.state.files = await this.storage.listFiles();
  }

  async _openFile(id) {
    await this._saveCurrentFile();
    this._leaveCurrentSession();

    let initialData;
    let messages = [];

    if (DEV_MODE) {
      const fileData = await this.storage.getFileData(id);
      messages = fileData.messages || [];
      if (fileData.snapshot) {
        initialData = fileData.snapshot;
      } else if (VIRTUAL_FILE_DATA[id]) {
        initialData = VIRTUAL_FILE_DATA[id]();
      } else {
        initialData = {};
      }

      // Connect WebSocket transport
      const transport = new WebsocketTransport(`ws://${window.location.hostname}:9090/files/${id}`);
      try {
        await transport.connect();
        this.transportService = transport;
      } catch (err) {
        console.warn("Could not connect to collaborative server.", err);
        this.transportService = undefined;
      }
    } else {
      const file = await this.storage.loadFile(id);
      initialData = file.data || {};
      this.totalRevisionsBase = file.totalRevisions || 0;
      this.pendingRevisions = 0;
      this.transportService = undefined;
      await this.storage.setLastOpenedFileId(id);
    }

    this._createModel(initialData, messages);
    this.state.currentFileId = id;
    this.stores.resetStores();
    this.state.modelKey++;
    await this._loadFileList();
  }

  _leaveCurrentSession() {
    if (this.model) {
      this.model.off("update", this);
      this.model.leaveSession();
    }
    if (this.transportService) {
      // WebsocketTransport doesn't have an explicit disconnect, but leaveSession above sends CLIENT_LEFT
      this.transportService = undefined;
    }
  }

  _createModel(data, stateUpdateMessages = []) {
    this.model = new Model(
      data,
      {
        external: {
          loadCurrencies: async () => currenciesData,
          fileStore: this.fileStore,
          geoJsonService: geoJsonService,
        },
        transportService: this.transportService,
        client: this.client,
        mode: "normal",
      },
      stateUpdateMessages
    );
    if (!DEV_MODE) {
      this.model.on("update", this, () => this.pendingRevisions++);
    }
    markRaw(this.model);
    o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
    o_spreadsheet.__DEBUG__.model = this.model;
    this.model.joinSession();
    this._activateFirstSheet();
  }

  _activateFirstSheet() {
    const sheetId = this.model.getters.getActiveSheetId();
    const firstSheetId = this.model.getters.getSheetIds()[0];
    if (firstSheetId !== sheetId) {
      this.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo: firstSheetId });
    }
  }

  async _saveCurrentFile() {
    if (!this.model || !this.state.currentFileId) return;
    if (DEV_MODE) return; // server tracks state via revisions
    const data = await this.model.exportData();
    const file = this.state.files.find((f) => f.id === this.state.currentFileId);
    const name = file ? file.name : "Untitled";
    const newTotal = this.totalRevisionsBase + this.pendingRevisions;
    await this.storage.saveFile(this.state.currentFileId, name, data, newTotal);
    this.totalRevisionsBase = newTotal;
    this.pendingRevisions = 0;
  }

  _onUnload() {
    this._leaveCurrentSession();
    if (!DEV_MODE) this._saveCurrentFile();
  }

  // ─── File manager actions ─────────────────────────────────────────────────

  async switchFile(id) {
    if (id === this.state.currentFileId) return;
    await this._openFile(id);
  }

  async newFile() {
    const name = prompt("File name:", "New Spreadsheet");
    if (!name) return;
    const id = await this.storage.createFile(name);
    await this._loadFileList();
    await this._openFile(id);
  }

  async renameFile(id) {
    if (this.state.files.find((f) => f.id === id)?.isVirtual) return;
    const file = this.state.files.find((f) => f.id === id);
    const name = prompt("New name:", file.name);
    if (!name || name === file.name) return;
    await this.storage.renameFile(id, name);
    await this._loadFileList();
  }

  async deleteFile(id) {
    if (this.state.files.find((f) => f.id === id)?.isVirtual) return;
    if (!confirm("Delete this file? This cannot be undone.")) return;
    await this.storage.deleteFile(id);
    await this._loadFileList();
    if (id === this.state.currentFileId) {
      this.state.currentFileId = null;
      this.model = null;
      if (this.state.files.length > 0) {
        await this._openFile(this.state.files[0].id);
      } else {
        const newId = await this.storage.createFile("Spreadsheet 1");
        await this._loadFileList();
        await this._openFile(newId);
      }
    }
  }

  async clearFile(id) {
    if (!DEV_MODE) return;
    if (!confirm("Reset this file's history? All collaborative changes will be lost.")) return;
    await this.storage.clearFile(id);
    if (id === this.state.currentFileId) await this._openFile(id);
  }

  async importXLSX() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      if (!input.files.length) return;
      const jszip = new JSZip();
      const zip = await jszip.loadAsync(input.files[0]);
      const paths = Object.keys(zip.files);
      const contents = await Promise.all(
        paths.map((p) => zip.files[p].async(p.includes("media/image") ? "blob" : "text"))
      );
      const inputFiles = {};
      for (let i = 0; i < paths.length; i++) inputFiles[paths[i]] = contents[i];
      const name = input.files[0].name.replace(/\.xlsx$/i, "");
      await this._importData(inputFiles, name);
      input.remove();
    });
    input.click();
  }

  async importOSHEET() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      if (!input.files.length) return;
      const text = await input.files[0].text();
      const data = JSON.parse(text);
      const name = input.files[0].name.replace(/\.osheet\.json$/i, "").replace(/\.json$/i, "");
      await this._importData(data, name);
      input.remove();
    });
    input.click();
  }

  async _importData(rawData, name) {
    // Parse the raw data through a temporary model to get a clean snapshot
    const tempModel = new Model(rawData, {
      external: { loadCurrencies: async () => currenciesData, geoJsonService },
      mode: "normal",
    });
    const snapshot = await tempModel.exportData();
    tempModel.leaveSession();

    if (DEV_MODE) {
      const id = await this.storage.createFile(name, snapshot);
      await this._loadFileList();
      await this._openFile(id);
    } else {
      const id = await this.storage.createFile(name);
      await this.storage.saveFile(id, name, snapshot, 0);
      this.totalRevisionsBase = 0;
      this.pendingRevisions = 0;
      await this._loadFileList();
      await this._openFile(id);
    }
  }

  async downloadXLSX(id) {
    const fileInfo = this.state.files.find((f) => f.id === id);
    const name = fileInfo ? fileInfo.name : "spreadsheet";
    let model = this.model;
    let tempModel = null;

    if (id !== this.state.currentFileId) {
      let data;
      if (DEV_MODE) {
        const fileData = await this.storage.getFileData(id);
        const snapshot =
          fileData.snapshot || (VIRTUAL_FILE_DATA[id] ? VIRTUAL_FILE_DATA[id]() : {});
        tempModel = new Model(
          snapshot,
          {
            external: { loadCurrencies: async () => currenciesData, geoJsonService },
            mode: "normal",
          },
          fileData.messages || []
        );
      } else {
        const file = await this.storage.loadFile(id);
        tempModel = new Model(file.data || {}, {
          external: { loadCurrencies: async () => currenciesData, geoJsonService },
          mode: "normal",
        });
      }
      model = tempModel;
    }

    const doc = await model.exportXLSX();
    if (tempModel) tempModel.leaveSession();
    const zip = new JSZip();
    for (const f of doc.files) {
      if (f.imageSrc) {
        const blob = await fetch(f.imageSrc).then((r) => r.blob());
        zip.file(f.path, blob);
      } else {
        zip.file(f.path, f.content.replaceAll(` xmlns=""`, ""));
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${name}.xlsx`);
  }

  async downloadOSHEET(id) {
    const fileInfo = this.state.files.find((f) => f.id === id);
    const name = fileInfo ? fileInfo.name : "spreadsheet";
    let data;
    if (id === this.state.currentFileId) {
      data = await this.model.exportData();
    } else if (DEV_MODE) {
      const fileData = await this.storage.getFileData(id);
      data = fileData.snapshot || {};
    } else {
      const file = await this.storage.loadFile(id);
      data = file.data;
    }
    saveAs(new Blob([JSON.stringify(data)], { type: "application/json" }), `${name}.osheet.json`);
  }

  async backupAll() {
    if (DEV_MODE) return; // not applicable in dev mode
    await this._saveCurrentFile();
    const backup = await this.storage.backupAll();
    saveAs(
      new Blob([JSON.stringify(backup)], { type: "application/json" }),
      `o-spreadsheet-backup-${new Date().toISOString().slice(0, 10)}.ofiles-backup.json`
    );
  }

  async restoreAll() {
    if (DEV_MODE) return;
    if (!confirm("This will replace ALL local files with the backup. Continue?")) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      if (!input.files.length) return;
      const backup = JSON.parse(await input.files[0].text());
      if (backup.version !== 1 || !Array.isArray(backup.files)) {
        alert("Invalid backup file.");
        input.remove();
        return;
      }
      this._leaveCurrentSession();
      this.state.currentFileId = null;
      await this.storage.restoreAll(backup);
      await this._loadFileList();
      const lastId = await this.storage.getLastOpenedFileId();
      const fileExists = this.state.files.some((f) => f.id === lastId);
      if (lastId && fileExists) {
        await this._openFile(lastId);
      } else if (this.state.files.length > 0) {
        await this._openFile(this.state.files[0].id);
      }
      input.remove();
    });
    input.click();
  }

  getTooltipInfo(file) {
    if (DEV_MODE) {
      return {
        lastUpdate: formatDate(file.lastModified),
        totalRevisions: file.messageCount || 0,
      };
    }
    const isCurrent = file.id === this.state.currentFileId;
    const pending = isCurrent ? this.pendingRevisions : 0;
    return {
      lastUpdate: formatDate(file.lastModified),
      totalRevisions: (file.totalRevisions || 0) + pending,
      snapshotDate: formatDate(file.snapshotDate || file.lastModified),
      sinceSnapshot: pending,
    };
  }

  notifyUser(notification) {
    const div = document.createElement("div");
    div.textContent = notification.text;
    div.classList.add(
      "o-test-notification",
      "bg-white",
      "p-3",
      "shadow",
      "rounded",
      notification.type
    );
    const element = document.querySelector(".o-spreadsheet") || document.body;
    div.onclick = () => element.removeChild(div);
    element.appendChild(div);
    if (!notification.sticky) {
      setTimeout(() => {
        if (document.body.contains(div)) element.removeChild(div);
      }, 5000);
    }
  }

  _notifyError() {
    this.notifyUser({
      text: "An unexpected error occurred. Open the developer console for details.",
      sticky: true,
      type: "warning",
    });
  }
}

App.template = xml/* xml */ `
  <div id="app">
    <div id="sidebar" t-if="state.sidebarOpen">
      <div id="sidebar-header">
        <span>Files</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <button id="new-file-btn" title="New file" t-on-click="newFile">+</button>
          <button id="close-sidebar-btn" title="Close panel"
            t-on-click="() => { this.state.sidebarOpen = false; localStorage.setItem('sidebarOpen', false); }">✕</button>
        </div>
      </div>
      <div id="file-list">
        <t t-foreach="state.files" t-as="file" t-key="file.id">
          <div
            class="file-item"
            t-att-class="{ active: file.id === state.currentFileId, virtual: file.isVirtual }"
            t-on-click="() => this.switchFile(file.id)"
            t-on-mouseenter="(ev) => { this.state.hoveredFileId = file.id; this.state.tooltipY = ev.currentTarget.getBoundingClientRect().top; }"
            t-on-mouseleave="() => this.state.hoveredFileId = null"
          >
            <span class="file-name" t-esc="file.name"/>
            <span class="file-actions">
              <button class="file-action-btn" title="Download as Excel"
                t-on-click.stop="() => this.downloadXLSX(file.id)">xlsx</button>
              <button class="file-action-btn" title="Download as OSHEET"
                t-on-click.stop="() => this.downloadOSHEET(file.id)">json</button>
              <t t-if="!file.isVirtual">
                <button class="file-action-btn" title="Rename"
                  t-on-click.stop="() => this.renameFile(file.id)">✎</button>
                <button class="file-action-btn delete" title="Delete"
                  t-on-click.stop="() => this.deleteFile(file.id)">✕</button>
              </t>
              <t t-if="devMode">
                <button class="file-action-btn" title="Reset history"
                  t-on-click.stop="() => this.clearFile(file.id)">↺</button>
              </t>
            </span>
          </div>
        </t>
      </div>
      <div id="sidebar-footer">
        <button class="sidebar-io-btn" title="Import Excel file" t-on-click="importXLSX">↑ Import XLSX</button>
        <button class="sidebar-io-btn" title="Import OSHEET file" t-on-click="importOSHEET">↑ Import OSHEET</button>
        <t t-if="!devMode">
          <button class="sidebar-io-btn" title="Backup all files" t-on-click="backupAll">↓ Backup all</button>
          <button class="sidebar-io-btn" title="Restore from backup" t-on-click="restoreAll">↑ Restore backup</button>
        </t>
      </div>
    </div>
    <t t-if="state.hoveredFileId">
      <t t-set="hoveredFile" t-value="state.files.find(f => f.id === state.hoveredFileId)"/>
      <t t-if="hoveredFile">
        <t t-set="info" t-value="this.getTooltipInfo(hoveredFile)"/>
        <div class="file-tooltip" t-att-style="'top:' + state.tooltipY + 'px'">
          <div class="file-tooltip-row">
            <span class="file-tooltip-label">Last update</span>
            <span t-esc="info.lastUpdate"/>
          </div>
          <div class="file-tooltip-row">
            <span class="file-tooltip-label">Revisions</span>
            <span t-esc="info.totalRevisions"/>
          </div>
          <t t-if="!devMode">
            <div class="file-tooltip-row">
              <span class="file-tooltip-label">Last snapshot</span>
              <span t-esc="info.snapshotDate"/>
            </div>
            <div class="file-tooltip-row">
              <span class="file-tooltip-label">Since snapshot</span>
              <span t-esc="info.sinceSnapshot"/>
            </div>
          </t>
        </div>
      </t>
    </t>
    <div id="spreadsheet-container">
      <t t-if="state.loading">
        <div id="loading">Loading…</div>
      </t>
      <t t-elif="model and state.displayHeader">
        <div class="d-flex flex flex-column justify-content w-100 h-100">
          <div class="p-3 border-bottom">A header</div>
          <div class="flex-fill">
            <Spreadsheet model="model" notifyUser.bind="notifyUser"
              t-key="state.modelKey" colorScheme="state.colorScheme"/>
          </div>
        </div>
      </t>
      <t t-elif="model">
        <Spreadsheet model="model" notifyUser.bind="notifyUser"
          t-key="state.modelKey" colorScheme="state.colorScheme"/>
      </t>
    </div>
  </div>
`;

App.components = { Spreadsheet };
App.props = {};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function setup() {
  const templates = await (await fetch("../build/o_spreadsheet.xml")).text();
  const app = new owl.App(App, { dev: true, warnIfNoStaticProps: true });
  app.addTemplates(templates);
  app.mount(document.body);
}

whenReady(setup);
