import { App, Component, ComponentConstructor, useState, xml } from "@odoo/owl";
import type { ChartConfiguration } from "chart.js";
import format from "xml-formatter";
import { functionCache } from "../../src";
import { Action } from "../../src/actions/action";
import { Composer, ComposerProps } from "../../src/components/composer/composer/composer";
import {
  ComposerSelection,
  ComposerStore,
} from "../../src/components/composer/composer/composer_store";
import { ComposerFocusType } from "../../src/components/composer/composer_focus_store";
import { SidePanelStore } from "../../src/components/side_panel/side_panel/side_panel_store";
import { Spreadsheet, SpreadsheetProps } from "../../src/components/spreadsheet/spreadsheet";
import { matrixMap } from "../../src/functions/helpers";
import { functionRegistry } from "../../src/functions/index";
import { ImageProvider } from "../../src/helpers/figures/images/image_provider";
import {
  batched,
  range,
  toCartesian,
  toUnboundedZone,
  toXC,
  toZone,
  zoneToXc,
} from "../../src/helpers/index";
import { createEmptyExcelWorkbookData } from "../../src/migrations/data";
import { Model } from "../../src/model";
import { BasePlugin } from "../../src/plugins/base_plugin";
import { MergePlugin } from "../../src/plugins/core/merge";
import { CorePluginConstructor } from "../../src/plugins/core_plugin";
import { UIPluginConstructor } from "../../src/plugins/ui_plugin";
import { topbarMenuRegistry } from "../../src/registries";
import { MenuItemRegistry } from "../../src/registries/menu_items_registry";
import { Registry } from "../../src/registries/registry";
import {
  DependencyContainer,
  Store,
  StoreConstructor,
  proxifyStoreMutation,
  useStore,
} from "../../src/store_engine";
import { ModelStore } from "../../src/stores";
import { HighlightProvider, HighlightStore } from "../../src/stores/highlight_store";
import { NotificationStore } from "../../src/stores/notification_store";
import { RendererStore } from "../../src/stores/renderer_store";
import { _t } from "../../src/translation";
import {
  CellPosition,
  CellValue,
  ChartDefinition,
  ColorScaleMidPointThreshold,
  ColorScaleThreshold,
  CommandTypes,
  ConditionalFormat,
  Currency,
  DEFAULT_LOCALES,
  EvaluatedCell,
  ExcelWorkbookData,
  Format,
  GridRenderingContext,
  Highlight,
  LayerName,
  Matrix,
  OrderedLayers,
  RangeData,
  SpreadsheetChildEnv,
  Style,
  UID,
  Zone,
} from "../../src/types";
import { Image } from "../../src/types/image";
import { XLSXExport } from "../../src/types/xlsx";
import { isXLSXExportXMLFile } from "../../src/xlsx/helpers/xlsx_helper";
import { fixLengthySheetNames, purgeSingleRowTables } from "../../src/xlsx/xlsx_writer";
import { FileStore } from "../__mocks__/mock_file_store";
import { registerCleanup } from "../setup/jest.setup";
import { MockClipboard } from "./clipboard";
import { redo, setCellContent, setFormat, setStyle, undo } from "./commands_helpers";
import { getCellContent, getEvaluatedCell } from "./getters_helpers";

const functionsContent = functionRegistry.content;
const functionMap = functionRegistry.mapping;

const functionsContentRestore = { ...functionsContent };
const functionMapRestore = { ...functionMap };

export function spyDispatch(parent: Spreadsheet): jest.SpyInstance {
  return jest.spyOn(parent.props.model, "dispatch");
}

export function spyModelDispatch(model: Model): jest.SpyInstance {
  return jest.spyOn(model, "dispatch");
}

export function getPlugin<T extends new (...args: any) => any>(
  model: Model,
  cls: T
): InstanceType<T> {
  return model["handlers"].find((handler) => handler instanceof cls) as unknown as InstanceType<T>;
}

