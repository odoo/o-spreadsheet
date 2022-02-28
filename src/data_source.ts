import { EventBus } from "./helpers/event_bus";
import { debounce } from "./helpers/misc";
import { Registry } from "./registry";

interface FetchParams {
  forceFetch?: boolean;
}

/**
 * DataSourceRegistry is used to contains all the DataSource of spreadsheet.
 * It's role is to ensure that an evaluation is triggered when a data source is
 * ready, and to provide a way to wait for the loading of all the data sources
 */
export class DataSourceRegistry<M, D> extends EventBus<any> {
  private registry: Registry<DataSource<M, D>> = new Registry();

  /**
   * Add a new DataSource.
   *
   * Note that it will load the metadata directly
   */
  add(key: string, value: DataSource<M, D>): DataSourceRegistry<M, D> {
    this.registry.add(key, value);
    const debouncedLoaded: Function = debounce(() => this.trigger("data-loaded", { id: key }), 0);
    value.on("data-loaded", this, () => debouncedLoaded());
    value.loadMetadata();
    return this;
  }

  /**
   * Get an item from the registry
   */
  get(key: string): DataSource<M, D> {
    return this.registry.get(key);
  }

  /**
   * Get a list of all elements in the registry
   */
  getAll(): DataSource<M, D>[] {
    return this.registry.getAll();
  }

  /**
   * Get a list of all elements in the registry
   */
  getKeys(): string[] {
    return this.registry.getKeys();
  }

  /**
   * Remove an item from the registry
   */
  remove(key: string) {
    const value = this.get(key);
    value.off("data-loaded", this);
    this.registry.remove(key);
  }

  /**
   * Wait for the loading of all the data sources
   */
  async waitForReady() {
    const proms: Promise<D>[] = [];
    for (const source of this.getAll()) {
      proms.push(source.get());
    }
    return Promise.all(proms);
  }
}
/**
 * DataSource is an abstract class that contains the logic of fetching and
 * maintaining access to data that have to be loaded.
 *
 * A class which extends this class have to implement two different methods:
 * * `_fetchMetadata`: This method should fetch the metadata, i.e. data that
 * should be fetch only once.
 *
 * * `_fetch`: This method should fetch the data from the server.
 *
 * To get the data from this class, there is three options:
 * * `get`: async function that will returns the data when it's loaded
 * * `getSync`: get the data that are currently loaded, undefined if no data
 * are loaded
 * * specific method: Subclass can implement concrete method to have access to a
 * particular data.
 */
export abstract class DataSource<M, D> extends EventBus<any> {
  protected data: D | undefined;
  protected metadata: M | undefined;

  private lastUpdate: number | undefined;
  private dataPromise: Promise<D> | undefined;
  private metadataPromise: Promise<M> | undefined;

  /**
   * Load the metadata
   */
  async loadMetadata() {
    if (!this.metadataPromise) {
      this.metadataPromise = this._fetchMetadata().then((metadata) => {
        this.metadata = metadata;
        return metadata;
      });
    }
    await this.metadataPromise;
  }

  /**
   * This method should be use to get the data
   */
  async get(params?: FetchParams): Promise<D> {
    if (params && params.forceFetch) {
      this.data = undefined;
      this.dataPromise = undefined;
    }
    await this.loadMetadata();
    if (!this.dataPromise) {
      this.dataPromise = this._fetch(params).then((data) => {
        this.data = data;
        this.lastUpdate = Date.now();
        this.trigger("data-loaded");
        return data;
      });
    }
    return this.dataPromise;
  }

  /**
   * Fetch the metadata, which should be fetched once.
   */
  abstract _fetchMetadata(): Promise<M>;

  /**
   * Method that should be overridden to retrieve data from the server
   */
  abstract _fetch(params?: FetchParams): Promise<D>;

  /**
   * Get the data ONLY if it's ready (data are loaded). Returns undefined if
   * it's not ready
   */
  getSync(): D | undefined {
    return this.data;
  }

  /**
   * Get the metadata ONLY if it's ready (loaded). Returns undefined if it's
   * not ready
   */
  getMetadataSync(): M | undefined {
    return this.metadata;
  }

  getLastUpdate() {
    return this.lastUpdate;
  }
}
