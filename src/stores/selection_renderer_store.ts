import { SELECTION_BORDER_COLOR } from "../constants";
import { deepCopy, deepEquals } from "../helpers/misc";
import { isRectInside } from "../helpers/rectangle";
import { positionToZone } from "../helpers/zones";
import { EASING_FN } from "../registries/cell_animation_registry";
import { GridRenderingContext, LayerName, Rect } from "../types/rendering";
import { SpreadsheetStore } from "./spreadsheet_store";

export const SELECTION_ANIMATION_DURATION = 130;

interface SelectionRenderingState {
  fillStyle: string;
  selectedZonesRects: Rect[];
  activeZoneRect: Rect | null;
  isDarkMode: boolean;
}

interface SelectionAnimation {
  startState: SelectionRenderingState;
  endState: SelectionRenderingState;
  startTime: number | undefined;
  progress: number;
}

export class SelectionRendererStore extends SpreadsheetStore {
  lastRenderingState: SelectionRenderingState | undefined = undefined;
  animatedSelection: SelectionAnimation | undefined = undefined;

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

    const state: SelectionRenderingState = {
      isDarkMode: this.getters.isDarkMode(),
      fillStyle,
      selectedZonesRects: [],
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
  ) {
    const oldState = this.lastRenderingState;
    this.lastRenderingState = currentState;

    this.updateAnimationProgress(timeStamp);
    this.addNewAnimation(currentState, oldState, timeStamp);

    if (this.animatedSelection) {
      this.renderer.startAnimation("selection_renderer_animation");
      return this.getCurrentAnimatedSelection(this.animatedSelection);
    } else {
      this.renderer.stopAnimation("selection_renderer_animation");
      return currentState;
    }
  }

  private getCurrentAnimatedSelection(
    animatedSelection: SelectionAnimation
  ): SelectionRenderingState {
    const { startState, endState } = animatedSelection;

    const animatedState = deepCopy(startState);
    const value = EASING_FN.easeOutCubic(animatedSelection.progress);

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

    if (startState.activeZoneRect) {
      const startRect = startState.activeZoneRect;
      const endRect = endState.activeZoneRect!;

      animatedState.activeZoneRect = interpolateRect(startRect, endRect, value);
    }

    return animatedState;
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

  private addNewAnimation(
    currentState: SelectionRenderingState,
    lastState: SelectionRenderingState | undefined,
    timeStamp: number | undefined
  ) {
    if (!lastState) {
      return;
    }
    if (this.animatedSelection && !deepEquals(this.animatedSelection.endState, currentState)) {
      this.animatedSelection = {
        startState: lastState,
        endState: currentState,
        startTime: timeStamp,
        progress: 0,
      };
    } else if (this.animatedSelection) {
      return;
    }

    if (deepEquals(lastState, currentState)) {
      return;
    }

    if (
      lastState.selectedZonesRects.length !== currentState.selectedZonesRects.length ||
      currentState.selectedZonesRects.length > 1
    ) {
      this.animatedSelection = undefined;
      return;
    }

    // If a rect changed in both x and Y, no animation
    const lastRect = lastState.selectedZonesRects[0];
    const currentRect = currentState.selectedZonesRects[0];
    const isInside = isRectInside(lastRect, currentRect) || isRectInside(currentRect, lastRect);
    if (!isInside && lastRect.x !== currentRect.x && lastRect.y !== currentRect.y) {
      this.animatedSelection = undefined;
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
