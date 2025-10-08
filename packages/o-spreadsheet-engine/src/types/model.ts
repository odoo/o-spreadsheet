import { GeoChartRegion } from "./chart/geo_chart";
import { Client, ClientPosition } from "./collaborative/session";
import { TransportService } from "./collaborative/transport_service";
import { Currency } from "./currency";
import { InformationNotification } from "./env";
import { FileStore } from "./files";
import { Locale } from "./locale";
import { Color } from "./misc";

/**
 * Model
 *
 * The Model class is the owner of the state of the Spreadsheet. However, it
 * has more a coordination role: it defers the actual state manipulation work to
 * plugins.
 *
 * At creation, the Model instantiates all necessary plugins. They each have
 * a private state (for example, the Selection plugin has the current selection).
 *
 * State changes are then performed through commands.  Commands are dispatched
 * to the model, which will then relay them to each plugins (and the history
 * handler). Then, the model will trigger an 'update' event to notify whoever
 * is concerned that the command was applied (if it was not cancelled).
 *
 * Also, the model has an unconventional responsibility: it actually renders the
 * visible viewport on a canvas. This is because each plugins actually manage a
 * specific concern about the content of the spreadsheet, and it is more natural
 * if they are able to read data from their internal state to represent it on the
 * screen.
 *
 * Note that the Model can be used in a standalone way to manipulate
 * programmatically a spreadsheet.
 */
export type Mode = "normal" | "readonly" | "dashboard";

export interface ModelConfig {
  readonly mode: Mode;
  /**
   * Any external custom dependencies your custom plugins or functions might need.
   * They are available in plugins config and functions
   * evaluation context.
   */
  readonly custom: Readonly<{
    [key: string]: any;
  }>;
  readonly defaultCurrency?: Partial<Currency>;
  /**
   * External dependencies required to enable some features
   * such as uploading images.
   */
  readonly external: Readonly<ModelExternalConfig>;
  readonly moveClient: (position: ClientPosition) => void;
  readonly transportService: TransportService;
  readonly client: Client;
  readonly snapshotRequested: boolean;
  readonly notifyUI: (payload: InformationNotification) => void;
  readonly raiseBlockingErrorUI: (text: string) => void;
  readonly customColors: Color[];
}

export interface ModelExternalConfig {
  readonly fileStore?: FileStore;
  readonly loadCurrencies?: () => Promise<Currency[]>;
  readonly loadLocales?: () => Promise<Locale[]>;
  readonly geoJsonService?: {
    getAvailableRegions: () => GeoChartRegion[];
    getTopoJson: (region: string) => Promise<any>;
    /**  Convert the name of a geographical feature (eg. France) to the id of the corresponding feature in the TopoJSON */
    geoFeatureNameToId: (region: string, territory: string) => string | undefined;
  };
}
