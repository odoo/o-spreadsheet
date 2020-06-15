import { MenuItemRegistry } from "../menu_items_registry";
import { _lt } from "../../translation";

export const sheetMenuRegistry = new MenuItemRegistry();

sheetMenuRegistry
  .add("delete", {
    name: _lt("Delete"),
    sequence: 10,
    action: () => console.warn("Not implemented"),
  })
  .add("duplicate", {
    name: _lt("Duplicate"),
    sequence: 20,
    action: () => console.warn("Not implemented"),
  })
  .add("rename", {
    name: _lt("Rename"),
    sequence: 30,
    action: () => console.warn("Not implemented"),
  })
  .add("move_right", {
    name: _lt("Move right"),
    sequence: 40,
    action: () => console.warn("Not implemented"),
  })
  .add("move_left", {
    name: _lt("Move left"),
    sequence: 50,
    action: () => console.warn("Not implemented"),
  });