export function addTestPlugin(
  registry: Registry<CorePluginConstructor | UIPluginConstructor>,
  Plugin: CorePluginConstructor | UIPluginConstructor
) {
  const key = `test-plugin-${Plugin.name}`;
  registry.add(key, Plugin);
  registerCleanup(() => registry.remove(key));
}

const realTimeSetTimeout = window.setTimeout.bind(window);
class Root extends Component {
  static template = xml`<div/>`;
  static props = {};
}
const Scheduler = new App(Root).scheduler.constructor as unknown as { requestAnimationFrame: any };

// modifies scheduler to make it faster to test components
Scheduler.requestAnimationFrame = function (callback: FrameRequestCallback) {
  realTimeSetTimeout(callback, 1);
  return 1;
};

export async function nextTick(): Promise<void> {
  await new Promise((resolve) => realTimeSetTimeout(resolve));
  await new Promise((resolve) => Scheduler.requestAnimationFrame(resolve));
}

/**
 * Get the instance of the given cls, which is a child of the component.
 *
 * new (...args: any) => any is a constructor, which ensure us to have
 * a return value correctly typed.
 */
export function getChildFromComponent<T extends new (...args: any) => any>(
  component: Component,
  cls: T
): InstanceType<T> {
  return Object.values(component.__owl__.children).find((child) => child.component instanceof cls)
    ?.component as unknown as InstanceType<T>;
}

export function makeTestFixture() {
  let fixture = document.createElement("div");
  document.body.appendChild(fixture);
  return fixture;
}

class FakeRendererStore extends RendererStore {
  // we don't want to actually draw anything on the canvas as it cannot be tested
  drawLayer(renderingContext: GridRenderingContext, layer: LayerName) {}
}

interface SpreadsheetChildEnvWithStores extends SpreadsheetChildEnv {
  __spreadsheet_stores__: DependencyContainer;
}

export function makeTestEnv(
  mockEnv: Partial<SpreadsheetChildEnvWithStores> = {}
): SpreadsheetChildEnvWithStores {
  const model = mockEnv.model || new Model();
  if (mockEnv.__spreadsheet_stores__) {
    throw new Error("Cannot call makeTestEnv on a partial env that already have a store container");
  }
  const container = new DependencyContainer();
  container.inject(ModelStore, model);
  container.inject(RendererStore, new FakeRendererStore());

  const notificationStore = container.get(NotificationStore);
  notificationStore.updateNotificationCallbacks({
    notifyUser: mockEnv.notifyUser || (() => {}),
    raiseError: mockEnv.raiseError || (() => {}),
    askConfirmation: mockEnv.askConfirmation || (() => {}),
  });

  const store = container.get(SidePanelStore);
  const sidePanelStore = proxifyStoreMutation(store, () => container.trigger("store-updated"));
  return {
    model,
    isDashboard: mockEnv.isDashboard || (() => false),
    openSidePanel: mockEnv.openSidePanel || sidePanelStore.open.bind(sidePanelStore),
    toggleSidePanel: mockEnv.toggleSidePanel || sidePanelStore.toggle.bind(sidePanelStore),
    clipboard: mockEnv.clipboard || new MockClipboard(),
    //FIXME : image provider is not built on top of the file store of the model if provided
    // and imageProvider is defined even when there is no file store on the model
    imageProvider: new ImageProvider(new FileStore()),
    notifyUser: notificationStore.notifyUser,
    raiseError: notificationStore.raiseError,
    askConfirmation: notificationStore.askConfirmation,
    startCellEdition: mockEnv.startCellEdition || (() => {}),
    loadCurrencies:
      mockEnv.loadCurrencies ||
      (async () => {
        return [] as Currency[];
      }),
    loadLocales: mockEnv.loadLocales || (async () => DEFAULT_LOCALES),
    getStore<T extends StoreConstructor>(Store: T) {
      const store = container.get(Store);
      return proxifyStoreMutation(store, () => container.trigger("store-updated"));
    },
    // @ts-ignore
    __spreadsheet_stores__: container,
  };
}

