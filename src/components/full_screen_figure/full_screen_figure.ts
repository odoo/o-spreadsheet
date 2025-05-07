import { Component, onMounted, useEffect, useRef } from "@odoo/owl";
import { figureRegistry } from "../../registries/figures_registry";
import { Store, useStore } from "../../store_engine";
import { SpreadsheetChildEnv } from "../../types";
import { FullScreenFigureStore } from "./full_screen_figure_store";

interface Props {}

export class FullScreenFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenFigure";
  static props = {};
  static components = {};

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  figureRegistry = figureRegistry;

  setup() {
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);
    const ref = useRef("fullScreenFigure");
    useEffect(
      (el) => el?.focus(),
      () => [ref.el]
    );
    onMounted(() => {
      const el = ref.el;
      if (!el || !this.figureUI) return;
    });

    useEffect(() => {
      console.log("useEffect", this.figureUI);
      const el = ref.el;
      if (!el || !this.figureUI) return;
      el.classList.remove("w-100", "h-100");
      el.style.width = "0px";
      el.style.height = "0px";

      const realFigure = document.querySelector(`.o-figure[data-id="${this.figureUI.id}"]`);
      console.log("realFigure", realFigure);
      if (!realFigure) return;
      const rect = realFigure.getBoundingClientRect();
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      // trigger reflow
      el.offsetHeight;
      console.log("el", el);
      // el.style.transition = "all 0.4s ease-in-out";
      // el.classList.add("w-100", "h-100");
      // el.style.left = "0px";
      // el.style.top = "0px";
    });
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
