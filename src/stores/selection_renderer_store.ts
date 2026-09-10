import { SELECTION_BORDER_COLOR } from "../constants";
import { deepEquals } from "../helpers/misc";
import { positionToZone } from "../helpers/zones";
import { EASING_FN } from "../registries/cell_animation_registry";
import { UID, Zone } from "../types/misc";
import { GridRenderingContext, LayerName, Rect } from "../types/rendering";
import { SpreadsheetStore } from "./spreadsheet_store";

export const SELECTION_ANIMATION_DURATION = 100;

export interface SelectionRenderingState {
  sheetId: UID;
  selectedZonesRects: Rect[];
  activeZoneRect: Rect | null;
  selectedZones: Zone[];
  isWholeHeaderSelected: boolean;
  fillStyle: string;
  isDarkMode: boolean;
}

interface SelectionAnimation {
  startState: SelectionRenderingState;
  endState: SelectionRenderingState;
  currentState?: SelectionRenderingState;
  startTime: number | undefined;
  progress: number;
}

export class SelectionRendererStore extends SpreadsheetStore {
  mutators = ["disableAnimationForNextRender"] as const;

  private lastRenderingState: SelectionRenderingState | undefined = undefined;
  animatedSelection: SelectionAnimation | undefined = undefined;

  private animationDisabledForNextRender = false;

  disableAnimationForNextRender() {
    this.animationDisabledForNextRender = true;
    return "noStateChange";
  }

  get renderingLayers() {
    return ["Selection"] as const;
  }

  drawLayer(
    renderingContext: GridRenderingContext,
    layer: LayerName,
    timeStamp: number | undefined
  ) {
    const state = this.getRenderingState(renderingContext);
    const animatedState = this.getAnimatedSelectionState(state, timeStamp);
    this.drawSelection(renderingContext, animatedState);
  }

  private getRenderingState(renderingContext: GridRenderingContext): SelectionRenderingState {
    // FIXME: during the rendering process, we need to render the sheet/viewports of the GridRenderingContext
    // But in stores, there's nothing preventing us to call the getters or to use the store state, and draw
    // at the wrong position. We should think of a way to improve that.
    const { viewports, sheetId, selectedZones: zones } = renderingContext;

    const theme = this.getters.getSpreadsheetTheme();
    const onlyOneCell =
      zones.length === 1 && zones[0].left === zones[0].right && zones[0].top === zones[0].bottom;
    const fillStyle = onlyOneCell
      ? theme.singleCellSelectionBackgroundColor
      : theme.multipleCellsSelectionBackgroundColor;

    const numberOfRows = this.getters.getNumberRows(sheetId);
    const numberOfColumns = this.getters.getNumberCols(sheetId);

    const isWholeHeaderSelected = zones.some(
      (zone) =>
        (zone.top === 0 && zone.bottom === numberOfRows - 1) ||
        (zone.left === 0 && zone.right === numberOfColumns - 1)
    );

    const state: SelectionRenderingState = {
      isDarkMode: this.getters.isDarkMode(),
      sheetId,
      fillStyle,
      selectedZones: zones,
      selectedZonesRects: [],
      isWholeHeaderSelected,
      activeZoneRect: null,
    };

    for (const zone of zones) {
      if (!viewports.isZoneVisibleInViewport(sheetId, zone)) {
        continue;
      }
      const rect = viewports.getVisibleRect(sheetId, zone);
      state.selectedZonesRects.push(rect);
    }

    const position = renderingContext.activePosition;
    if (!position) {
      return state;
    }

    const zone = this.getters.isInMerge(position)
      ? this.getters.getMerge(position)!
      : positionToZone(position);
    state.activeZoneRect = viewports.getVisibleRect(sheetId, zone);
    return state;
  }

  drawSelection(renderingContext: GridRenderingContext, state: SelectionRenderingState) {
    const { ctx, thinLineWidth } = renderingContext;

    ctx.fillStyle = state.fillStyle;
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 1.5 * thinLineWidth;

    for (const rect of state.selectedZonesRects) {
      const { x, y, width, height } = rect;
      const currentLineWidth = ctx.lineWidth;
      if (!state.isDarkMode) {
        ctx.globalCompositeOperation = "multiply";
      }
      if (height === 0 || width === 0) {
        ctx.lineWidth = 3 * thinLineWidth;
      }
      if (height === 0 && width === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, width, height);
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeRect(x, y, width, height);
      }
      ctx.lineWidth = currentLineWidth;
    }

