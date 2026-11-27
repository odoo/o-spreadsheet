class MockResizeObserver {
  public cb: Function;
  constructor(cb: Function) {
    this.cb = cb;
  }
  observe(target: Element) {
    window.resizers.add(this);
    Promise.resolve().then(() => this.cb([createResizeObserverEntry(target)], this));
  }

  unobserve() {
    window.resizers.remove(this);
  }

  disconnect() {
    window.resizers.remove(this);
  }
}
window.ResizeObserver = MockResizeObserver;

function createResizeObserverEntry(target: Element) {
  const { clientWidth: width, clientHeight: height } = target;
  return { target, contentRect: { x: 0, y: 0, width, height } };
}

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
