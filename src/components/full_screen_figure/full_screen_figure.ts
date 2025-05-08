import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { figureRegistry } from "../../registries/figures_registry";
import { Store, useStore } from "../../store_engine";
import { SpreadsheetChildEnv, UID } from "../../types";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { FullScreenFigureStore } from "./full_screen_figure_store";

interface Props {}

interface State {
  fullScreenFigureId: UID | undefined;
}
export class FullScreenFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenFigure";
  static props = {};
  static components = {};

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;
  private ref = useRef("fullScreenFigure");

  spreadsheetRect = useSpreadsheetRect();

  figureRegistry = figureRegistry;

  state = useState<State>({
    fullScreenFigureId: undefined,
  });

  setup() {
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);

    useEffect(
      (el) => el?.focus(),
      () => [this.ref.el]
    );
  }

  get figureUI() {
    return this.fullScreenFigureStore.fullScreenFigure;
  }

  get figureStyle() {
    return "";
  }

  exitFullScreen() {
    if (this.figureUI) {
      this.fullScreenFigureStore.toggleFullScreenFigure(this.figureUI.id);
    }
  }

  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      this.exitFullScreen();
    }
  }
}
