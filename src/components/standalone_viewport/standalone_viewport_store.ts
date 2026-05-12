import { DEFAULT_CELL_WIDTH } from "../../constants";
import { deepEquals, range, sumArray } from "../../helpers/misc";
import { isZoneValid } from "../../helpers/zones";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { Command } from "../../types/commands";
import { HeaderDimensions, HeaderIndex, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { GridRenderingContext } from "../../types/rendering";
import { Get } from "../../types/store_engine";

export class StandaloneViewportStore extends SpreadsheetStore {
  mutators = ["setContainerSize", "setRange", "resizeColumn", "setCustomColWeights"] as const;

  cachedColDimensions: Record<HeaderIndex, HeaderDimensions> | undefined = undefined;

  private containerWidth = 0;
  private containerHeight = 0;
  private range: Range;
  private customColWeights: number[] | undefined = undefined;

  private viewStore = this.get(ViewportsStore);

  constructor(get: Get, range: Range, customColWeights?: number[]) {
    super(get);
    this.range = range;
    this.customColWeights = customColWeights;

    this.viewStore.setDisplayedSheetId(this.range.sheetId);
    this.viewStore.setViewportArgs({
      getHeaderDimensions: this.getHeaderDimensions.bind(this),
      zoneToDisplay: this.range.zone,
      getFooterSize: () => 0,
    });
  }

  handle(cmd: Command) {
    this.cachedColDimensions = undefined;
  }

  setContainerSize(width: number, height: number) {
    if (this.containerWidth !== width || this.containerHeight !== height) {
      this.containerWidth = width;
      this.containerHeight = height;
      this.cachedColDimensions = undefined;
      this.viewStore.resizeSheetView({ width, height });
      return;
    }
    return "noStateChange";
  }

  setRange(range: Range) {
    if (deepEquals(this.range, range)) {
      return "noStateChange";
    }
    this.range = range;
    this.cachedColDimensions = undefined;
    this.viewStore.setDisplayedSheetId(this.range.sheetId);
    this.viewStore.setViewportArgs({ zoneToDisplay: this.range.zone });
    return;
  }

  setCustomColWeights(weights: number[] | undefined) {
    if (deepEquals(this.customColWeights, weights)) {
      return "noStateChange";
    }
    this.changeColumnWeights(weights);
    return;
  }

  resizeColumn(resizedCol: HeaderIndex, weightDelta: number, weightsAtStartOfDrag: number[]) {
    const startWeights: Record<HeaderIndex, number> = {};
    for (let i = 0; i < weightsAtStartOfDrag.length; i++) {
      startWeights[this.range.zone.left + i] = weightsAtStartOfDrag[i];
    }
    const minWeight = sumArray(weightsAtStartOfDrag) / 20;

    const colsAtRight = range(resizedCol + 1, this.range.zone.right + 1).filter(
      (col) => startWeights[col]
    );
    const totalWeightAtRight = sumArray(colsAtRight.map((col) => startWeights[col]));
    const newColWeights = { ...startWeights };

    // Make sure we don't decrease the resized column below the minimum weight
    const newWeight = Math.max(startWeights[resizedCol] + weightDelta, minWeight);
    weightDelta = newWeight - startWeights[resizedCol];

    // Make sure the columns right of the resized column don't go below the minimum weight
    const availableWeightOnRight = Math.max(totalWeightAtRight - minWeight * colsAtRight.length, 0);
    if (weightDelta > availableWeightOnRight) {
      weightDelta = availableWeightOnRight;
    }

    newColWeights[resizedCol] = startWeights[resizedCol] + weightDelta;
    if (availableWeightOnRight > 0 && weightDelta > 0) {
      for (const col of colsAtRight) {
        const weight = startWeights[col];
        const weightChange = ((weight - minWeight) / availableWeightOnRight) * weightDelta;
        newColWeights[col] = Math.max(startWeights[col] - weightChange, minWeight);
      }
    } else if (weightDelta < 0) {
      for (const col of colsAtRight) {
        const weight = startWeights[col];
        const weightChange = (weight / totalWeightAtRight) * weightDelta;
        newColWeights[col] = Math.max(startWeights[col] - weightChange, minWeight);
      }
    }

    const newColWeightsArray = range(this.range.zone.left, this.range.zone.right + 1).map(
      (col) => newColWeights[col] || 0
    );
    const normalizedWeights = this.normalizeWeights(newColWeightsArray);
    this.changeColumnWeights(normalizedWeights);
  }

  private changeColumnWeights(newWeights: number[] | undefined) {
    this.customColWeights = newWeights;
    this.cachedColDimensions = undefined;
    this.viewStore.rebuildViewports();
  }

  get renderingContext(): Omit<GridRenderingContext, "ctx" | "thinLineWidth"> {
    const { sheetId } = this.range;

    const renderingCtx: Omit<GridRenderingContext, "ctx" | "thinLineWidth"> = {
      sheetId,
      viewports: this.viewStore.viewports,
      hideGridLines: this.getters.isDashboard(),
      dpr: 1,
      selectedZones: [],
      activeCols: new Set(),
      activeRows: new Set(),
      activePosition: undefined,
    };
    return renderingCtx;
  }

  get headerDimensionsCallback() {
    return this.getHeaderDimensions.bind(this);
  }

  getHeaderDimensions(sheetId: UID, dimension: "COL" | "ROW", index: number) {
    if (dimension === "ROW") {
      return this.getters.getRowDimensions(sheetId, index);
    }

    if (this.cachedColDimensions === undefined) {
      this.cachedColDimensions = this.computeColDimensions();
    }

    const zone = this.range.zone;
    if (index >= zone.left && index <= zone.right) {
      return this.cachedColDimensions[index];
    } else if (index > zone.right) {
      const lastColDimensions = this.cachedColDimensions[zone.right];
      return { start: lastColDimensions.end, size: 0, end: lastColDimensions.end };
    } else {
      const firstColDimensions = this.cachedColDimensions[zone.left];
      return { start: 0, size: 0, end: firstColDimensions.start };
    }
  }

  get columnWeights(): number[] {
    const numberOfColumns = this.range.zone.right - this.range.zone.left + 1;
    const customWeights = this.customColWeights;
    if (customWeights && customWeights.length === numberOfColumns) {
      return customWeights;
    }
    const { sheetId, zone } = this.range;
    if (!this.getters.tryGetSheet(sheetId) || !isZoneValid(zone)) {
      return Array(numberOfColumns).fill(1);
    }

    const colWeights: number[] = [];
    for (const col of range(zone.left, zone.right + 1)) {
      if (this.getters.isColHidden(sheetId, col)) {
        colWeights.push(0);
        continue;
      }
      const zone = { ...this.range.zone, left: col, right: col };
      const maxZoneWidth = Math.floor(this.getters.getZoneMaxWidth(sheetId, zone));
      colWeights.push(Math.max(DEFAULT_CELL_WIDTH, maxZoneWidth));
    }

    return this.normalizeWeights(colWeights);
  }

  private computeColDimensions(): Record<HeaderIndex, HeaderDimensions> {
    const { zone } = this.range;
    const displayedColumns = range(zone.left, zone.right + 1);

    const colWeights = this.columnWeights;
    const totalWeight = sumArray(colWeights);
    const colSizes: Record<HeaderIndex, HeaderDimensions> = {};

    let currentX = 0;
    for (const col of displayedColumns) {
      const weight = colWeights[col - zone.left];
      const colSize = Math.floor((weight / totalWeight) * this.containerWidth);
      colSizes[col] = { start: currentX, size: colSize, end: currentX + colSize };
      currentX += colSize;
    }

    // Adjust the last column to ensure the total width sums to containerWidth
    const lastCol = displayedColumns[displayedColumns.length - 1];
    if (lastCol !== undefined) {
      colSizes[lastCol].size += this.containerWidth - currentX;
      colSizes[lastCol].end = colSizes[lastCol].start + colSizes[lastCol].size;
    }

    return colSizes;
  }

  private normalizeWeights(weights: number[]): number[] {
    const totalWeight = sumArray(weights);
    if (totalWeight === 0) {
      return weights;
    }

    let currentTotal = 0;
    const normalizedWeights: number[] = [];
    for (let i = 0; i < weights.length; i++) {
      normalizedWeights.push(Math.floor((weights[i] / totalWeight) * 1000));
      currentTotal += normalizedWeights[i];
    }

    return normalizedWeights;
  }
}