export function testUndoRedo(model: Model, expect: jest.Expect, command: CommandTypes, args: any) {
  const before = model.exportData();
  model.dispatch(command, args);
  const after = model.exportData();
  undo(model);
  expect(model).toExport(before);
  redo(model);
  expect(model).toExport(after);
}

type ComponentProps = { [key: string]: any };

interface ParentProps<ChildProps extends ComponentProps> {
  childComponent: ComponentConstructor<ChildProps, SpreadsheetChildEnv>;
  childProps: ChildProps;
}

class ParentWithPortalTarget<Props extends ComponentProps> extends Component<
  ParentProps<Props>,
  SpreadsheetChildEnv
> {
  static template = xml/*xml*/ `
    <div class="o-spreadsheet" >
      <t t-component="props.childComponent" t-props="props.childProps"/>
    </div>
  `;
  static props = { "*": Object };
}

interface MountComponentArgs<Props extends ComponentProps> {
  props?: Props;
  env?: Partial<SpreadsheetChildEnv>;
  model?: Model;
  fixture?: HTMLElement;
  renderOnModelUpdate?: boolean; // true by default
}

interface MountComponentReturn<Props extends ComponentProps> {
  app: App;
  parent: Component<Props, SpreadsheetChildEnv>;
  model: Model;
  fixture: HTMLElement;
  env: SpreadsheetChildEnv;
}

export async function mountComponentWithPortalTarget<Props extends ComponentProps>(
  component: ComponentConstructor<Props, SpreadsheetChildEnv>,
  optionalArgs: MountComponentArgs<Props> = {}
): Promise<MountComponentReturn<ParentProps<Props>>> {
  const args = {
    ...optionalArgs,
    props: { childComponent: component, childProps: optionalArgs.props || ({} as Props) },
  };
  return mountComponent(ParentWithPortalTarget<Props>, args);
}

export async function mountComponent<Props extends { [key: string]: any }>(
  component: ComponentConstructor<Props, SpreadsheetChildEnv>,
  optionalArgs: MountComponentArgs<Props> = {}
): Promise<MountComponentReturn<Props>> {
  const model = optionalArgs.model || optionalArgs?.env?.model || new Model();
  model.drawLayer = () => {};
  const env = makeTestEnv({ ...optionalArgs.env, model: model });
  const props = optionalArgs.props || ({} as Props);
  const app = new App(component, {
    props,
    env,
    test: true,
    translateFn: _t,
    warnIfNoStaticProps: true,
  });
  const fixture = optionalArgs?.fixture || makeTestFixture();
  const parent = await app.mount(fixture);

  const render = batched(parent.render.bind(parent, true));
  if (optionalArgs.renderOnModelUpdate === undefined || optionalArgs.renderOnModelUpdate) {
    model.on("update", null, render);
  }
  // @ts-ignore
  env.__spreadsheet_stores__.on("store-updated", null, render);

  registerCleanup(() => {
    app.destroy();
    fixture.remove();
    model.off("update", null);
    // @ts-ignore
    env.__spreadsheet_stores__.off("store-updated", null);
  });

  return { app, parent, model, fixture, env: parent.env };
}

// Requires to be called wit jest realTimers
export async function mountSpreadsheet(
  props: SpreadsheetProps = { model: new Model() },
  partialEnv: Partial<SpreadsheetChildEnv> = {}
): Promise<{
  app: App;
  parent: Spreadsheet;
  model: Model;
  fixture: HTMLElement;
  env: SpreadsheetChildEnv;
}> {
  const { app, parent, model, fixture, env } = await mountComponent(Spreadsheet, {
    props,
    env: partialEnv,
    model: props.model,
    renderOnModelUpdate: false,
  });

  /**
   * The following nextTick is necessary to ensure that a re-render is correctly
   * done after the resize of the sheet view.
   */
  await nextTick();
  return { app, parent: parent as Spreadsheet, model, fixture, env };
}

