class MockResizeObserver {
  public cb: Function;
  constructor(cb: Function) {
    this.cb = cb;
  }
  observe() {
    //@ts-ignore
    global.resizers.add(this);
    Promise.resolve().then(() => this.cb());
  }

  unobserve() {
    //@ts-ignore
    global.resizers.remove(this);
  }

  disconnect() {
    //@ts-ignore
    global.resizers.remove(this);
  }
}
global.ResizeObserver = MockResizeObserver;

class Resizers {
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

//@ts-ignore
global.resizers = new Resizers();
