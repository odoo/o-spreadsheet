import { Grid } from "../../components/grid";
import { findCellInNewZone } from "../../helpers";
import { KeybindsRegistry } from "../keybinds_registry";

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export const gridKeybindsRegistry = new KeybindsRegistry<Grid>();

function processArrows(comp: Grid, ev: KeyboardEvent) {
  ev.preventDefault();
  ev.stopPropagation();
  const deltaMap = {
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
  };
  const delta = deltaMap[ev.key];
  if (ev.shiftKey) {
    const oldZone = comp.getters.getSelectedZone();
    comp.dispatch("ALTER_SELECTION", { delta });
    const newZone = comp.getters.getSelectedZone();
    const viewport = comp.getters.getActiveSnappedViewport();
    const sheet = comp.getters.getActiveSheet();
    const [col, row] = findCellInNewZone(oldZone, newZone, viewport);

    const { left, right, top, bottom, offsetX, offsetY } = viewport;
    const newOffsetX = col < left || col > right - 1 ? sheet.cols[left + delta[0]].start : offsetX;
    const newOffsetY = row < top || row > bottom - 1 ? sheet.rows[top + delta[1]].start : offsetY;
    if (newOffsetX !== offsetX || newOffsetY !== offsetY) {
      comp.dispatch("SET_VIEWPORT_OFFSET", { offsetX: newOffsetX, offsetY: newOffsetY });
    }
  } else {
    comp.dispatch("MOVE_POSITION", { deltaX: delta[0], deltaY: delta[1] });
  }

  if (comp.getters.isPaintingFormat()) {
    comp.dispatch("PASTE", {
      target: comp.getters.getSelectedZones(),
    });
  }
}

gridKeybindsRegistry
  .add("ARROWLEFT", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("ARROWRIGHT", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("ARROWUP", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("ARROWDOWN", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("SHIFT+ARROWLEFT", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("SHIFT+ARROWRIGHT", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("SHIFT+ARROWUP", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("SHIFT+ARROWDOWN", {
    description: "test",
    action: (comp, ev) => processArrows(comp, ev),
  })
  .add("ENTER", {
    description: "test",
    action: (comp) => comp.trigger("composer-focused"),
  })
  .add("TAB", {
    description: "test",
    action: (comp) => comp.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 }),
  })
  .add("SHIFT+TAB", {
    description: "test",
    action: (comp) => comp.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 }),
  })
  .add("F2", {
    description: "test",
    action: (comp) => comp.trigger("composer-focused"),
  })
  .add("DELETE", {
    description: "test",
    action: (comp) =>
      comp.dispatch("DELETE_CONTENT", {
        sheetId: comp.getters.getActiveSheetId(),
        target: comp.getters.getSelectedZones(),
      }),
  })
  .add("CTRL+A", {
    description: "test",
    action: (comp) => comp.dispatch("SELECT_ALL"),
  })
  .add("CTRL+S", {
    description: "test",
    action: (comp) => comp.trigger("save-requested"),
  })
  .add("CTRL+Z", {
    description: "test",
    action: (comp) => comp.dispatch("REQUEST_UNDO"),
  })
  .add("CTRL+Y", {
    description: "test",
    action: (comp) => comp.dispatch("REQUEST_REDO"),
  })
  .add("CTRL+B", {
    description: "test",
    action: (comp) =>
      comp.dispatch("SET_FORMATTING", {
        sheetId: comp.getters.getActiveSheetId(),
        target: comp.getters.getSelectedZones(),
        style: { bold: !comp.getters.getCurrentStyle().bold },
      }),
  })
  .add("CTRL+I", {
    description: "test",
    action: (comp) =>
      comp.dispatch("SET_FORMATTING", {
        sheetId: comp.getters.getActiveSheetId(),
        target: comp.getters.getSelectedZones(),
        style: { italic: !comp.getters.getCurrentStyle().italic },
      }),
  })
  .add("ALT+=", {
    description: "test",
    action: (comp) => {
      const sheetId = comp.getters.getActiveSheetId();

      const mainSelectedZone = comp.getters.getSelectedZone();
      const sums = comp.getters.getAutomaticSums(
        sheetId,
        mainSelectedZone,
        comp.getters.getPosition()
      );
      if (
        comp.getters.isSingleCellOrMerge(sheetId, mainSelectedZone) ||
        (comp.getters.isEmpty(sheetId, mainSelectedZone) && sums.length <= 1)
      ) {
        const zone = sums[0]?.zone;
        const zoneXc = zone ? comp.getters.zoneToXC(sheetId, sums[0].zone) : "";
        const formula = `=SUM(${zoneXc})`;
        comp.trigger("composer-focused", {
          content: formula,
          selection: { start: 5, end: 5 + zoneXc.length },
        });
      } else {
        comp.dispatch("SUM_SELECTION");
      }
    },
  });
