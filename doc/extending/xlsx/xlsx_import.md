# XLSX Import

## General

The import of an XLSX have 2 steps :

1.  Parse the XMLs into intermediate XLSX objects. These objects are close to what's inside the XMLs, but can be used by o_spreadsheet.
2.  Convert these objects into a `WorkbookData` object that can be imported in o_spreadsheet.

The features not supported at parsing and at conversion are different only from a development perspective. For the end user, it does not matter whether the feature is not supported and parsing or at conversion, except for a different error message in the console.

## What we don't support at parsing of the XMLs :

These are the elements of the XMLs that we don't parse at all because we don't implement them inside o_spreadsheet and they have a different structure than other XLSX objects, so parsing them would require additional implementation work.

- Style :

  - Fills : gradients fills are not parsed
  - Fonts :
    - font family : this is useless for us. It's an index to the table at [OpenXml §18.18.94)[https://www.ecma-international.org/publications-and-standards/standards/ecma-376/]
  - CellStyleXfs :
    - It's supposed to be additional style to apply to the cells, but this doesn't really seems to be used by excel.
  - Boolean applyAlignment/applyFont/applyFill... :
    - These booleans are supposed to signal whether or not the fills/fonts/... should be applied in this style, but these seems to be ignored by Excel.

- Strings :

  - richText (text with non-uniform formatting)
    - We only extract the text, and not the formatting

- ConditionalFormat :

  - cf type : dataBar

- Figures :

  - figures that have an anchor different than twoCellAnchor (Google Sheets uses oneCellAnchor)

- Charts :

  - everything not pie/doughnut/bar/line chart

- Pivots :

  - we don't support excel-like pivot. Import them as Table.

- Data filters:
  - we only support filters with simple string matching

## What we don't support at conversion :

These are the features that we don't fully support in o_spreadsheet. At conversion, we will either drop them completely, or adapt them to be somewhat useable in our application.

NW = no warning generated for these conversions.

- Style :
  - col/row style. We apply the style on each cell of the row/col. (NW)
- Borders :
  - diagonal borders
- Align :
  - some horizontal alignments. We only support left/right/center. Other types will be converted as follows:
    - fill/justify -> left
    - centerContinuous/distributed -> center
  - some vertical alignements. We only support top/center/bottom. Other types will be converted to center.
  - some wrappingText modes. We only support wrap/overflow imported from Google Sheets and Excel. Clip mode from Google Sheets will be converted to overflow mode, because even if o-spreadsheet support clip mode, it isn't supported by xlsx files.
  - other align options (indent, shrinkToFit, ...) (NW)
- Fills :
  - we only support solid fill pattern. Convert all other patterns into solid fills.
- Font :
  - We only support Arial
- Number formats :
  - See section "Number Formats"
- Strings :
  - We do not support newlines characters in strings and drop them at conversion (NW)
- Conditional Formats:
  - Types not supported :
    - AboveAverage
    - (Not)Contains Error
    - Data Bar (not supported at parsing)
    - Duplicated/uniques values
    - TimePeriod
    - Top10
  - Styles of CF not supported :
    - Border
    - Num format
  - IconSets :
    - We don't support most of the icons, replace them with some we support (NW)
    - We don't support empty icons in IconSet (It makes the cf side panel crash!)
      - Replace empty icon by a dot icon
    - We don't support IconSet with more than 3 icons, replace them with IconSet with 3 icons (NW)
- Charts :
  - convert pie charts with multiple datasets into doughnut chart (NW)
- Tables & filters (NW) :
  - import tables (with a header) as FilterTables.
    - for the tables without headers, we only apply a style to the cells of the table.
    - we don't import values in data filters, as they are non-persistent data in o_spreadsheet.
    - rows filtered and hidden by filters will be hidden in the sheet, as "standard" hidden rows, not rows hidden by a filter
  - table style in XLSX is a string that represent a style and there's 80+ different styles supported. We currently don't support those and
    will use a default style for all the tables.
- External References (NW):
  - We cannot support references to external files (obviously), but we can replace the reference by its last known value (that is stored in the xlsx)

### What will look strange :

Excel don't really use the theme.xml file for theme colors, but define its own somewhere in its configuration. So the colors will be different at import than in excel, since we do not have access to these Excel configuration files. Import in GSheet et Calc both correctly use the theme defined in theme.xml

### Number Formats

We try to convert the number formats of Excel into something we can use, dropping what we do not support.
If we cannot convert the number format into something we can use, we drop it completely.

- Locale/Date System info :
  - They are HexCodes in brackets in the format (eg . [\$-40C], [\$string-52B])
  - We drop them completely
- Underscore character (\_) :
  - It marks the next character as a character to ignore when computing the alignment of the word.
  - We don't support this, drop \_ and the character that follows it in the format.
- Times character (\*) :
  - It repeats the next character enough times to fill the line.
  - We don't support this, drop \* and the character that follows it in the format.
