import { featurePluginRegistry } from "@odoo/o-spreadsheet-engine/plugins";
import { DataCleanupPlugin } from "./ui_feature";

featurePluginRegistry.add("data_cleanup", DataCleanupPlugin);
