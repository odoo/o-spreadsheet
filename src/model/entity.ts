import { Workbook } from "./types";

export function addEntity(state: Workbook, type: string, key: string, entity: any) {
  if (!(type in state.entities)) {
    state.entities[type] = {};
  }
  state.entities[type][key] = entity;
}

export function removeEntity(state: Workbook, type: string, key: string) {
  if (!(type in state.entities) || !(key in state.entities[type])) {
    return;
  }
  delete state.entities[type][key];
}

export function getEntity(state: Workbook, type: string, key: string): any {
  if (!(type in state.entities) || !(key in state.entities[type])) {
    throw new Error(`Could not find ${type}/${key} in entities.`);
  }
  return state.entities[type] && state.entities[type][key];
}

export function getEntities(state: Workbook, type: string): { [key: string]: any } {
  if (!(type in state.entities)) {
    throw new Error(`Could not find ${type} in entities.`);
  }
  return state.entities[type];
}
