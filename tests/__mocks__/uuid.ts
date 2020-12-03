let nextId = 1;

export function setIsFastStrategy() {}

export function uuidv4(): string {
  return String(nextId++);
}

export const setNextId = (i) => (nextId = i);
