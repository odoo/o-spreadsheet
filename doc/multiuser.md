Paste => handled by Clipboard => dispatch ClearCell, ClearFormatting, then PasteCell, handled by Clipboard =>
SetBorder, UpdateCell => SetSelection

1: Spreadsheet -> dispatchUI(Paste)
2: Clipboard: Handle(Paste)
3: dispatchCore(ClearCell)
4: Cell: Handle(ClearCell)
5: dispatchCore(UpdateCell)
6: dispatchCore(ClearFormatting)
7: dispatchUI(PasteCell)
8: Clipboard: Handle(PasteCell)
9: dispatchCore(SetBorder)
10: dispatchCore(UpdateCell)
11: dispatchUI(SetSelection)

History: [ClearCell(3), SetBorder(9), UpdateCell(10)]
Network: [ClearCell(3), SetBorder(9), UpdateCell(10)]
