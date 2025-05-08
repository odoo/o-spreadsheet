import { Component, onMounted, useEffect, useRef, useState } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { figureRegistry } from "../../registries/figures_registry";
import { Store, useStore } from "../../store_engine";
import { SpreadsheetChildEnv, UID } from "../../types";
import { cssPropertiesToCss } from "../helpers";
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
    onMounted(() => {
      const el = this.ref.el;
      if (!el || !this.figureUI) return;
    });

    let lastFullScreenFigureId: string | undefined;
    useEffect(() => {
      if (!this.figureUI || lastFullScreenFigureId === this.figureUI.id) return;

      this.doAnimation("enter");
    });
  }

  get figureUI() {
    return this.fullScreenFigureStore.fullScreenFigure;
  }

  get figureStyle() {
    return "";
  }

  exitFullScreen() {
    this.doAnimation("exit", () => {
      if (this.figureUI) {
        this.fullScreenFigureStore.toggleFullScreenFigure(this.figureUI.id);
      }
    });
  }

  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      this.exitFullScreen();
    }
  }

  private doAnimation(mode: "enter" | "exit", onAnimationEnd?: () => void) {
    const el = this.ref.el;
    if (!el || !this.figureUI) return;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const figure = this.env.model.getters.getFigure(sheetId, this.figureUI.id)!;
    const originalFigureUi = this.env.model.getters.getFigureUI(sheetId, figure);

    const gridEl = document.querySelector(".o-grid")!;
    const gridRect = gridEl.getBoundingClientRect();

    const offset2 = this.env.isDashboard() ? { x: 0, y: 0 } : { x: HEADER_WIDTH, y: HEADER_HEIGHT };

    const originalFigurePosition = {
      // width: "0px",
      top: `${originalFigureUi.y + gridRect.top + offset2.y}px`,
      left: `${originalFigureUi.x + gridRect.left + offset2.x}px`,
      width: `${originalFigureUi.width}px`,
      height: `${originalFigureUi.height}px`,
    };

    const fullScreenFigureDims = {
      top: "0px",
      left: "0px",
      width: "100%",
      height: "100%",
    };

    const animation = el.animate(
      mode === "enter"
        ? [originalFigurePosition, fullScreenFigureDims]
        : [fullScreenFigureDims, originalFigurePosition],
      {
        duration: 3500,
        easing: "ease",
      }
    );
    animation.onfinish = () => {
      onAnimationEnd?.();
    };
  }

  get style() {
    const gridEl = document.querySelector(".o-grid");
    if (!this.figureUI || !gridEl) return "";
    const sheetId = this.env.model.getters.getActiveSheetId();
    const figure = this.env.model.getters.getFigure(sheetId, this.figureUI.id)!;
    const originalFigureUi = this.env.model.getters.getFigureUI(sheetId, figure);

    const gridRect = gridEl.getBoundingClientRect();

    const offset2 = this.env.isDashboard() ? { x: 0, y: 0 } : { x: HEADER_WIDTH, y: HEADER_HEIGHT };

    const originalFigurePosition = {
      // width: "0px",
      top: `${originalFigureUi.y + gridRect.top + offset2.y}px`,
      left: `${originalFigureUi.x + gridRect.left + offset2.x}px`,
      width: `${originalFigureUi.width}px`,
      height: `${originalFigureUi.height}px`,
    };
    return cssPropertiesToCss(originalFigurePosition);
  }
}
