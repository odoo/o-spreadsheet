import { Registry } from "../registries/registry";
import { _t } from "../translation";
import { CellValue, CommandResult, Getters, Link, SpreadsheetChildEnv } from "../types";
import { isMarkdownLink, isSheetUrl, isWebLink, parseMarkdownLink, parseSheetUrl } from "./misc";

/**
 * Add the `https` prefix to the url if it's missing
 */
export function withHttps(url: string): string {
  return !/^https?:\/\//i.test(url) ? `https://${url}` : url;
}

//------------------------------------------------------------------------------
// URL Registry
//------------------------------------------------------------------------------

export interface LinkSpec {
  readonly match: (url: string) => boolean;
  readonly createLink: (url: string, label: string) => Link;
  /**
   * String used to display the URL in components.
   * Particularly useful for special links (sheet, etc.)
   * - a simple web link displays the raw url
   * - a link to a sheet displays the sheet name
   */
  readonly urlRepresentation: (url: string, getters: Getters) => string;
  readonly open: (url: string, env: SpreadsheetChildEnv) => void;
  readonly sequence: number;
}

export const urlRegistry = new Registry<LinkSpec>();

function createWebLink(url: string, label?: string): Link {
  url = withHttps(url);
  return {
    url,
    label: label || url,
    isExternal: true,
    isUrlEditable: true,
  };
}

urlRegistry.add("sheet_URL", {
  match: (url) => isSheetUrl(url),
  createLink: (url, label) => {
    return {
      label,
      url,
      isExternal: false,
      isUrlEditable: false,
    };
  },
  urlRepresentation(url, getters) {
    const sheetId = parseSheetUrl(url);
    return getters.tryGetSheetName(sheetId) || _t("Invalid sheet");
  },
  open(url, env) {
    const sheetId = parseSheetUrl(url);
    const result = env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: env.model.getters.getActiveSheetId(),
      sheetIdTo: sheetId,
    });
    if (result.isCancelledBecause(CommandResult.SheetIsHidden)) {
      env.notifyUser({
        type: "warning",
        sticky: false,
        text: _t("Cannot open the link because the linked sheet is hidden."),
      });
    }
  },
  sequence: 0,
});

const WebUrlSpec: LinkSpec = {
  createLink: createWebLink,
  match: (url) => isWebLink(url),
  open: (url) => window.open(url, "_blank"),
  urlRepresentation: (url) => url,
  sequence: 0,
};

function findMatchingSpec(url: string): LinkSpec {
  return (
    urlRegistry
      .getAll()
      .sort((a, b) => a.sequence - b.sequence)
      .find((urlType) => urlType.match(url)) || WebUrlSpec
  );
}

export function urlRepresentation(link: Link, getters: Getters): string {
  return findMatchingSpec(link.url).urlRepresentation(link.url, getters);
}

export function openLink(link: Link, env: SpreadsheetChildEnv) {
  findMatchingSpec(link.url).open(link.url, env);
}

export function detectLink(value: CellValue | null): Link | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  if (isMarkdownLink(value)) {
    const { label, url } = parseMarkdownLink(value);
    return findMatchingSpec(url).createLink(url, label);
  } else if (isWebLink(value)) {
    return createWebLink(value);
  }
  return undefined;
}