type GridDescr = { [xc: string]: string | undefined };
type FormattedGridDescr = GridDescr;
type GridResult = { [xc: string]: string | number | boolean | undefined };
type GridFormatDescr = { [xc: string]: Format | undefined };
type GridStyleDescr = { [xc: string]: Style | undefined };

function getCellGrid(model: Model): { [xc: string]: EvaluatedCell } {
  const result = {};
  const sheetId = model.getters.getActiveSheetId();
  for (const position of model.getters.getEvaluatedCellsPositions(sheetId)) {
    const { col, row } = position;
    const cell = model.getters.getEvaluatedCell(position);
    result[toXC(col, row)] = cell;
  }
  return result;
}

export function getGrid(model: Model): GridResult {
  const result: GridResult = {};
  for (const [xc, cell] of Object.entries(getCellGrid(model))) {
    result[xc] = cell.value ?? "";
  }
  return result;
}

export function getGridFormat(model: Model): GridFormatDescr {
  const result: GridFormatDescr = {};
  for (const [xc, cell] of Object.entries(getCellGrid(model))) {
    result[xc] = cell.format;
  }
  return result;
}

export function getGridStyle(model: Model): GridStyleDescr {
  const result: GridStyleDescr = {};
  const sheetId = model.getters.getActiveSheetId();
  for (const [cellId, cell] of Object.entries(model.getters.getCells(sheetId))) {
    const { col, row } = model.getters.getCellPosition(cellId);
    result[toXC(col, row)] = cell.style;
  }
  return result;
}

export function setGrid(model: Model, grid: GridDescr) {
  for (const [xc, value] of Object.entries(grid)) {
    if (value === undefined) continue;
    setCellContent(model, xc, value);
  }
}

export function setGridFormat(model: Model, grid: GridFormatDescr) {
  for (const [xc, format] of Object.entries(grid)) {
    if (format === undefined) continue;
    setFormat(model, xc, format);
  }
}

export function setGridStyle(model: Model, grid: GridStyleDescr) {
  for (const [xc, style] of Object.entries(grid)) {
    if (style === undefined) continue;
    setStyle(model, xc, style);
  }
}

/**
 * Evaluate the final state of a grid according to the different values ​​and
 * different functions submitted in the grid cells
 *
 * Examples:
 *   {A1: "=sum(B2:B3)", B2: "2", B3: "3"} => {A1: 5, B2: 2, B3: 3}
 *   {B5: "5", D8: "2.6", W4: "=round(A2)"} => {B5: 5, D8: 2.6, W4: 3}
 */
export function evaluateGrid(grid: GridDescr): GridResult {
  const model = new Model();
  for (let xc in grid) {
    if (grid[xc] !== undefined) {
      setCellContent(model, xc, grid[xc]!);
    }
  }
  const result = {};
  for (let xc in grid) {
    result[xc] = getEvaluatedCell(model, xc).value;
  }
  return result;
}

export function evaluateGridText(grid: GridDescr): FormattedGridDescr {
  const model = new Model();
  for (let xc in grid) {
    if (grid[xc] !== undefined) {
      setCellContent(model, xc, grid[xc]!);
    }
  }
  const result = {};
  for (let xc in grid) {
    result[xc] = getCellContent(model, xc);
  }
  return result;
}

export function evaluateGridFormat(grid: GridDescr): FormattedGridDescr {
  const model = new Model();
  for (let xc in grid) {
    if (grid[xc] !== undefined) {
      setCellContent(model, xc, grid[xc]!);
    }
  }
  const result = {};
  for (let xc in grid) {
    result[xc] = getEvaluatedCell(model, xc).format || "";
  }
  return result;
}

/**
 * Evaluate the final state of a cell according to the different values and
 * different functions submitted in a grid cells
 *
 * Examples:
 *   "A2", {A1: "41", A2: "42", A3: "43"} => 42
 *   "A1", {A1: "=sum(A2:A4)", A2: "2", A3: "3", "A4": "4"} => 9
 */
