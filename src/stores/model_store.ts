import { Model } from "@odoo/o-spreadsheet-engine/model";
import { createAbstractStore } from "../store_engine";

export const ModelStore = createAbstractStore<Model>("Model");
