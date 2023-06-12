import { ExtractedSchema } from "../xml";
import { NAMESPACE } from "./namespaces";

export type DrawingXMLData = ExtractedSchema<typeof FIGURE_SCHEMA>;
export type ChartXMLData = ExtractedSchema<typeof CHART_SCHEMA>;
export type ImageXMLData = ExtractedSchema<typeof IMAGE_SCHEMA>;

const CHART_SCHEMA = {
  name: "graphicFrame",
  quantifier: "optional",
  children: [
    {
      name: "nvGraphicFramePr",
      children: [
        {
          name: "cNvPr",
          attributes: [{ name: "id", type: "number" }, { name: "name" }, { name: "title" }],
        },
        { name: "cNvGraphicFramePr" },
      ],
    },
    {
      name: "xfrm",
      children: [
        {
          name: "off",
          namespace: NAMESPACE.drawing,
          attributes: [
            { name: "x", type: "number" },
            { name: "y", type: "number" },
          ],
        },
        {
          name: "ext",
          namespace: NAMESPACE.drawing,
          attributes: [
            { name: "cx", type: "number" },
            { name: "cy", type: "number" },
          ],
        },
      ],
    },
    {
      name: "graphic",
      namespace: NAMESPACE.drawing,
      children: [
        {
          name: "graphicData",
          attributes: [{ name: "uri" }],
          children: [
            {
              name: "chart",
              namespace: NAMESPACE.chart,
              attributes: [{ name: "id", namespace: NAMESPACE.relationships }],
            },
          ],
        },
      ],
    },
  ],
} as const;

const IMAGE_SCHEMA = {
  name: "pic",
  quantifier: "optional",
  children: [
    {
      name: "nvPicPr",
      children: [
        {
          name: "cNvPr",
          attributes: [{ name: "id", type: "number" }, { name: "name" }, { name: "title" }],
        },
        { name: "cNvPicPr", attributes: [{ name: "preferRelativeResize", type: "boolean" }] },
      ],
    },
    {
      name: "blipFill",
      children: [
        {
          name: "blip",
          attributes: [{ name: "embed", namespace: NAMESPACE.relationships }, { name: "cstate" }],
        },
        {
          name: "stretch",
          children: [{ name: "fillRect" }],
        },
      ],
    },
    {
      name: "spPr",
      children: [
        {
          name: "prstGeom",
          namespace: NAMESPACE.drawing,
          attributes: [{ name: "prst", type: "string" }],
          children: [{ name: "avLst" }],
        },
        { name: "noFill" },
      ],
    },
  ],
} as const;

export const FIGURE_SCHEMA = {
  name: "wsDr",
  namespace: NAMESPACE.spreadsheetDrawing,
  children: [
    {
      name: "twoCellAnchor", // Only twoCellAnchor are supported for xlsx drawings.
      quantifier: "many",
      children: [
        markerAnchorSchema("from"),
        markerAnchorSchema("to"),
        CHART_SCHEMA,
        IMAGE_SCHEMA,
        {
          quantifier: "optional",
          name: "clientData",
          attributes: [{ name: "fLocksWithSheet", type: "boolean" }],
        },
      ],
    },
  ],
} as const;

function markerAnchorSchema<N extends string>(name: N) {
  return {
    name,
    namespace: NAMESPACE.spreadsheetDrawing,
    children: [
      { name: "col", type: "number" },
      { name: "colOff", type: "number" },
      { name: "row", type: "number" },
      { name: "rowOff", type: "number" },
    ],
  } as const;
}