export function evaluateCell(xc: string, grid: GridDescr): any {
  const gridResult = evaluateGrid(grid);
  return gridResult[xc];
}

export function getRangeValuesAsMatrix(
  model: Model,
  rangeXc: string,
  sheetId: string = model.getters.getActiveSheetId()
): Matrix<CellValue> {
  return matrixMap(getRangeCellsAsMatrix(model, rangeXc, sheetId), (cell) => cell.value);
}

export function getRangeFormatsAsMatrix(
  model: Model,
  rangeXc: string,
  sheetId: string = model.getters.getActiveSheetId()
): string[][] {
  return matrixMap(getRangeCellsAsMatrix(model, rangeXc, sheetId), (cell) => cell.format || "");
}

export function getRangeCellsAsMatrix(
  model: Model,
  rangeXc: string,
  sheetId: string = model.getters.getActiveSheetId()
): EvaluatedCell[][] {
  const rangeValue: EvaluatedCell[][] = [];
  const zone = toZone(rangeXc);
  for (const row of range(zone.top, zone.bottom + 1)) {
    const colValues: EvaluatedCell[] = [];
    for (const col of range(zone.left, zone.right + 1)) {
      const cell = model.getters.getEvaluatedCell({ sheetId, col, row });
      colValues.push(cell);
    }
    rangeValue.push(colValues);
  }
  return rangeValue;
}

export function createModelFromGrid(grid: GridDescr): Model {
  const model = new Model();
  for (let xc in grid) {
    if (grid[xc] !== undefined) {
      setCellContent(model, xc, grid[xc]!);
    }
  }
  return model;
}

export function evaluateCellText(xc: string, grid: GridDescr): string {
  const gridResult = evaluateGridText(grid);
  return gridResult[xc] || "";
}

export function evaluateCellFormat(xc: string, grid: GridDescr): string {
  const gridResult = evaluateGridFormat(grid);
  return gridResult[xc] || "";
}

/**
 *  Check if there is value to the right/below the given range XC. This is useful to check if an array
 *  formula has spread beyond the range it should have.
 */
export function checkFunctionDoesntSpreadBeyondRange(
  model: Model,
  rangeXc: string,
  sheetId: string = model.getters.getActiveSheetId()
): boolean {
  const zone = toZone(rangeXc);
  for (const row of range(zone.top, zone.bottom + 2)) {
    const cell = model.getters.getEvaluatedCell({ sheetId, col: zone.right + 1, row });
    if (cell.value) {
      return false;
    }
  }

  for (const col of range(zone.left, zone.right + 2)) {
    const cell = model.getters.getEvaluatedCell({ sheetId, col, row: zone.bottom + 1 });
    if (cell.value) {
      return false;
    }
  }

  return true;
}

//------------------------------------------------------------------------------
// DOM/Misc Mocks
//------------------------------------------------------------------------------

/*
 * Remove all functions from the internal function list.
 */
export function clearFunctions() {
  Object.keys(functionMap).forEach((k) => {
    delete functionMap[k];
  });

  Object.keys(functionsContent).forEach((k) => {
    delete functionsContent[k];
  });
}

export function restoreDefaultFunctions() {
  for (let f in functionCache) {
    delete functionCache[f];
  }
  clearFunctions();
  Object.keys(functionMapRestore).forEach((k) => {
    functionMap[k] = functionMapRestore[k];
  });
  Object.keys(functionsContentRestore).forEach((k) => {
    functionsContent[k] = functionsContentRestore[k];
  });
}

export function getMergeCellMap(model: Model): Record<number, Record<number, number | undefined>> {
  const mergePlugin = getPlugin(model, MergePlugin);
  const sheetCellMap = mergePlugin["mergeCellMap"][model.getters.getActiveSheetId()];
  return sheetCellMap
    ? (Object.fromEntries(
        Object.entries(sheetCellMap).filter(
          ([col, row]) => row !== undefined && Array.isArray(row) && row.some((x) => x)
        )
      ) as Record<number, Record<number, number | undefined>>)
    : {};
}

