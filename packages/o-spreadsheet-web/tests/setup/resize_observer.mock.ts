class MockResizeObserver {
  public cb: Function;
  constructor(cb: Function) {
    this.cb = cb;
  }
  observe() {
    window.resizers.add(this);
    Promise.resolve().then(() => this.cb());
  }

  unobserve() {
    window.resizers.remove(this);
  }

  disconnect() {
    window.resizers.remove(this);
  }
}
window.ResizeObserver = MockResizeObserver;

export class Resizers {
  private resizers: Set<MockResizeObserver> = new Set();

  add(resizeObserver: MockResizeObserver) {
    this.resizers.add(resizeObserver);
  }

  remove(resizeObserver: MockResizeObserver) {
    this.resizers.delete(resizeObserver);
  }

  removeAll() {
    this.resizers = new Set();
  }

  resize() {
    this.resizers.forEach((r) => r.cb());
  }
}

window.resizers = new Resizers();
