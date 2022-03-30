import { FullMenuItem } from "..";
import { SpreadsheetChildEnv } from "../../types";

export function getMenuChildren(node: FullMenuItem, env: SpreadsheetChildEnv): FullMenuItem[] {
  if (typeof node.children === "function") {
    return node.children(env).sort((a, b) => a.sequence - b.sequence);
  }
  return node.children.sort((a, b) => a.sequence - b.sequence);
}

export function getMenuName(node: FullMenuItem, env: SpreadsheetChildEnv): string {
  if (typeof node.name === "function") {
    return node.name(env);
  }
  return node.name;
}
export function getMenuDescription(node: FullMenuItem): string {
  return node.description ? node.description : "";
}