export function XCToMergeCellMap(
  model: Model,
  mergeXCList: string[]
): Record<number, Record<number, number | undefined>> {
  const mergeCellMap = {};
  const sheetId = model.getters.getActiveSheetId();
  for (const mergeXC of mergeXCList) {
    const { col, row } = toCartesian(mergeXC);
    const merge = model.getters.getMerge({ sheetId, col, row });
    if (!mergeCellMap[col]) mergeCellMap[col] = [];
    mergeCellMap[col][row] = merge ? merge.id : undefined;
  }
  return mergeCellMap;
}

export function target(str: string): Zone[] {
  return str.split(",").map(toZone);
}

export function toRangeData(sheetId: UID, xc: string): RangeData {
  return { _zone: toUnboundedZone(xc), _sheetId: sheetId };
}

export function toRangesData(sheetId: UID, str: string): RangeData[] {
  return str.split(",").map((xc) => toRangeData(sheetId, xc));
}

export function createEqualCF(
  value: string,
  style: Style,
  id: string
): Omit<ConditionalFormat, "ranges"> {
  return {
    id,
    rule: { values: [value], operator: "Equal", type: "CellIsRule", style },
  };
}

export function createColorScale(
  id: string,
  min: ColorScaleThreshold,
  max: ColorScaleThreshold,
  mid?: ColorScaleMidPointThreshold
): Omit<ConditionalFormat, "ranges"> {
  return {
    id,
    rule: { type: "ColorScaleRule", minimum: min, maximum: max, midpoint: mid },
  };
}

export async function typeInComposerHelper(selector: string, text: string, fromScratch: boolean) {
  let composerEl: Element = document.querySelector(selector)!;
  if (fromScratch) {
    composerEl = await startGridComposition();
  }

  (composerEl as HTMLElement).focus();
  // @ts-ignore
  const cehMock = window.mockContentHelper as ContentEditableHelper;
  composerEl.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "" }));
  await nextTick();
  cehMock.insertText(text);
  composerEl.dispatchEvent(new InputEvent("input", { data: text, bubbles: true }));
  await nextTick();
  composerEl.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "" }));
  await nextTick();
  return composerEl;
}

export async function typeInComposerGrid(text: string, fromScratch: boolean = true) {
  return await typeInComposerHelper(".o-grid div.o-composer", text, fromScratch);
}

export async function typeInComposerTopBar(text: string, fromScratch: boolean = true) {
  // TODO: fix this helper. From scratch does not do what we expect.
  // It will start the composition on the grid and then type in the topbar
  return await typeInComposerHelper(".o-spreadsheet-topbar .o-composer", text, fromScratch);
}

export async function startGridComposition(key?: string) {
  const gridComposerTarget = document.querySelector(".o-grid .o-composer")!;
  if (key) {
    gridComposerTarget!.dispatchEvent(
      new InputEvent("input", { data: key, bubbles: true, cancelable: true })
    );
  } else {
    gridComposerTarget!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    );
    gridComposerTarget!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
  }
  await nextTick();
  return document.querySelector(".o-grid .o-composer")!;
}

/**
 * Return the text of every node matching the selector
 */
export function textContentAll(cssSelector: string): string[] {
  const nodes = document.querySelectorAll(cssSelector);
  if (!nodes) return [];
  return [...nodes].map((node) => node.textContent).filter((text): text is string => text !== null);
}

/**
 * Return XLSX export with prettified XML files.
 */
export async function exportPrettifiedXlsx(model: Model): Promise<XLSXExport> {
  const xlsxExport = await model.exportXLSX();
  return {
    ...xlsxExport,
    files: xlsxExport.files.map((file) => {
      if (isXLSXExportXMLFile(file)) {
        return {
          ...file,
          content: format(file.content),
        };
      }
      return { ...file };
    }),
  };
}

