export class MockClipboardItem {
  private blobs: Record<string, Blob> = {};

  constructor(items: Record<string, Blob | string>) {
    for (const [type, value] of Object.entries(items)) {
      this.blobs[type] = value instanceof Blob ? value : new Blob([value], { type });
    }
  }

  get types() {
    return Object.keys(this.blobs);
  }

  async getType(type: string): Promise<Blob> {
    return this.blobs[type];
  }
}

export class MockNavigatorClipboard {
  items: MockClipboardItem[] = [];

  async write(items: MockClipboardItem[]) {
    this.items = items;
  }

  async writeText(text: string) {
    const blob = new Blob([text], { type: "text/plain" });
    this.items = [new MockClipboardItem({ "text/plain": blob })];
  }

  async read() {
    return this.items;
  }

  async readText() {
    return (await this.items[0]?.getType("text/plain"))?.text() || "";
  }
}

export function defineMissingJSDomClipboardProperties() {
  // Blob.text is not defined in JSDom,
  Blob.prototype.text = function (this: Blob) {
    const impl = Object.getOwnPropertySymbols(this).find((s) => s.toString() === "Symbol(impl)")!;
    return Promise.resolve((this as any)[impl]._buffer.toString("utf8"));
  };

  // @ts-ignore ClipboardItem not defined in JSDom
  globalThis.ClipboardItem = MockClipboardItem;
}

export function mockNavigatorClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: new MockNavigatorClipboard(),
    configurable: true,
  });
}
