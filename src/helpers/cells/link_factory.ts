import { Registry } from "../../registry";
import { _lt } from "../../translation";
import { CellValue, Getters, Link, SpreadsheetChildEnv } from "../../types";
import { isMarkdownLink, isSheetUrl, isWebLink, parseMarkdownLink, parseSheetUrl } from "../misc";

/**
 * Add the `https` prefix to the url if it's missing
 */
export function withHttp(url: string): string {
  return !/^https?:\/\//i.test(url) ? `https://${url}` : url;
}

//------------------------------------------------------------------------------
// URL Registry
//------------------------------------------------------------------------------

interface LinkBuilder {
  readonly match: (url: string) => boolean;
  readonly createLink: (url: string, label: string, getters: Getters) => Link;
  readonly open: (url: string, env: SpreadsheetChildEnv) => void;
  readonly sequence: number;
}

export const urlRegistry = new Registry<LinkBuilder>();

function createWebLink(url: string, label?: string): Link {
  url = withHttp(url);
  return {
    url,
    label: label || url,
    urlRepresentation: url,
    isExternal: true,
    isUrlEditable: true,
  };
}

urlRegistry.add("sheet_URL", {
  match: (url) => isSheetUrl(url),
  createLink: (url, label, getters) => {
    const sheetId = parseSheetUrl(url);
    return {
      label,
      url,
      isExternal: false,
      isUrlEditable: false,
      get urlRepresentation() {
        return getters.tryGetSheetName(sheetId) || _lt("Invalid sheet");
      },
    };
  },
  open(url, env) {
    const sheetId = parseSheetUrl(url);
    env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: env.model.getters.getActiveSheetId(),
      sheetIdTo: sheetId,
    });
  },
  sequence: 0,
});

function matchBuilder(url: string): LinkBuilder | undefined {
  return urlRegistry
    .getAll()
    .sort((a, b) => a.sequence - b.sequence)
    .find((urlType) => urlType.match(url));
}

function matchBuilderFunction(url: string): LinkBuilder["createLink"] {
  const builder = matchBuilder(url);
  if (!builder) {
    return createWebLink;
  }
  return builder.createLink;
}

export function openLink(link: Link, env: SpreadsheetChildEnv) {
  const builder = matchBuilder(link.url);
  if (builder) {
    builder.open(link.url, env);
  } else {
    window.open(link.url, "_blank");
  }
}

export function linkDetector(getters: Getters) {
  return function detectLink(value: CellValue | null): Link | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    if (isMarkdownLink(value)) {
      const { label, url } = parseMarkdownLink(value);
      const createLink = matchBuilderFunction(url);
      return createLink(url, label, getters);
    } else if (isWebLink(value)) {
      return createWebLink(value);
    }
    return undefined;
  };
}
