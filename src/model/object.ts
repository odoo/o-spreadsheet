import { GridState } from "./state";

export function addObject(state: GridState, type: string, key: string, object: Object) {
  if (!(type in state.objects)) {
    state.objects[type] = {};
  }
  state.objects[type][key] = object;
}

export function removeObject(state: GridState, type: string, key: string) {
  if (!(type in state.objects) || !(key in state.objects[type])) {
    return;
  }
  delete state.objects[type][key];
}

export function getObject(state: GridState, type: string, key: string): Object {
  if (!(type in state.objects) || !(key in state.objects[type])) {
    throw new Error(`Could not find ${type}/${key} in objects.`);
  }
  return state.objects[type] && state.objects[type][key];
}

export function getObjects(state: GridState, type: string): { [key: string]: Object } {
  if (!(type in state.objects)) {
    throw new Error(`Could not find ${type} in objects.`);
  }
  return state.objects[type];
}
