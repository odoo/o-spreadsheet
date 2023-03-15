import { App, whenReady } from "@odoo/owl";
import { Spreadsheet } from "./components";
import { cssPropertiesToCss } from "./components/helpers";
import { Model, ModelConfig } from "./model";
import { SpreadsheetEnv, WorkbookData } from "./types";

interface AppConfig extends ModelConfig {
  /**
   * Config to create a `Model` instance. Or an instance of `Model`.
   */
  model?: Model | ModelConfig;
  /**
   * The data to load in the spreadsheet.
   * If `model` is already an instance of `Model`, this property is ignored.
   */
  data?: Partial<WorkbookData>;
  env?: Partial<SpreadsheetEnv>;
  /**
   * owl templates. If you are using the bundled file, you don't need to provide this.
   */
  templates?: Document | string;
  dev?: boolean;
}

const NOTIFICATION_STYLE = cssPropertiesToCss({
  position: "absolute",
  border: "2px solid black",
  background: "#F5F5DCD5",
  padding: "20px",
  "z-index": "10000",
  width: "140px",
});

function getDefaultEnv(): SpreadsheetEnv {
  const tags = new Set();

  return {
    editText(title, callback, options = {}) {
      let text;
      if (!options.error) {
        text = window.prompt(title, options.placeholder);
      } else {
        text = window.prompt(options.error, options.placeholder);
      }
      callback(text);
    },
    raiseError(content) {
      window.alert(content);
    },
    notifyUser(notification) {
      if (tags.has(notification.tag)) return;
      const div = document.createElement("div");
      const text = document.createTextNode(notification.text);
      div.appendChild(text);

      // @ts-ignore it's supposed to be a readonly property
      div.style = NOTIFICATION_STYLE;
      const element: HTMLElement | null = document.querySelector(".o-spreadsheet");
      div.onclick = () => {
        tags.delete(notification.tag);
        element?.removeChild(div);
      };
      element?.appendChild(div);
      tags.add(notification.tag);
    },
    askConfirmation(content, confirm, cancel) {
      if (window.confirm(content)) {
        confirm();
      } else {
        cancel?.();
      }
    },
  };
}

export async function mountSpreadsheet(target: HTMLElement, config: AppConfig) {
  await whenReady();
  // @ts-ignore
  const globalTemplates = window.__SPREADSHEET_TEMPLATES__;
  const templates = config.templates || globalTemplates;
  if (!templates) {
    throw new Error(`
    No templates found.
    Please provide owl xml templates in the config.
    Use the bundle o-spreadsheet file or
    Either pass a xml document { templates }
    `);
  }
  const model = config.model instanceof Model ? config.model : new Model(config.data, config.model);
  const app = new App(Spreadsheet, {
    dev: config.dev,
    templates,
    // @ts-ignore child env ?
    env: { ...config.env, ...getDefaultEnv() },
    props: { model },
  });
  app.mount(target);
  return app;
}
