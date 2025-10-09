import { BasePlugin } from "@odoo/o-spreadsheet-engine";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/functionRegistry";
import { matrixMap } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { MergePlugin } from "@odoo/o-spreadsheet-engine/plugins/core/merge";
import { CorePluginConstructor } from "@odoo/o-spreadsheet-engine/plugins/core_plugin";
import { UIPluginConstructor } from "@odoo/o-spreadsheet-engine/plugins/ui_plugin";
import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { Image } from "@odoo/o-spreadsheet-engine/types/image";
import { ModelExternalConfig } from "@odoo/o-spreadsheet-engine/types/model";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { XLSXExport } from "@odoo/o-spreadsheet-engine/types/xlsx";
import { isXLSXExportXMLFile } from "@odoo/o-spreadsheet-engine/xlsx/helpers/xlsx_helper";
import {
  fixLengthySheetNames,
  purgeSingleRowTables,
} from "@odoo/o-spreadsheet-engine/xlsx/xlsx_writer";
import { App, Component, ComponentConstructor, useState, xml } from "@odoo/owl";
import type { ChartConfiguration } from "chart.js";
import format from "xml-formatter";
import { functionCache } from "../../src";
import { Action } from "../../src/actions/action";
import { ComposerSelection } from "../../src/components/composer/composer/abstract_composer_store";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { CellComposerProps, Composer } from "../../src/components/composer/composer/composer";
import { ComposerFocusStore } from "../../src/components/composer/composer_focus_store";
import { getCurrentSelection, isMobileOS } from "../../src/components/helpers/dom_helpers";
import { SidePanelStore } from "../../src/components/side_panel/side_panel/side_panel_store";
import { Spreadsheet, SpreadsheetProps } from "../../src/components/spreadsheet/spreadsheet";
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
import { SheetUIPlugin } from "../../src/plugins/ui_feature";
import { MenuItemRegistry } from "../../src/registries/menu_items_registry";
import { topbarMenuRegistry } from "../../src/registries/menus";
import {
  DependencyContainer,
  Store,
  StoreConstructor,
  proxifyStoreMutation,
  useStore,
} from "../../src/store_engine";
import { ModelStore } from "../../src/stores";
import { FormulaFingerprintStore } from "../../src/stores/formula_fingerprints_store";
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
  ComposerFocusType,
  ConditionalFormat,
  Currency,
  DEFAULT_LOCALES,
  EditionMode,
  EvaluatedCell,
  ExcelWorkbookData,
  Format,
  GridRenderingContext,
  Highlight,
  Matrix,
  OrderedLayers,
  RangeData,
  Style,
  UID,
  Zone,
} from "../../src/types";
import { FileStore } from "../__mocks__/mock_file_store";
import { registerCleanup } from "../setup/jest.setup";
import { MockClipboard } from "./clipboard";
import { redo, setCellContent, setFormat, setStyle, undo } from "./commands_helpers";
import { DOMTarget, click, getTarget, getTextNodes, keyDown, keyUp } from "./dom_helper";
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

export function spyUiPluginHandle(model: Model): jest.SpyInstance {
  return jest.spyOn(getPlugin(model, SheetUIPlugin), "handle");
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
  addToRegistry(registry, key, Plugin);
}

export function addToRegistry<T>(registry: Registry<T>, key: string, value: T) {
  if (registry.contains(key)) {
    const oldValue = registry.get(key);
    registry.replace(key, value);
    registerCleanup(() => registry.replace(key, oldValue));
  } else {
    registry.add(key, value);
    registerCleanup(() => registry.remove(key));
  }
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
  const fixture = document.createElement("div");
  document.body.appendChild(fixture);
  return fixture;
}

class FakeRendererStore extends RendererStore {
  // we don't want to actually draw anything on the canvas as it cannot be tested
  draw() {
    return "noStateChange";
  }
  startAnimation() {
    return "noStateChange";
  }
  stopAnimation() {
    return "noStateChange";
  }
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
  registerCleanup(() => {
    container.dispose();
  });

  container.inject(ModelStore, model);
  container.inject(RendererStore, new FakeRendererStore(container.get.bind(container)));