export function getExportedExcelData(model: Model): ExcelWorkbookData {
  model.dispatch("EVALUATE_CELLS");
  let data = createEmptyExcelWorkbookData();
  for (let handler of model["handlers"]) {
    if (handler instanceof BasePlugin) {
      handler.exportForExcel(data);
    }
  }
  data = fixLengthySheetNames(data);
  return purgeSingleRowTables(data);
}

export function mockUuidV4To(model: Model, value: number | string) {
  //@ts-ignore
  return model.uuidGenerator.setNextId(value);
}

export const mockChart = () => {
  const mockChartData: ChartConfiguration = {
    data: { datasets: [] },
    type: "bar",
  };
  class MockLuxonTimeAdapter {
    _id = "luxon";
  }
  class ChartMock {
    static register = () => {};
    static _adapters = { _date: MockLuxonTimeAdapter };
    constructor(ctx: unknown, chartData: ChartConfiguration) {
      Object.assign(mockChartData, chartData);
    }
    set data(value) {
      mockChartData.data = value;
    }
    get data() {
      return mockChartData.data;
    }
    toBase64Image = () => "data:image/png;base64,randomDataThatIsActuallyABase64Image";
    destroy() {}
    update() {}
    options = mockChartData.options;
    config = mockChartData;
  }

  //@ts-ignore
  window.Chart = ChartMock;
  return mockChartData;
};

interface CellObject {
  value: string | number | boolean;
  style?: Style;
  format?: string;
  content: string;
}

export function getCellsObject(model: Model, sheetId: UID): Record<string, CellObject> {
  const cells: Record<string, CellObject> = {};
  for (const cell of Object.values(model.getters.getCells(sheetId))) {
    const { col, row } = model.getters.getCellPosition(cell.id);
    cells[toXC(col, row)] = {
      style: cell.style,
      format: cell.format,
      value: model.getters.getEvaluatedCell({ sheetId, col, row }).value ?? "",
      content: cell.content,
    };
  }
  return cells;
}

export async function doAction(
  path: string[],
  env: SpreadsheetChildEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
) {
  const node = getNode(path, env, menuRegistry);
  await node.execute?.(env);
}

export function getNode(
  _path: string[],
  env: SpreadsheetChildEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): Action {
  const path = [..._path];
  let items = menuRegistry.getMenuItems();
  while (items.length && path.length) {
    const id = path.shift()!;
    const item = items.find((item) => item.id === id);
    if (!item) {
      throw new Error(`Menu item ${id} not found`);
    }
    if (path.length === 0) {
      return item;
    }
    items = item.children(env);
  }
  throw new Error(`Menu item not found`);
}

export function getName(
  path: string[],
  env: SpreadsheetChildEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): string {
  const node = getNode(path, env, menuRegistry);
  return node.name(env).toString();
}

export function getFigureIds(model: Model, sheetId: UID, type?: string): UID[] {
  let figures = model.getters.getFigures(sheetId);
  if (type) {
    figures = figures.filter((figure) => figure.tag === type);
  }
  return figures.map((figure) => figure.id);
}

export function getFigureDefinition(
  model: Model,
  figureId: UID,
  type: string
): ChartDefinition | Image {
  switch (type) {
    case "chart":
    case "basicChart":
    case "scorecard":
    case "gauge":
      return model.getters.getChartDefinition(figureId);
    case "image":
      return model.getters.getImage(figureId);
    default:
      throw new Error(`Invalide figure type: ${type}`);
  }
}

/** Extract a property of the style of the given html element and return its size in pixel */
export function getStylePropertyInPx(el: HTMLElement, property: string): number | undefined {
  const styleProperty = el.style[property] as string;
  if (!styleProperty) return undefined;
  return Number(styleProperty.replace("px", ""));
}

