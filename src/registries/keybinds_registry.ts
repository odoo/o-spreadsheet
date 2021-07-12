import { Registry } from "../registry";

export interface AddKeybindAction<C> {
  description: string;
  action: (comp: C, ev: KeyboardEvent) => void;
}

const keyModifiersOrder = { CTRL: 0, ALT: 1, SHIFT: 2 };

export function getKeybindString(ev: KeyboardEvent): string {
  let keybindString = "";
  if (ev.ctrlKey) keybindString += "CTRL+";
  if (ev.metaKey) keybindString += "CTRL+";
  if (ev.altKey) keybindString += "ALT+";
  if (ev.shiftKey) keybindString += "SHIFT+";
  keybindString += ev.key.toUpperCase();
  return keybindString;
}
//------------------------------------------------------------------------------
// keybinds
//------------------------------------------------------------------------------
export class KeybindsRegistry<C> extends Registry<AddKeybindAction<C>> {
  /** Will reorder the name according to the KeyBindString specification */
  add(name: string, keybind: AddKeybindAction<C>) {
    name = name.toUpperCase();
    const nameArgs = name.split("+");
    const orderedNameArgs = nameArgs.sort((a, b) => keyModifiersOrder[a] - keyModifiersOrder[b]);
    super.add(orderedNameArgs.join("+"), keybind);
    return this;
  }
  getHandler(ev: KeyboardEvent) {
    return this.content[getKeybindString(ev)];
  }
}
