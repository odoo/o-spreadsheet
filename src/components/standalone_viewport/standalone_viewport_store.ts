import { deepEquals, range, sumArray } from "../../helpers/misc";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { Command, isCoreCommand } from "../../types/commands";
import { ViewportsGetters } from "../../types/getters";
import { HeaderDimensions, HeaderIndex, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { GridRenderingContext } from "../../types/rendering";
import { Get } from "../../types/store_engine";

export class StandaloneViewportStore extends SpreadsheetStore {
  mutators = ["setContainerSize", "setRange", "resizeColumn", "setCustomColWeights"] as const;
  colDimensions: Record<HeaderIndex, HeaderDimensions> = {};

  private containerWidth = 0;
  private containerHeight = 0;
  private range: Range;
  private customColWeights: number[] | undefined;

  private viewStore = this.get(ViewportsStore);

  renderingContext: Omit<GridRenderingContext, "ctx" | "thinLineWidth">;

  constructor(get: Get, range: Range, customColWeights?: number[]) {
    super(get);
    this.range = range;
    this.customColWeights = customColWeights;
    this.colDimensions = this.computeColDimensions();
    this.renderingContext = this.getRenderingContext();
  }

  private shouldRecomputeColDimensions = false;

  handle(cmd: Command) {
    if (isCoreCommand(cmd)) {
      this.shouldRecomputeColDimensions = true;
    }
  }

  finalize() {
    if (this.shouldRecomputeColDimensions) {
      this.colDimensions = this.computeColDimensions();
      this.shouldRecomputeColDimensions = false;
    }
  }

  setContainerSize(width: number, height: number) {
    if (this.containerWidth !== width || this.containerHeight !== height) {
      this.containerWidth = width;
      this.containerHeight = height;
      this.colDimensions = this.computeColDimensions();
      this.renderingContext = this.getRenderingContext();
    }
    // ADR TODO DISCUSS: a bit hacky, but since we always call this during a render, it avoid an useless render. Would
    // break if we ever call it somewhere else. Worth to keep it ?
    return "noStateChange";
  }

  setRange(range: Range) {
    if (deepEquals(this.range, range)) {
      return "noStateChange";
    }
    this.range = range;
    this.colDimensions = this.computeColDimensions();
    this.renderingContext = this.getRenderingContext();
    return;
  }

  setCustomColWeights(weights: number[] | undefined) {
    if (deepEquals(this.customColWeights, weights)) {
      return "noStateChange";
    }
    this.customColWeights = weights;
    this.colDimensions = this.computeColDimensions();
    this.renderingContext = this.getRenderingContext();
    return;
  }

  resizeColumn(resizedCol: HeaderIndex, weightDelta: number, weightsAtStartOfDrag: number[]) {
    const startWeights: Record<HeaderIndex, number> = {};
    for (let i = 0; i < weightsAtStartOfDrag.length; i++) {
      startWeights[this.range.zone.left + i] = weightsAtStartOfDrag[i];
    }
    const minWeight = 50;

    const colsAtRight = range(resizedCol + 1, this.range.zone.right + 1).filter(
      (col) => startWeights[col]
    );
    const totalWeightAtRight = sumArray(colsAtRight.map((col) => startWeights[col]));
    const newColWeights = { ...startWeights };

    if (weightDelta < 0) {
      // Make sure we don't decrease the resized column below the minimum weight
      const newSize = Math.max(startWeights[resizedCol] + weightDelta, minWeight);
      weightDelta = newSize - startWeights[resizedCol];

      newColWeights[resizedCol] = startWeights[resizedCol] + weightDelta;
      for (const col of colsAtRight) {
        const weight = startWeights[col];
        const weightDecrease = (weight / totalWeightAtRight) * weightDelta;
        newColWeights[col] = Math.max(startWeights[col] - weightDecrease, minWeight);
      }
    } else if (weightDelta > 0) {
      // Make sure the columns right of the resized column don't go below the minimum weight
      const availableWeightToDecrease = totalWeightAtRight - colsAtRight.length * minWeight;
      if (weightDelta > availableWeightToDecrease) {
        weightDelta = availableWeightToDecrease;
      }

      newColWeights[resizedCol] = startWeights[resizedCol] + weightDelta;
      for (const col of colsAtRight) {
        const weight = startWeights[col];
        const weightDecrease = ((weight - minWeight) / availableWeightToDecrease) * weightDelta;
        newColWeights[col] = Math.max(startWeights[col] - weightDecrease, minWeight);
      }
    }

    const newColWeightsArray = range(this.range.zone.left, this.range.zone.right + 1).map(
      (col) => newColWeights[col] || 0
    );
    this.customColWeights = this.normalizeWeights(newColWeightsArray);
    this.colDimensions = this.computeColDimensions();
  }

  getRenderingContext(): Omit<GridRenderingContext, "ctx" | "thinLineWidth"> {
    const { sheetId } = this.range;

    // const viewports = new ViewportCollection({
    //   getters: this.viewportGetters,
    //   paneDivision: { [sheetId]: { xSplit: 0, ySplit: 0 } },
    //   sheetViewWidth: this.containerWidth,
    //   sheetViewHeight: this.containerHeight,
    //   zoomLevel: this.viewStore.zoomLevel,
    //   zoneToDisplay: zone,
    //   getFooterSize: () => 0,
    // });

    const theme = this.getters.getSpreadsheetTheme();
    const sheet = this.getters.getSheet(sheetId);
    const renderingCtx: Omit<GridRenderingContext, "ctx" | "thinLineWidth"> = {
      sheetId,
      viewports: this.viewStore.viewports,
      hideGridLines: this.getters.isDashboard(),
      dpr: 1,
      selectedZones: [],
      activeCols: new Set(),
      activeRows: new Set(),
      activePosition: undefined,
      theme,
      backgroundColor: sheet.backgroundColor || theme.backgroundColor,
    };
    return renderingCtx;
  }

  get viewportGetters(): ViewportsGetters {
    // @ts-ignore ADRM TODO getters
    return this.viewStore.buildViewportGetters(this.getHeaderDimensions.bind(this));
  }

  get headerDimensionsCallback() {
    return this.getHeaderDimensions.bind(this);
  }

  getHeaderDimensions(sheetId: UID, dimension: "COL" | "ROW", index: number) {
    if (dimension === "ROW") {
      return this.getters.getRowDimensions(sheetId, index);
    }
    const zone = this.range.zone;
    if (index >= zone.left && index <= zone.right) {
      return this.colDimensions[index];
    } else if (index > zone.right) {
      const lastColDimensions = this.colDimensions[zone.right];
      return { start: lastColDimensions.end, size: 0, end: lastColDimensions.end };
    } else {
      const firstColDimensions = this.colDimensions[zone.left];
      return { start: 0, size: 0, end: firstColDimensions.start };
    }
  }

  get columnWeights(): number[] {
    if (this.customColWeights) {
      return this.customColWeights;
    }
    const { sheetId, zone } = this.range;

    const colWeights: number[] = [];
    for (const col of range(zone.left, zone.right + 1)) {
      if (this.getters.isColHidden(sheetId, col)) {
        colWeights.push(0);
      }
      const zone = { ...this.range.zone, left: col, right: col };
      colWeights.push(Math.floor(this.getters.getZoneMaxWidth(sheetId, zone)));
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

    let currentTotal = 0;
    const normalizedWeights: number[] = [];
    for (let i = 0; i < weights.length; i++) {
      normalizedWeights.push(Math.floor((weights[i] / totalWeight) * 1000));
      currentTotal += normalizedWeights[i];
    }

    // Adjust the last column to ensure the total weight sums to 1000
    normalizedWeights[normalizedWeights.length - 1] += 1000 - currentTotal;

    return normalizedWeights;
  }
}
