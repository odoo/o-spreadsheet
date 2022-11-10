import { range } from "../../helpers/misc";
import { addAction, KeydownDescription } from "../helpers/key_mapping";
import { Grid } from "./grid";

export const gridKeydownMapping: Record<string, KeydownDescription<Grid>> = {};

addAction(gridKeydownMapping, "ENTER", {
  action: (comp: Grid) => {
    const cell = comp.env.model.getters.getActiveCell();
    !cell || cell.isEmpty()
      ? comp.props.onGridComposerCellFocused()
      : comp.props.onComposerContentFocused();
  },
});
addAction(gridKeydownMapping, "ArrowLeft", {
  action: (comp: Grid, ev: KeyboardEvent) => comp.processArrows(ev),
});
addAction(gridKeydownMapping, "ArrowRight", {
  action: (comp: Grid, ev: KeyboardEvent) => comp.processArrows(ev),
});
addAction(gridKeydownMapping, "ArrowDown", {
  action: (comp: Grid, ev: KeyboardEvent) => comp.processArrows(ev),
});
addAction(gridKeydownMapping, "ArrowUp", {
  action: (comp: Grid, ev: KeyboardEvent) => comp.processArrows(ev),
});

addAction(gridKeydownMapping, "CTRL+SHIFT+ ", {
  action: (comp: Grid) => {
    comp.env.model.selection.selectAll();
  },
});
addAction(gridKeydownMapping, "SHIFT+PAGEDOWN", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("ACTIVATE_NEXT_SHEET");
  },
});
addAction(gridKeydownMapping, "SHIFT+PAGEUP", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("ACTIVATE_PREVIOUS_SHEET");
  },
});
addAction(gridKeydownMapping, "PAGEDOWN", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("SHIFT_VIEWPORT_DOWN");
  },
});
addAction(gridKeydownMapping, "PAGEUP", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("SHIFT_VIEWPORT_UP");
  },
});
addAction(gridKeydownMapping, "CTRL+ ", {
  action: (comp: Grid) => {
    const sheetId = comp.env.model.getters.getActiveSheetId();
    const newZone = {
      ...comp.env.model.getters.getSelectedZone(),
      top: 0,
      bottom: comp.env.model.getters.getNumberRows(sheetId) - 1,
    };
    const position = comp.env.model.getters.getPosition();
    comp.env.model.selection.selectZone({ cell: position, zone: newZone });
  },
});
addAction(gridKeydownMapping, "SHIFT+ ", {
  action: (comp: Grid) => {
    const sheetId = comp.env.model.getters.getActiveSheetId();
    const newZone = {
      ...comp.env.model.getters.getSelectedZone(),
      left: 0,
      right: comp.env.model.getters.getNumberCols(sheetId) - 1,
    };
    const position = comp.env.model.getters.getPosition();
    comp.env.model.selection.selectZone({ cell: position, zone: newZone });
  },
});
addAction(gridKeydownMapping, "TAB", {
  action: (comp: Grid) => {
    comp.env.model.selection.moveAnchorCell("right", "one");
  },
});

addAction(gridKeydownMapping, "SHIFT+TAB", {
  action: (comp: Grid) => {
    comp.env.model.selection.moveAnchorCell("left", "one");
  },
});
addAction(gridKeydownMapping, "F2", {
  action: (comp: Grid) => {
    const cell = comp.env.model.getters.getActiveCell();
    !cell || cell.isEmpty()
      ? comp.props.onGridComposerCellFocused()
      : comp.props.onComposerContentFocused();
  },
});

addAction(gridKeydownMapping, "DELETE", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("DELETE_CONTENT", {
      sheetId: comp.env.model.getters.getActiveSheetId(),
      target: comp.env.model.getters.getSelectedZones(),
    });
  },
});

addAction(gridKeydownMapping, "BACKSPACE", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("DELETE_CONTENT", {
      sheetId: comp.env.model.getters.getActiveSheetId(),
      target: comp.env.model.getters.getSelectedZones(),
    });
  },
});
addAction(gridKeydownMapping, "CTRL+A", {
  action: (comp: Grid) => {
    comp.env.model.selection.loopSelection();
  },
});
addAction(gridKeydownMapping, "CTRL+Z", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("REQUEST_UNDO");
  },
});
addAction(gridKeydownMapping, "CTRL+Y", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("REQUEST_REDO");
  },
});
addAction(gridKeydownMapping, "CTRL+B", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("SET_FORMATTING", {
      sheetId: comp.env.model.getters.getActiveSheetId(),
      target: comp.env.model.getters.getSelectedZones(),
      style: { bold: !comp.env.model.getters.getCurrentStyle().bold },
    });
  },
});
addAction(gridKeydownMapping, "CTRL+I", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("SET_FORMATTING", {
      sheetId: comp.env.model.getters.getActiveSheetId(),
      target: comp.env.model.getters.getSelectedZones(),
      style: { italic: !comp.env.model.getters.getCurrentStyle().italic },
    });
  },
});
addAction(gridKeydownMapping, "CTRL+U", {
  action: (comp: Grid) => {
    comp.env.model.dispatch("SET_FORMATTING", {
      sheetId: comp.env.model.getters.getActiveSheetId(),
      target: comp.env.model.getters.getSelectedZones(),
      style: { underline: !comp.env.model.getters.getCurrentStyle().underline },
    });
  },
});
addAction(gridKeydownMapping, "ALT+=", {
  action: (comp: Grid) => {
    const sheetId = comp.env.model.getters.getActiveSheetId();

    const mainSelectedZone = comp.env.model.getters.getSelectedZone();
    const { anchor } = comp.env.model.getters.getSelection();
    const sums = comp.env.model.getters.getAutomaticSums(sheetId, mainSelectedZone, anchor.cell);
    if (
      comp.env.model.getters.isSingleCellOrMerge(sheetId, mainSelectedZone) ||
      (comp.env.model.getters.isEmpty(sheetId, mainSelectedZone) && sums.length <= 1)
    ) {
      const zone = sums[0]?.zone;
      const zoneXc = zone ? comp.env.model.getters.zoneToXC(sheetId, sums[0].zone) : "";
      const formula = `=SUM(${zoneXc})`;
      comp.props.onGridComposerCellFocused(formula, { start: 5, end: 5 + zoneXc.length });
    } else {
      comp.env.model.dispatch("SUM_SELECTION");
    }
  },
});
addAction(gridKeydownMapping, "CTRL+HOME", {
  action: (comp: Grid) => {
    const sheetId = comp.env.model.getters.getActiveSheetId();
    const { col, row } = comp.env.model.getters.getNextVisibleCellPosition(sheetId, 0, 0);
    comp.env.model.selection.selectCell(col, row);
  },
});
addAction(gridKeydownMapping, "CTRL+END", {
  action: (comp: Grid) => {
    const sheetId = comp.env.model.getters.getActiveSheetId();
    const col = comp.env.model.getters.findVisibleHeader(
      sheetId,
      "COL",
      range(0, comp.env.model.getters.getNumberCols(sheetId)).reverse()
    )!;
    const row = comp.env.model.getters.findVisibleHeader(
      sheetId,
      "ROW",
      range(0, comp.env.model.getters.getNumberRows(sheetId)).reverse()
    )!;
    comp.env.model.selection.selectCell(col, row);
  },
});
