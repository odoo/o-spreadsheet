import { Component, onMounted, useEffect, useRef, useState } from "@odoo/owl";
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
    onMounted(() => {
      const el = this.ref.el;
      if (!el || !this.figureUI) return;
    });

    let lastFullScreenFigureId: string | undefined;
    useEffect(() => {
      if (!this.figureUI || lastFullScreenFigureId === this.figureUI.id) return;

      console.log("soTheanimation");
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
    // const sheetId = this.env.model.getters.getActiveSheetId();
    // const figure = this.env.model.getters.getFigure(sheetId, this.figureUI.id)!;
    // const originalFigureUi = this.env.model.getters.getFigureUI(sheetId, figure);

    // const gridEl = document.querySelector(".o-grid")!;
    // const gridRect = gridEl.getBoundingClientRect();

    // const offset2 = this.env.isDashboard() ? { x: 0, y: 0 } : { x: HEADER_WIDTH, y: HEADER_HEIGHT };

    // const originalFigurePosition = {
    //   // width: "0px",
    //   top: `${originalFigureUi.y + gridRect.top + offset2.y}px`,
    //   left: `${originalFigureUi.x + gridRect.left + offset2.x}px`,
    //   width: `${originalFigureUi.width}px`,
    //   height: `${originalFigureUi.height}px`,
    // };

    const originalfigure = document.querySelector(`.o-figure[data-id="${this.figureUI.id}"]`);
    if (!originalfigure) return;

    const parentEl = el.parentElement;
    if (!parentEl) return;
    const parentRect = parentEl.getBoundingClientRect();
    const rect = originalfigure.getBoundingClientRect();

    const heightRatio = rect.height / parentRect.height;
    const widthRatio = rect.width / parentRect.width;

    const originalFigurePosition = {
      top: `${rect.top - this.spreadsheetRect.y}px`,
      left: `${rect.left - this.spreadsheetRect.x}px`,
      // width: `${rect.width}px`,
      // height: `${rect.height}px`,
      transform: `scale(${widthRatio}, ${heightRatio})`,
    };

    const fullScreenFigureDims = {
      top: "0px",
      left: "0px",
      // width: "100%",
      // height: "100%",
      // width: `${parentRect.width}px`,
      // height: `${parentRect.height}px`,
      transform: "scale(1, 1)",
      // transform: `scale(${widthRatio}, ${heightRatio})`,
    };

    const animation = el.animate(
      mode === "enter"
        ? [originalFigurePosition, fullScreenFigureDims]
        : [fullScreenFigureDims, originalFigurePosition],
      {
        duration: 350,
        easing: "ease",
      }
    );
    animation.onfinish = () => {
      onAnimationEnd?.();
    };
    // el.style.left = originalFigurePosition.left;
    // el.style.top = originalFigurePosition.top;
    // el.style.transform = originalFigurePosition.transform;
  }

  get style() {
    return "";
    // const gridEl = document.querySelector(".o-grid");
    // if (!this.figureUI || !gridEl) return "";
    // const sheetId = this.env.model.getters.getActiveSheetId();
    // const figure = this.env.model.getters.getFigure(sheetId, this.figureUI.id)!;
    // const originalFigureUi = this.env.model.getters.getFigureUI(sheetId, figure);

    // const gridRect = gridEl.getBoundingClientRect();

    // const offset2 = this.env.isDashboard() ? { x: 0, y: 0 } : { x: HEADER_WIDTH, y: HEADER_HEIGHT };

    // const originalFigurePosition = {
    //   // width: "0px",
    //   top: `${originalFigureUi.y + gridRect.top + offset2.y}px`,
    //   left: `${originalFigureUi.x + gridRect.left + offset2.x}px`,
    //   width: `${originalFigureUi.width}px`,
    //   height: `${originalFigureUi.height}px`,
    // };
    // return cssPropertiesToCss(originalFigurePosition);
  }
}
