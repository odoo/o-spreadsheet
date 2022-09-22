# o-spreadsheet architecture

o-spreadsheet is architected in two main parts: the core engine and the spreadsheet rendering in the DOM.

## Core engine

The core engine handles the data and business logic.

## UI rendering

The grid itself is rendered on an HTML canvas.
All other elements are rendered with the [owl](https://github.com/odoo/owl) UI framework.
