import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { CSSProperties, FigureUI, Rect } from "../../../types";
import { GridCanvas } from "../../grid_canvas/grid_canvas";

interface Props {
  figureUI: FigureUI;
  editFigureStyle?: (properties: CSSProperties) => void;
  openContextMenu?: (anchorRect: Rect, onClose?: () => void) => void;
}

export class FigureCanvas extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureCanvas";
  static props = {
    figureUI: Object,
    editFigureStyle: { type: Function, optional: true },
    openContextMenu: { type: Function, optional: true },
  };
  static components = { GridCanvas };

  get gridCanvasProps(): GridCanvas["props"] {
    const sheetId = "pivot";
    const zone = { top: 0, left: 0, bottom: 100, right: 100 };
    return {
      sheetId,
      zone,
    };
  }
}
