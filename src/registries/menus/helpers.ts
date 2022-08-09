import { FullMenuItem } from "..";
import { SpreadsheetChildEnv } from "../../types";

export function getMenuChildren(node: FullMenuItem, env: SpreadsheetChildEnv): FullMenuItem[] {
  const children: FullMenuItem[] = [];
  for (const child of node.children) {
    if (typeof child === "function") {
      children.push(...child(env));
    } else {
      children.push(child);
    }
  }
  return children.sort((a, b) => a.sequence - b.sequence);
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
