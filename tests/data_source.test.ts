import { DataSource, UIPlugin } from "../src";
import { DataSourceRegistry } from "../src/data_source";
import { args, functionRegistry } from "../src/functions";
import { Model, ModelConfig } from "../src/model";
import { uiPluginRegistry } from "../src/plugins";
import { UIPluginConstructor } from "../src/plugins/ui_plugin";
import { SelectionStreamProcessor } from "../src/selection_stream/selection_stream_processor";
import { StateObserver } from "../src/state_observer";
import { CommandDispatcher, Getters, UID } from "../src/types";
import { setCellContent } from "./test_helpers/commands_helpers";
import { getCellContent } from "./test_helpers/getters_helpers";
import { getPlugin, nextTick, resetFunctions } from "./test_helpers/helpers";

class StringDataSource extends DataSource<string, string> {
  async _fetchMetadata(): Promise<string> {
    return "metadata";
  }
  async _fetch(): Promise<string> {
    return "data";
  }
}

class DataSourcePlugin extends UIPlugin {
  static getters = ["get"];

  dataSources: DataSourceRegistry<string, string>;

  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig,
    selection: SelectionStreamProcessor
  ) {
    super(getters, state, dispatch, config, selection);
    this.dataSources = config.dataSources;
  }

  addDataSource(id: UID, dataSource: DataSource<string, string>) {
    this.dataSources.add(id, dataSource);
  }

  get(id: UID): DataSource<string, string> {
    return this.dataSources.get(id);
  }
}

let model: Model;
let uiPlugins: Record<string, UIPluginConstructor>;
let dataSourcePlugin: DataSourcePlugin;

beforeAll(() => {
  uiPlugins = { ...uiPluginRegistry.content };
  resetFunctions();
  functionRegistry.add("WAIT2", {
    description: "Wait2",
    args: args(`id (number) Id of the dataSource`),
    compute: function (id: UID) {
      return this.getters.get(id.toString()).getSync() || "LOADING...";
    },
    returns: ["ANY"],
  });
  uiPluginRegistry.add("dataSourcePlugin", DataSourcePlugin);
});

afterAll(() => {
  uiPluginRegistry.content = uiPlugins;
});

beforeEach(() => {
  model = new Model();
  dataSourcePlugin = getPlugin(model, DataSourcePlugin);
});

describe("DataSource", () => {
  test("Metadata are loaded at dataSource creation", async () => {
    dataSourcePlugin.addDataSource("1", new StringDataSource());
    expect(dataSourcePlugin.get("1").getMetadataSync()).toBeUndefined();
    await nextTick();
    expect(dataSourcePlugin.get("1").getMetadataSync()).toBe("metadata");
  });

  test("Data are not loaded at dataSource creation", async () => {
    const ds = new StringDataSource();
    expect(ds.getSync()).toBeUndefined();
    await nextTick();
    expect(ds.getSync()).toBeUndefined();
    await ds.get();
    expect(ds.getSync()).toBe("data");
  });

  test("Add a way to ensure that all dataSources are loaded", async () => {
    dataSourcePlugin.addDataSource("1", new StringDataSource());
    dataSourcePlugin.addDataSource("2", new StringDataSource());
    expect(dataSourcePlugin.get("1").getSync()).toBeUndefined();
    expect(dataSourcePlugin.get("2").getSync()).toBeUndefined();
    await nextTick();
    expect(dataSourcePlugin.get("1").getSync()).toBeUndefined();
    expect(dataSourcePlugin.get("2").getSync()).toBeUndefined();
    await model.waitForIdle();
    expect(dataSourcePlugin.get("1").getSync()).toBe("data");
    expect(dataSourcePlugin.get("2").getSync()).toBe("data");
  });

  test("Functions can rely on dataSource, and are evaluated right after the dataSource is ready", async () => {
    jest.useFakeTimers();
    const stringDs = new StringDataSource();
    dataSourcePlugin.addDataSource("1", stringDs);
    setCellContent(model, "A1", "=WAIT2(1)");
    expect(getCellContent(model, "A1")).toBe("LOADING...");
    // ready the dataSource
    await stringDs.get();
    jest.advanceTimersByTime(2);
    expect(getCellContent(model, "A1")).toBe("data");
  });
});