type ComposerWrapperProps = {
  focusComposer: ComposerFocusType;
  composerProps: Partial<ComposerProps>;
};
export class ComposerWrapper extends Component<ComposerWrapperProps, SpreadsheetChildEnv> {
  static components = { Composer };
  static template = xml/*xml*/ `
    <Composer t-props="composerProps"/>
  `;
  static props = { composerProps: Object, focusComposer: String };
  state = useState({ focusComposer: <ComposerFocusType>"inactive" });
  composerStore!: Store<ComposerStore>;
  setup() {
    this.state.focusComposer = this.props.focusComposer;
    this.composerStore = useStore(ComposerStore);
  }

  get composerProps(): ComposerProps {
    return {
      ...this.props.composerProps,
      onComposerContentFocused: () => {
        this.state.focusComposer = "contentFocus";
        this.setEdition({});
      },
      focus: this.state.focusComposer,
    };
  }

  setEdition({ text, selection }: { text?: string; selection?: ComposerSelection }) {
    if (this.composerStore.editionMode === "inactive") {
      this.composerStore.startEdition(text, selection);
    } else if (text) {
      this.composerStore.setCurrentContent(text, selection);
    }
  }

  startComposition(text?: string) {
    this.state.focusComposer = text ? "contentFocus" : "cellFocus";
    this.setEdition({ text });
  }
}

export async function mountComposerWrapper(
  model: Model = new Model(),
  composerProps: Partial<ComposerProps> = {},
  focusComposer: ComposerFocusType = "inactive"
): Promise<{
  parent: ComposerWrapper;
  model: Model;
  fixture: HTMLElement;
  env: SpreadsheetChildEnv;
}> {
  const { parent, fixture, env } = await mountComponent(ComposerWrapper, {
    props: { composerProps, focusComposer },
    model,
  });

  return { parent: parent as ComposerWrapper, model, fixture, env };
}

export function toCellPosition(sheetId: UID, xc: string): CellPosition {
  const { col, row } = toCartesian(xc);
  return { sheetId, col, row };
}

/** Get the data validation rules a sheet, transforming ranges into strings for easier testing */
export function getDataValidationRules(model: Model, sheetId = model.getters.getActiveSheetId()) {
  return model.getters.getDataValidationRules(sheetId).map((rule) => ({
    ...rule,
    ranges: rule.ranges.map((range) => model.getters.getRangeString(range, sheetId)),
  }));
}

export function drawGrid(model: Model, ctx: GridRenderingContext) {
  for (const layer of OrderedLayers()) {
    model.drawLayer(ctx, layer);
  }
}

export function getHighlightsFromStore(
  storeGetter: SpreadsheetChildEnv | DependencyContainer
): Highlight[] {
  const rendererStore =
    "getStore" in storeGetter
      ? storeGetter.getStore(RendererStore)
      : storeGetter.get(RendererStore);
  return (Object.values(rendererStore["renderers"]) as any)
    .flat()
    .filter((renderer) => renderer instanceof HighlightStore)
    .flatMap((store: HighlightStore) => store["providers"])
    .flatMap((getter: HighlightProvider) => getter.highlights);
}

export function makeTestNotificationStore(): NotificationStore {
  return {
    mutators: ["notifyUser", "raiseError", "askConfirmation", "updateNotificationCallbacks"],
    notifyUser: () => {},
    raiseError: () => {},
    askConfirmation: () => {},
    updateNotificationCallbacks: () => {},
  };
}

export function makeTestComposerStore(
  model: Model,
  notificationStore?: NotificationStore
): ComposerStore {
  const container = new DependencyContainer();
  container.inject(ModelStore, model);
  notificationStore = notificationStore || makeTestNotificationStore();
  container.inject(NotificationStore, notificationStore);
  return container.get(ComposerStore);
}

/** Return the values of the first filter found in the sheet */
export function getFilterHiddenValues(model: Model, sheetId = model.getters.getActiveSheetId()) {
  const table = model.getters.getTables(sheetId)[0];
  return table.filters.map((filter) => ({
    zone: zoneToXc(filter.rangeWithHeaders.zone),
    value: model.getters.getFilterHiddenValues({
      sheetId,
      col: filter.col,
      row: table.range.zone.top,
    }),
  }));
}
