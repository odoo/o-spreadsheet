class MockResizeObserver {
  public cb: Function;
  private target: Element | undefined;

  constructor(cb: Function) {
    this.cb = cb;
  }

  observe(target: Element) {
    this.target = target;
    window.resizers.add(this);
    void Promise.resolve().then(() => this.notify());
  }

  unobserve() {
    window.resizers.remove(this);
  }

  disconnect() {
    window.resizers.remove(this);
  }

  /**
   * A real ResizeObserver invokes its callback with a `ResizeObserverEntry[]`, and some code
   * (e.g. chart.js) unconditionally reads `entries[0].contentRect`.
   */
  notify() {
    if (!this.target) {
      return;
    }
    this.cb([{ target: this.target, contentRect: this.target.getBoundingClientRect() }]);
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
    this.resizers.forEach((r) => r.notify());
  }
}

window.resizers = new Resizers();