  const notificationStore = container.get(NotificationStore);
  notificationStore.updateNotificationCallbacks({
    notifyUser: mockEnv.notifyUser || (() => {}),
    raiseError: mockEnv.raiseError || (() => {}),
    askConfirmation: mockEnv.askConfirmation || (() => {}),
  });

  // For tests without the grid composer mounted, we register fake composer
  const composerFocusStore = container.get(ComposerFocusStore);
  composerFocusStore.focusComposer(
    {
      id: "mockTestComposer",
      get editionMode(): EditionMode {
        return "inactive";
      },
      startEdition: () => {},
      stopEdition: () => {},
      setCurrentContent: () => {},
    },
    { focusMode: "inactive" }
  );

  const store = container.get(SidePanelStore);
  const sidePanelStore = proxifyStoreMutation(store, () => container.trigger("store-updated"));
  return {
    model,
    isDashboard: mockEnv.isDashboard || (() => false),
    openSidePanel: mockEnv.openSidePanel || sidePanelStore.open.bind(sidePanelStore),
    replaceSidePanel: mockEnv.replaceSidePanel || sidePanelStore.replace.bind(sidePanelStore),
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
    get isSmall() {
      return mockEnv.isSmall || false;
    },
    isMobile: mockEnv.isMobile || isMobileOS,
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
  const model = optionalArgs.model || optionalArgs.env?.model || new Model();
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
    result[toXC(col, row)] = model.getters.getEvaluatedCell(position);
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

export function getFormattedGrid(model: Model): GridResult {
  const result: GridResult = {};
  for (const [xc, cell] of Object.entries(getCellGrid(model))) {
    result[xc] = cell.formattedValue ?? "";
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
  const model = new Model({ sheets: [{ cells: grid }] });
  const result = {};
  for (const xc in grid) {
    result[xc] = getEvaluatedCell(model, xc).value;
  }
  return result;
}

export function evaluateGridText(grid: GridDescr): FormattedGridDescr {
  const model = new Model();
  for (const xc in grid) {
    if (grid[xc] !== undefined) {
      setCellContent(model, xc, grid[xc]!);
    }
  }
  const result = {};
  for (const xc in grid) {
    result[xc] = getCellContent(model, xc);
  }
  return result;
}

export function evaluateGridFormat(grid: GridDescr): FormattedGridDescr {
  const model = new Model();
  for (const xc in grid) {
    if (grid[xc] !== undefined) {
      setCellContent(model, xc, grid[xc]!);
    }
  }
  const result = {};
  for (const xc in grid) {
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

export function evaluateArrayFormula(model: Model, formula: string) {
  const result = model.getters.evaluateFormula(model.getters.getActiveSheetId(), formula);
  return Array.isArray(result) ? result : [[result]];
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
  for (const xc in grid) {
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
  _clearFunctions();
  registerCleanup(restoreDefaultFunctions);
}

function _clearFunctions() {
  Object.keys(functionMap).forEach((k) => {
    delete functionMap[k];
  });

  Object.keys(functionsContent).forEach((k) => {
    delete functionsContent[k];
  });
}

export function restoreDefaultFunctions() {
  for (const f in functionCache) {
    delete functionCache[f];
  }
  _clearFunctions();
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
    rule: { values: [value], operator: "isEqual", type: "CellIsRule", style },
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
  const selection = document.getSelection()!;
  if (fromScratch) {
    composerEl = await startGridComposition();
    const range = document.createRange();
    selection.addRange(range);
    range.setStart(composerEl, 0);
    range.setEnd(composerEl, 0);
  }

  (composerEl as HTMLElement).focus();
  composerEl.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "" }));

  await nextTick();
  insertText(composerEl as HTMLElement, text);
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

interface EditStandaloneComposerOptions {
  confirm?: boolean;
  fromScratch?: boolean;
}
export async function editStandaloneComposer(
  target: DOMTarget,
  text: string,
  { confirm = true, fromScratch = true }: EditStandaloneComposerOptions = {}
) {
  const composerEl = getTarget(target) as HTMLElement;

  composerEl.focus();
  await click(composerEl);

  if (fromScratch) {
    // select the entire content
    const textNodes = getTextNodes(composerEl);
    const firstTextNode = textNodes[0];
    const lastTextNode = textNodes.at(-1);
    const selection = document.getSelection()!;
    if (selection.rangeCount === 0) {
      const range = document.createRange();
      selection.addRange(range);
    }
    const range = selection.getRangeAt(0);
    range.setStart(firstTextNode ?? composerEl, 0);
    range.setEnd(lastTextNode ?? composerEl, lastTextNode?.textContent?.length ?? 0);
  }
  insertText(composerEl, text);
  composerEl.dispatchEvent(new InputEvent("input", { data: text, bubbles: true }));

  if (confirm) {
    keyDown({ key: "Enter" });
    await keyUp({ key: "Enter" });
  }

  return composerEl;
}

/**
 * This simulates the insertion of text in the composer DOM and sets the selection
 * (focusNode, anchorNode and offsets) at a sensible position in the DOM.
 * This does not 100% reflect the actual behavior of browsers (they all behave in slightly
 * different ways anyway).
 * If you want to test a very specific behavior about the selection, you should probably
 * set the selection manually exactly where you want after calling this function.
 */
function insertText(el: HTMLElement, text: string) {
  // Reads the text content of `el` line per line, inserts the text
  // than rebuilds the entire DOM matching the new text.

  const selection = document.getSelection()!;
  const { start, end } = getCurrentSelection(el as HTMLElement);
  const currentTextPerLines: string[] = [];
  const lines = el.childNodes.length ? el.childNodes : [el];
  for (const paragraph of lines) {
    let lineText = "";
    for (const el of getTextNodes(paragraph as HTMLElement)) {
      lineText += el.textContent;
    }
    currentTextPerLines.push(lineText);
  }
  const fullText = currentTextPerLines.join("\n");
  const textBefore = fullText.slice(0, start);
  const textAfter = fullText.slice(end);
  const newText = textBefore + text + textAfter;
  const focusedLineIndex = (textBefore + text).split("\n").length - 1;
  const newLines = newText.split("\n");
  el.innerHTML = "";
  for (const lineIndex of range(0, newLines.length)) {
    const lineText = newLines[lineIndex];
    const p = document.createElement("p");
    const span = document.createElement("span");
    if (lineText) {
      span.textContent = lineText;
    } else {
      span.appendChild(document.createElement("br"));
    }
    p.appendChild(span);
    el.appendChild(p);
    if (lineIndex === focusedLineIndex) {
      if (selection.rangeCount === 0) {
        const range = document.createRange();
        selection.addRange(range);
      }
      const range = selection.getRangeAt(0);
      const nodeOffset = (textBefore + text).split("\n").pop()!.length;

      range.setStart(span.firstChild ?? span, nodeOffset);
      range.setEnd(span.firstChild ?? span, nodeOffset);
    }
  }
}

/**
 * Return the text of every node matching the selector
 */
export function textContentAll(cssSelector: string): string[] {
  const nodes = document.querySelectorAll(cssSelector);
  if (!nodes) return [];
  return [...nodes].map((node) => node.textContent).filter((text): text is string => text !== null);
}

export function getInputSelection() {
  const selection = document.getSelection()!;
  return {
    anchorNodeText: selection.anchorNode?.textContent,
    anchorOffset: selection.anchorOffset,
    focusNodeText: selection.focusNode?.textContent,
    focusOffset: selection.focusOffset,
  };
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
  for (const handler of model["handlers"]) {
    if (handler instanceof BasePlugin) {
      handler.exportForExcel(data);
    }
  }
  data = fixLengthySheetNames(data);
  return purgeSingleRowTables(data);
}

export const mockChart = (options: any = {}) => {
  const mockChartData: ChartConfiguration = {
    data: { datasets: [] },
    type: "bar",
  };
  class MockLuxonTimeAdapter {
    _id = "luxon";
  }
  class ChartMock {
    static register = (...items: any[]) => {
      ChartMock.registry.plugins.items.push(...items);
    };
    static unregister = (...items: any[]) => {
      ChartMock.registry.plugins.items = ChartMock.registry.plugins.items.filter((item) =>
        items.some((i) => i.id === item.id)
      );
    };
    static _adapters = { _date: MockLuxonTimeAdapter };
    static registry = {
      plugins: {
        items: [] as any[],
        get(key: string) {
          return ChartMock.registry.plugins.items.find((item) => item.id === key);
        },
      },
    };
    static Tooltip = { positioners: {} };
    constructor(ctx: unknown, chartData: ChartConfiguration) {
      Object.assign(mockChartData, chartData);
      this.constructorMock();
    }
    constructorMock() {} // for spying
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
    static BarController = class {};
    static BarElement = class {};
    chartArea = options.chartArea ?? { left: 0, top: 0, right: 100, bottom: 100 };
    scales = options.scales ?? undefined;
  }

  //@ts-ignore
  window.Chart = ChartMock;
  //@ts-ignore
  window.ChartGeo = {};
  return mockChartData;
};

export const mockGeoJsonService: ModelExternalConfig["geoJsonService"] = {
  getAvailableRegions: () => [
    { id: "world", label: "World", defaultProjection: "mercator" },
    { id: "usa", label: "United States", defaultProjection: "albersUsa" },
  ],
  getTopoJson: async () => ({
    type: "FeatureCollection",
    features: [
      { type: "Feature", id: "FR", properties: { name: "France" }, geometry: {} },
      { type: "Feature", id: "DE", properties: { name: "Germany" }, geometry: {} },
      { type: "Feature", id: "ES", properties: { name: "Spain" }, geometry: {} },
    ],
  }),
  geoFeatureNameToId: (region: string, territoryName: string) => {
    if (territoryName === "France") return "FR";
    if (territoryName === "Germany") return "DE";
    if (territoryName === "Spain") return "ES";
    return "";
  },
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
      const chartId = model.getters.getChartIdFromFigureId(figureId)!;
      return model.getters.getChartDefinition(chartId);
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
  composerProps: Partial<CellComposerProps>;
};

export class ComposerWrapper extends Component<ComposerWrapperProps, SpreadsheetChildEnv> {
  static components = { Composer };
  static template = xml/*xml*/ `
    <div class="o-spreadsheet"/>
    <Composer t-props="composerProps"/>
  `;
  static props = { composerProps: Object, focusComposer: String };
  state = useState({ focusComposer: <ComposerFocusType>"inactive" });
  composerStore!: Store<CellComposerStore>;

  setup() {
    this.state.focusComposer = this.props.focusComposer;
    this.composerStore = useStore(CellComposerStore);
  }

  get composerProps(): CellComposerProps {
    return {
      ...this.props.composerProps,
      onComposerContentFocused: () => {
        this.state.focusComposer = "contentFocus";
        this.setEdition({});
      },
      focus: this.state.focusComposer,
      composerStore: this.composerStore,
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
  composerProps: Partial<CellComposerProps> = {},
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

export function getFingerprint(store: FormulaFingerprintStore, xc: string, sheetId?: UID) {
  const { col, row } = toCartesian(xc);
  const positions = store.colors.keys();
  if (positions.length === 0) {
    return undefined;
  }
  sheetId ??= positions[0]?.sheetId;
  return store.colors.get({ sheetId, col, row });
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
): CellComposerStore {
  const container = new DependencyContainer();
  registerCleanup(() => {
    container.dispose();
  });

  container.inject(ModelStore, model);
  notificationStore = notificationStore || makeTestNotificationStore();
  container.inject(NotificationStore, notificationStore);
  return container.get(CellComposerStore);
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

export function flattenHighlightRange(
  highlight: Highlight
): { zone: Zone; sheetId: UID } & Omit<Highlight, "range"> {
  const flatHighlight: any = {
    ...highlight,
    zone: highlight.range.zone,
    sheetId: highlight.range.sheetId,
    color: highlight.color,
  };
  delete flatHighlight.range;
  return flatHighlight;
}

export function setMobileMode() {
  const mock = jest
    .spyOn(window.navigator, "userAgent", "get")
    .mockImplementation(
      () =>
        "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36"
    );
  registerCleanup(() => {
    mock.mockRestore();
  });
}
