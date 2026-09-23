/**
 * jsdom implements neither `navigator.clipboard` nor `ClipboardItem`, and its `Blob` has
 * no `text()`. Mock them so the real `NavigatorClipboardPlugin` runs in tests.
 */

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

class MockNavigatorClipboard {
  items: MockClipboardItem[] = [];

  async write(items: MockClipboardItem[]) {
    this.items = items;
  }

  async read() {
    return this.items;
  }
}

/**
 * The content of a jsdom Blob is only reachable through a FileReader, which jsdom
 * schedules with nested `setImmediate` calls: a FileReader-based shim would hang forever
 * under `jest.useFakeTimers()`. Read its internal buffer synchronously instead.
 */
Blob.prototype.text ??= function (this: Blob) {
  const impl = Object.getOwnPropertySymbols(this).find((s) => s.toString() === "Symbol(impl)")!;
  return Promise.resolve((this as any)[impl]._buffer.toString("utf8"));
};

// @ts-ignore
globalThis.ClipboardItem ??= MockClipboardItem;

export const mockClipboard = new MockNavigatorClipboard();

Object.defineProperty(navigator, "clipboard", { value: mockClipboard, configurable: true });
