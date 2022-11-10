import { Component } from "@odoo/owl";

const keyModifiersOrder = { CTRL: 0, ALT: 1, SHIFT: 2 };

function buildKeyFromEvent(ev: KeyboardEvent): string {
  let key: string = "";
  if (ev.ctrlKey) key += "CTRL+";
  if (ev.metaKey) key += "CTRL+";
  if (ev.altKey) key += "ALT+";
  if (ev.shiftKey) key += "SHIFT+";
  key += ev.key.toUpperCase();
  return key;
}

export interface KeydownDescription<T extends Component> {
  action: (comp: T, ev: KeyboardEvent) => void;
  stopPropagation: boolean | ((comp: T) => boolean);
  preventDefault: boolean | ((comp: T) => boolean);
}

export function addAction<T extends Component>(
  mapping: Record<string, KeydownDescription<T>>,
  key: string,
  description: Partial<KeydownDescription<T>>
) {
  const descr = {
    action: () => {},
    stopPropagation: true,
    preventDefault: true,
    ...description,
  };
  const nameArgs = key.toUpperCase().split("+");
  const orderedNameArgs = nameArgs.sort((a, b) => keyModifiersOrder[a] - keyModifiersOrder[b]);
  mapping[orderedNameArgs.join("+")] = descr;
}

export function processKeyboardEvent<T extends Component>(
  comp: T,
  ev: KeyboardEvent,
  mapping: Record<string, KeydownDescription<T>>
) {
  const key = buildKeyFromEvent(ev);
  const description = mapping[key];
  if (description) {
    if (description.stopPropagation) {
      ev.stopPropagation();
    }
    if (description.preventDefault) {
      ev.preventDefault();
    }
    description.action(comp, ev);
  }
}
