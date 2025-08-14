/**
 * KeepLast is a concurrency primitive that manages a list of tasks, and only
 * keeps the last task active.
 *
 */
export class KeepLast<T> {
  private lastId = 0;
  /**
   * Register a new task
   */
  add(promise: Promise<T>): Promise<T> {
    this.lastId++;
    const currentId = this.lastId;
    return new Promise((resolve, reject) => {
      promise
        .then((value) => {
          if (this.lastId === currentId) {
            resolve(value);
          }
        })
        .catch((reason) => {
          if (this.lastId === currentId) {
            reject(reason);
          }
        });
    });
  }
}
