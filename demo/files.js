import { currenciesData } from "./currencies.js";
import { geoJsonService } from "./geo_json/geo_json_service.js";

const {
  xml,
  Component,
  whenReady,
  onWillStart,
  useState,
  useExternalListener,
  markRaw,
  onMounted,
} = owl;
const { Spreadsheet, Model } = o_spreadsheet;
const { useStoreProvider } = o_spreadsheet.stores;
const { topbarMenuRegistry } = o_spreadsheet.registries;

// ─── IndexedDB storage ────────────────────────────────────────────────────────

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

  _get(store, key) {
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
    return this._get("files", id);
  }

  async saveFile(id, name, data, totalRevisions) {
    const existing = await this._get("files", id);
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
    const file = await this._get("files", id);
    await this._put("files", { ...file, name });
  }

  async deleteFile(id) {
    await this._delete("files", id);
  }

  async getLastOpenedFileId() {
    const entry = await this._get("meta", "lastOpenedFileId");
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── OWL Component ────────────────────────────────────────────────────────────

class FileManagerDemo extends Component {
  setup() {
    this.storage = new LocalFileStorage();
    this.state = useState({
      files: [],
      currentFileId: null,
      loading: true,
      modelKey: 0,
      hoveredFileId: null,
      tooltipY: 0,
      sidebarOpen: localStorage.getItem("sidebarOpen") !== "false",
    });
    this.model = null;
    this.stores = useStoreProvider();

    onMounted(() => {
      topbarMenuRegistry.addChild("local_files", ["file"], {
        name: () => (this.state.sidebarOpen ? "Hide local files" : "Show local files"),
        sequence: 5,
        isReadonlyAllowed: true,
        isEnabledOnLockedSheet: true,
        execute: () => {
          this.state.sidebarOpen = !this.state.sidebarOpen;
          localStorage.setItem("sidebarOpen", this.state.sidebarOpen);
        },
      });
    });

    // Revision counters (non-reactive — not tied to render cycle)
    this.pendingRevisions = 0; // model updates since last save
    this.totalRevisionsBase = 0; // totalRevisions as loaded from storage

    onWillStart(async () => {
      await this.storage.init();
      await this._loadFileList();

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

      this.state.loading = false;
    });

    useExternalListener(window, "beforeunload", () => this._saveCurrentFile());
  }

  async _loadFileList() {
    this.state.files = await this.storage.listFiles();
  }

  async _openFile(id) {
    await this._saveCurrentFile();
    const file = await this.storage.loadFile(id);
    this.totalRevisionsBase = file.totalRevisions || 0;
    this.pendingRevisions = 0;
    this._createModel(file.data || {});
    this.state.currentFileId = id;
    this.stores.resetStores();
    this.state.modelKey++;
    await this.storage.setLastOpenedFileId(id);
    await this._loadFileList();
  }

  async _saveCurrentFile() {
    if (!this.model || !this.state.currentFileId) return;
    const data = await this.model.exportData();
    const file = this.state.files.find((f) => f.id === this.state.currentFileId);
    const name = file ? file.name : "Untitled";
    const newTotal = this.totalRevisionsBase + this.pendingRevisions;
    await this.storage.saveFile(this.state.currentFileId, name, data, newTotal);
    this.totalRevisionsBase = newTotal;
    this.pendingRevisions = 0;
  }

  _createModel(data) {
    if (this.model) {
      this.model.off("update", this);
      this.model.leaveSession();
    }
    this.model = new Model(data, {
      external: {
        loadCurrencies: async () => currenciesData,
        geoJsonService: geoJsonService,
      },
      mode: "normal",
    });
    this.model.on("update", this, () => this.pendingRevisions++);
    markRaw(this.model);
    o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
    o_spreadsheet.__DEBUG__.model = this.model;
    this.model.joinSession();
  }

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
    const file = this.state.files.find((f) => f.id === id);
    const name = prompt("New name:", file.name);
    if (!name || name === file.name) return;
    await this.storage.renameFile(id, name);
    await this._loadFileList();
  }

  async deleteFile(id) {
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
      for (let i = 0; i < paths.length; i++) {
        inputFiles[paths[i]] = contents[i];
      }
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
    await this._saveCurrentFile();
    this._createModel(rawData);
    const data = await this.model.exportData();
    const id = await this.storage.createFile(name);
    await this.storage.saveFile(id, name, data, 0);
    this.totalRevisionsBase = 0;
    this.pendingRevisions = 0;
    await this._loadFileList();
    this.state.currentFileId = id;
    this.stores.resetStores();
    this.state.modelKey++;
    await this.storage.setLastOpenedFileId(id);
  }

  async downloadXLSX(id) {
    const fileInfo = this.state.files.find((f) => f.id === id);
    const name = fileInfo ? fileInfo.name : "spreadsheet";
    let model = this.model;
    let tempModel = null;
    if (id !== this.state.currentFileId) {
      await this._saveCurrentFile();
      const file = await this.storage.loadFile(id);
      tempModel = new Model(file.data || {}, {
        external: { loadCurrencies: async () => currenciesData, geoJsonService },
        mode: "normal",
      });
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

  async backupAll() {
    await this._saveCurrentFile();
    const backup = await this.storage.backupAll();
    saveAs(
      new Blob([JSON.stringify(backup)], { type: "application/json" }),
      `o-spreadsheet-backup-${new Date().toISOString().slice(0, 10)}.ofiles-backup.json`
    );
  }

  async restoreAll() {
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
      if (this.model) {
        this.model.off("update", this);
        this.model.leaveSession();
        this.model = null;
      }
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

  async downloadOSHEET(id) {
    const fileInfo = this.state.files.find((f) => f.id === id);
    const name = fileInfo ? fileInfo.name : "spreadsheet";
    let data;
    if (id === this.state.currentFileId) {
      data = await this.model.exportData();
    } else {
      const file = await this.storage.loadFile(id);
      data = file.data;
    }
    saveAs(new Blob([JSON.stringify(data)], { type: "application/json" }), `${name}.osheet.json`);
  }

  getTooltipInfo(file) {
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
}

FileManagerDemo.template = xml/* xml */ `
  <div id="app">
    <div id="sidebar" t-if="state.sidebarOpen">
      <div id="sidebar-header">
        <span>Files</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <button id="new-file-btn" title="New file" t-on-click="newFile">+</button>
          <button id="close-sidebar-btn" title="Close panel" t-on-click="() => { this.state.sidebarOpen = false; localStorage.setItem('sidebarOpen', false); }">✕</button>
        </div>
      </div>
      <div id="file-list">
        <t t-foreach="state.files" t-as="file" t-key="file.id">
          <div
            class="file-item"
            t-att-class="{ active: file.id === state.currentFileId }"
            t-on-click="() => this.switchFile(file.id)"
            t-on-mouseenter="(ev) => { this.state.hoveredFileId = file.id; this.state.tooltipY = ev.currentTarget.getBoundingClientRect().top; }"
            t-on-mouseleave="() => this.state.hoveredFileId = null"
          >
            <span class="file-name" t-esc="file.name"/>
            <span class="file-actions">
              <button
                class="file-action-btn"
                title="Download as Excel"
                t-on-click.stop="() => this.downloadXLSX(file.id)"
              >xlsx</button>
              <button
                class="file-action-btn"
                title="Download as OSHEET"
                t-on-click.stop="() => this.downloadOSHEET(file.id)"
              >json</button>
              <button
                class="file-action-btn"
                title="Rename"
                t-on-click.stop="() => this.renameFile(file.id)"
              >✎</button>
              <button
                class="file-action-btn delete"
                title="Delete"
                t-on-click.stop="() => this.deleteFile(file.id)"
              >✕</button>
            </span>
          </div>
        </t>
      </div>
      <div id="sidebar-footer">
        <button class="sidebar-io-btn" title="Import Excel file" t-on-click="importXLSX">↑ Import XLSX</button>
        <button class="sidebar-io-btn" title="Import OSHEET file" t-on-click="importOSHEET">↑ Import OSHEET</button>
        <button class="sidebar-io-btn" title="Backup all files" t-on-click="backupAll">↓ Backup all</button>
        <button class="sidebar-io-btn" title="Restore from backup" t-on-click="restoreAll">↑ Restore backup</button>
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
          <div class="file-tooltip-row">
            <span class="file-tooltip-label">Last snapshot</span>
            <span t-esc="info.snapshotDate"/>
          </div>
          <div class="file-tooltip-row">
            <span class="file-tooltip-label">Since snapshot</span>
            <span t-esc="info.sinceSnapshot"/>
          </div>
        </div>
      </t>
    </t>
    <div id="spreadsheet-container">
      <t t-if="state.loading">
        <div id="loading">Loading…</div>
      </t>
      <t t-elif="model">
        <Spreadsheet
          model="model"
          notifyUser.bind="notifyUser"
          t-key="state.modelKey"
        />
      </t>
    </div>
  </div>
`;

FileManagerDemo.components = { Spreadsheet };
FileManagerDemo.props = {};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function setup() {
  const templates = await (await fetch("../build/o_spreadsheet.xml")).text();
  const app = new owl.App(FileManagerDemo, { dev: true, warnIfNoStaticProps: true });
  app.addTemplates(templates);
  app.mount(document.body);
}

whenReady(setup);
