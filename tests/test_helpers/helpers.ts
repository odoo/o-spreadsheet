import { App, Component, ComponentConstructor, xml } from "@odoo/owl";
import { ChartConfiguration } from "chart.js";
import format from "xml-formatter";
import { Spreadsheet, SpreadsheetProps } from "../../src/components/spreadsheet/spreadsheet";
import { functionRegistry } from "../../src/functions/index";
import { ImageProvider } from "../../src/helpers/figures/images/image_provider";
import { FocusableElement } from "../../src/helpers/focus_manager";
import { toCartesian, toUnboundedZone, toXC, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { MergePlugin } from "../../src/plugins/core/merge";
import { topbarMenuRegistry } from "../../src/registries";
import { FullMenuItem, MenuItemRegistry } from "../../src/registries/menu_items_registry";
import {
  ChartDefinition,
  ColorScaleMidPointThreshold,
  ColorScaleThreshold,
  CommandTypes,
  ConditionalFormat,
  Currency,
  RangeData,
  SpreadsheetChildEnv,
  Style,
  UID,
  Zone,
} from "../../src/types";
import { Image } from "../../src/types/image";
import { XLSXExport } from "../../src/types/xlsx";
import { OWL_TEMPLATES, registerCleanup } from "../setup/jest.setup";
import { FileStore } from "../__mocks__/mock_file_store";
import { MockClipboard } from "./clipboard";
import { redo, setCellContent, undo } from "./commands_helpers";
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

const realTimeSetTimeout = window.setTimeout.bind(window);
class Root extends Component {
  static template = xml`<div/>`;
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

export function makeTestEnv(mockEnv: Partial<SpreadsheetChildEnv> = {}): SpreadsheetChildEnv {
  return {
    model: mockEnv.model || new Model(),
    isDashboard: mockEnv.isDashboard || (() => false),
    openSidePanel: mockEnv.openSidePanel || (() => {}),
    toggleSidePanel: mockEnv.toggleSidePanel || (() => {}),
    clipboard: mockEnv.clipboard || new MockClipboard(),
    //FIXME : image provider is not built on top of the file store of the model if provided
    // and imageProvider is defined even when there is no file store on the model
    imageProvider: new ImageProvider(new FileStore()),
    _t: mockEnv._t || ((str: string, ...values: any) => str),
    notifyUser: mockEnv.notifyUser || (() => {}),
    raiseError: mockEnv.raiseError || (() => {}),
    askConfirmation: mockEnv.askConfirmation || (() => {}),
    editText: mockEnv.editText || (() => {}),
    loadCurrencies:
      mockEnv.loadCurrencies ||
      (async () => {
        return [] as Currency[];
      }),
    focusableElement: new FocusableElement(),
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

export async function mountComponent<Props extends { [key: string]: any }>(
  component: ComponentConstructor<Props, SpreadsheetChildEnv>,
  optionalArgs: {
    props?: Props;
    env?: Partial<SpreadsheetChildEnv>;
    model?: Model;
    fixture?: HTMLElement;
  } = {}
): Promise<{
  app: App;
  parent: Component<Props, SpreadsheetChildEnv>;
  model: Model;
  fixture: HTMLElement;
  env: SpreadsheetChildEnv;
}> {
  const model = optionalArgs.model || optionalArgs?.env?.model || new Model();
  model.drawGrid = () => {};
  const env = makeTestEnv({ ...optionalArgs.env, model: model });
  const props = optionalArgs.props || ({} as Props);
  const app = new App(component, { props, env, test: true });
  app.addTemplates(OWL_TEMPLATES);
  const fixture = optionalArgs?.fixture || makeTestFixture();
  const parent = await app.mount(fixture);

  registerCleanup(() => {
    app.destroy();
    fixture.remove();
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
type GridResult = { [xc: string]: any };

export function getGrid(model: Model): GridResult {
  const result = {};
  const sheetId = model.getters.getActiveSheetId();
  for (let cellId in model.getters.getEvaluatedCells(sheetId)) {
    const { col, row } = model.getters.getCellPosition(cellId);
    const cell = model.getters.getEvaluatedCell({ sheetId, col, row });
    result[toXC(col, row)] = cell.value;
  }
  return result;
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

export function evaluateCellText(xc: string, grid: GridDescr): string {
  const gridResult = evaluateGridText(grid);
  return gridResult[xc] || "";
}

export function evaluateCellFormat(xc: string, grid: GridDescr): string {
  const gridResult = evaluateGridFormat(grid);
  return gridResult[xc] || "";
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

export function zone(str: string): Zone {
  return toZone(str);
}

export function target(str: string): Zone[] {
  return str.split(",").map(zone);
}

export function toRangesData(sheetId: UID, str: string): RangeData[] {
  return str.split(",").map((xc) => ({ _zone: toUnboundedZone(xc), _sheetId: sheetId }));
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

async function typeInComposerHelper(selector: string, text: string, fromScratch: boolean) {
  let composerEl: Element = document.querySelector(selector)!;
  if (fromScratch) {
    composerEl = await startGridComposition();
  }
  // @ts-ignore
  const cehMock = window.mockContentHelper as ContentEditableHelper;
  cehMock.insertText(text);
  composerEl.dispatchEvent(new Event("keydown", { bubbles: true }));
  await nextTick();
  composerEl.dispatchEvent(new InputEvent("input", { data: text, bubbles: true }));
  await nextTick();
  composerEl.dispatchEvent(new Event("keyup", { bubbles: true }));
  await nextTick();
  return composerEl;
}

export async function typeInComposerGrid(text: string, fromScratch: boolean = true) {
  return await typeInComposerHelper(".o-grid div.o-composer", text, fromScratch);
}

export async function typeInComposerTopBar(text: string, fromScratch: boolean = true) {
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
 * The Touch API is currently experimental (mid 2020).
 * This implementation is used in test to easily trigger TouchEvents.
 * (TouchEvent is not experimental and supported by all major browsers.)
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Touch
 */
export class Touch {
  readonly altitudeAngle: number;
  readonly azimuthAngle: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly force: number;
  readonly identifier: number;
  readonly pageX: number;
  readonly pageY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly rotationAngle: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly target: EventTarget;
  readonly touchType: TouchType;
  constructor(touchInitDict: TouchInit) {
    this.identifier = touchInitDict.identifier;
    this.target = touchInitDict.target;
    this.altitudeAngle = touchInitDict.altitudeAngle || 0;
    this.azimuthAngle = touchInitDict.azimuthAngle || 0;
    this.clientX = touchInitDict.clientX || 0;
    this.clientY = touchInitDict.clientY || 0;
    this.force = touchInitDict.force || 0;
    this.pageX = touchInitDict.pageX || 0;
    this.pageY = touchInitDict.pageY || 0;
    this.radiusX = touchInitDict.radiusX || 0;
    this.radiusY = touchInitDict.radiusY || 0;
    this.rotationAngle = touchInitDict.rotationAngle || 0;
    this.screenX = touchInitDict.screenX || 0;
    this.screenY = touchInitDict.screenY || 0;
    this.touchType = touchInitDict.touchType || "direct";
  }
}

/**
 * Return XLSX export with prettified XML files.
 */
export async function exportPrettifiedXlsx(model: Model): Promise<XLSXExport> {
  const xlsxExport = await model.exportXLSX();
  return {
    ...xlsxExport,
    files: xlsxExport.files.map((file) => ({ ...file, content: format(file.content) })),
  };
}

export function mockUuidV4To(model: Model, value: number | string) {
  //@ts-ignore
  return model.uuidGenerator.setNextId(value);
}

/**
 * Make a test environment for testing interactive actions
 */
export function makeInteractiveTestEnv(
  model: Model,
  env?: Partial<SpreadsheetChildEnv>
): SpreadsheetChildEnv {
  return {
    model,
    ...env,
  } as unknown as SpreadsheetChildEnv;
}

export const mockChart = () => {
  const mockChartData: ChartConfiguration = {
    data: undefined,
    options: {
      title: undefined,
    },
    type: undefined,
  };
  class ChartMock {
    constructor(ctx: unknown, chartData: ChartConfiguration) {
      Object.assign(mockChartData, chartData);
    }
    set data(value) {
      mockChartData.data = value;
    }
    get data() {
      return mockChartData.data;
    }
    destroy = () => {};
    update = () => {};
    options = mockChartData.options;
    config = mockChartData;
  }
  //@ts-ignore
  window.Chart = ChartMock;
  return mockChartData;
};

interface CellValue {
  value: string | number | boolean;
  style?: Style;
  format?: string;
  content: string;
}

export function getCellsObject(model: Model, sheetId: UID): Record<string, CellValue> {
  const cells: Record<string, CellValue> = {};
  for (const cell of Object.values(model.getters.getCells(sheetId))) {
    const { col, row } = model.getters.getCellPosition(cell.id);
    cells[toXC(col, row)] = {
      style: cell.style,
      format: cell.format,
      value: model.getters.getEvaluatedCell({ sheetId, col, row }).value,
      content: cell.content,
    };
  }
  return cells;
}

export function doAction(
  path: string[],
  env: SpreadsheetChildEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): void {
  const node = getNode(path, menuRegistry);
  node.action(env);
}

export function getNode(
  _path: string[],
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): FullMenuItem {
  const path = [..._path];
  const root = path.splice(0, 1)[0];
  let node = menuRegistry.get(root);
  for (let p of path) {
    node = node.children
      .filter((item): item is FullMenuItem => typeof item !== "function")
      .find((child) => child.id === p)!;
  }
  return node;
}

export function getName(
  path: string[],
  env: SpreadsheetChildEnv,
  menuRegistry: MenuItemRegistry = topbarMenuRegistry
): string {
  const node = getNode(path, menuRegistry);
  return typeof node.name === "function" ? node.name(env).toString() : node.name.toString();
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
