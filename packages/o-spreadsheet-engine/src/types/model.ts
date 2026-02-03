import { GeoChartRegion } from "./chart/geo_chart";
import { Client, ClientPosition } from "./collaborative/session";
import { TransportService } from "./collaborative/transport_service";
import { Currency } from "./currency";
import { InformationNotification } from "./env";
import { FileStore } from "./files";
import { Locale } from "./locale";
import { Color } from "./misc";

export type Mode = "normal" | "readonly" | "dashboard" | "export_verification";

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
