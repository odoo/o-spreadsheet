class MockWorker implements Worker {
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = () => null;
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = () => null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = () => null;

  addEventListener<K extends keyof WorkerEventMap>(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ): void;
  addEventListener<K extends keyof AbstractWorkerEventMap>(
    type: K,
    listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type, listener, options?: boolean | AddEventListenerOptions): void {}

  dispatchEvent(event: Event): boolean {
    return false;
  }

  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: StructuredSerializeOptions): void;
  postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions): void {}

  removeEventListener<K extends keyof WorkerEventMap>(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
  removeEventListener<K extends keyof AbstractWorkerEventMap>(
    type: K,
    listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(type, listener, options?: boolean | EventListenerOptions): void {}

  terminate(): void {}
}

//@ts-ignore
global.Worker = MockWorker;
