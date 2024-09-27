export class UuidGenerator {
  private nextId = 1;

  uuidv4(): string {
    return String(this.nextId++);
  }

  setNextId(i: number) {
    this.nextId = i;
  }
}