    ctx.globalCompositeOperation = "source-over";
    if (!state.activeZoneRect) {
      return;
    }

    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3 * thinLineWidth;
    const { x, y, width, height } = state.activeZoneRect;
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }

  private getAnimatedSelectionState(
    currentState: SelectionRenderingState,
    timeStamp: number | undefined
  ): SelectionRenderingState {
    const oldState = this.lastRenderingState;
    this.lastRenderingState = currentState;

    this.updateAnimationProgress(timeStamp);
    this.addOrCancelAnimation(currentState, oldState, timeStamp);
    this.updateCurrentAnimatedSelection();

    if (this.animatedSelection) {
      this.renderer.startAnimation("selection_renderer_animation");
      return this.animatedSelection.currentState || currentState;
    } else {
      this.renderer.stopAnimation("selection_renderer_animation");
      return currentState;
    }
  }

  private updateCurrentAnimatedSelection() {
    const animatedSelection = this.animatedSelection;
    if (!animatedSelection) {
      return;
    }
    const { startState, endState } = animatedSelection;

    const animatedState: SelectionRenderingState = {
      sheetId: endState.sheetId,
      fillStyle: endState.fillStyle,
      selectedZones: startState.selectedZones,
      selectedZonesRects: [],
      isDarkMode: endState.isDarkMode,
      isWholeHeaderSelected: startState.isWholeHeaderSelected,
      activeZoneRect: null,
    };
    const value = EASING_FN.easeOutQuart(animatedSelection.progress);

    const interpolateRect = (startRect: Rect, endRect: Rect, value: number) => ({
      x: startRect.x + (endRect.x - startRect.x) * value,
      y: startRect.y + (endRect.y - startRect.y) * value,
      width: startRect.width + (endRect.width - startRect.width) * value,
      height: startRect.height + (endRect.height - startRect.height) * value,
    });

    for (let i = 0; i < startState.selectedZonesRects.length; i++) {
      const startRect = startState.selectedZonesRects[i];
      const endRect = endState.selectedZonesRects[i];
      animatedState.selectedZonesRects[i] = interpolateRect(startRect, endRect, value);
    }

    if (startState.activeZoneRect && endState.activeZoneRect) {
      const startRect = startState.activeZoneRect;
      const endRect = endState.activeZoneRect;

      animatedState.activeZoneRect = interpolateRect(startRect, endRect, value);
    }

    animatedSelection.currentState = animatedState;
  }

  private updateAnimationProgress(timeStamp: number | undefined) {
    if (!this.animatedSelection || timeStamp === undefined) {
      return;
    }
    if (this.animatedSelection.startTime === undefined) {
      this.animatedSelection.startTime = timeStamp;
      return;
    }

    const elapsedTime = timeStamp - this.animatedSelection.startTime;
    const animationProgress = Math.min(elapsedTime / SELECTION_ANIMATION_DURATION, 1);
    this.animatedSelection.progress = animationProgress;
    if (animationProgress >= 1) {
      this.animatedSelection = undefined;
    }
  }

  private addOrCancelAnimation(
    currentState: SelectionRenderingState,
    lastState: SelectionRenderingState | undefined,
    timeStamp: number | undefined
  ) {
    if (!lastState) {
      return;
    }
    if (
      lastState.selectedZonesRects.length !== currentState.selectedZonesRects.length ||
      currentState.selectedZonesRects.length > 1 ||
      lastState.isWholeHeaderSelected ||
      currentState.isWholeHeaderSelected ||
      this.animationDisabledForNextRender
    ) {
      this.animatedSelection = undefined;
      this.animationDisabledForNextRender = false;
      return;
    }

    // Cancel the current animation if the end state has changed
    if (this.animatedSelection && !deepEquals(this.animatedSelection.endState, currentState)) {
      this.animatedSelection = undefined;
    }

    if (!this.animatedSelection) {
      if (
        deepEquals(lastState.selectedZones, currentState.selectedZones) ||
        lastState.sheetId !== currentState.sheetId
      ) {
        return;
      }
      this.animatedSelection = {
        startState: lastState,
        endState: currentState,
        startTime: timeStamp,
        progress: 0,
      };
    }
  }
}
