import { TextValueProvider } from "../../components/composer/autocomplete_dropdown";
import { Composer } from "../../components/composer/composer";
import { KeybindsRegistry } from "../keybinds_registry";

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export const composerKeybindsRegistry = new KeybindsRegistry<Composer>();

function processArrowKeys(comp: Composer, ev: KeyboardEvent) {
  if (comp.getters.isSelectingForComposer()) {
    comp.functionDescriptionState.showDescription = false;
    return;
  }
  ev.stopPropagation();
  const autoCompleteComp = comp.autoCompleteRef.comp as TextValueProvider;
  if (
    ["ArrowUp", "ArrowDown"].includes(ev.key) &&
    comp.autoCompleteState.showProvider &&
    autoCompleteComp
  ) {
    ev.preventDefault();
    if (ev.key === "ArrowUp") {
      autoCompleteComp.moveUp();
    } else {
      autoCompleteComp.moveDown();
    }
  }
}

function processEnterKey(comp: Composer, ev: KeyboardEvent) {
  ev.preventDefault();
  ev.stopPropagation();
  const autoCompleteComp = comp.autoCompleteRef.comp as TextValueProvider;
  if (comp.autoCompleteState.showProvider && autoCompleteComp) {
    const autoCompleteValue = autoCompleteComp.getValueToFill();
    if (autoCompleteValue) {
      comp.autoComplete(autoCompleteValue);
      return;
    }
  }
  comp.dispatch("STOP_EDITION");
  comp.dispatch("MOVE_POSITION", {
    deltaX: 0,
    deltaY: ev.shiftKey ? -1 : 1,
  });
}
composerKeybindsRegistry
  .add("ENTER", {
    description: "ENTER",
    action: (comp, ev) => processEnterKey(comp, ev),
  })
  .add("SHIFT+ENTER", {
    description: "SHIFT+ENTER",
    action: (comp, ev) => processEnterKey(comp, ev),
  })
  .add("ESCAPE", {
    description: "ESCAPE",
    action: (comp) => {
      comp.dispatch("STOP_EDITION", { cancel: true });
    },
  })
  .add("TAB", {
    description: "TAB",
    action: (comp, ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const autoCompleteComp = comp.autoCompleteRef.comp as TextValueProvider;
      if (comp.autoCompleteState.showProvider && autoCompleteComp) {
        const autoCompleteValue = autoCompleteComp.getValueToFill();
        if (autoCompleteValue) {
          comp.autoComplete(autoCompleteValue);
          return;
        }
      } else {
        // when completing with tab, if there is no value to complete, the active cell will be moved to the right.
        // we can't let the model think that it is for a ref selection.
        // todo: check if this can be removed someday
        comp.dispatch("STOP_COMPOSER_RANGE_SELECTION");
      }

      const deltaX = ev.shiftKey ? -1 : 1;
      comp.dispatch("MOVE_POSITION", { deltaX, deltaY: 0 });
    },
  })
  .add("F2", {
    description: "Toggle Focus",
    action: () => {
      console.log("Not implemented");
    },
  })
  .add("F4", {
    description: "Switch Range Format",
    action: () => {
      console.log("Not implemented");
    },
  })
  .add("ARROWLEFT", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  })
  .add("ARROWRIGHT", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  })
  .add("ARROWUP", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  })
  .add("ARROWDOWN", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  })
  .add("SHIFT+ARROWLEFT", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  })
  .add("SHIFT+ARROWRIGHT", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  })
  .add("SHIFT+ARROWUP", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  })
  .add("SHIFT+ARROWDOWN", {
    description: "",
    action: (comp, ev) => {
      processArrowKeys(comp, ev);
    },
  });
