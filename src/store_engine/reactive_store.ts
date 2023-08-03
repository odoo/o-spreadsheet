import { reactive } from "@odoo/owl";
import { Get } from "./store";

export class ReactiveStore {
  constructor(protected get: Get) {
    return reactive(this);
  }
}
