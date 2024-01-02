[o-spreadsheet API](../README.md) / DispatchResult

# Class: DispatchResult

Holds the result of a command dispatch.
The command may have been successfully dispatched or cancelled
for one or more reasons.

## Table of contents

### Accessors

- [Success](DispatchResult.md#success)

### Methods

- [isCancelledBecause](DispatchResult.md#iscancelledbecause)

## Accessors

### Success

• `get` **Success**(): [`DispatchResult`](DispatchResult.md)

Static helper which returns a successful DispatchResult

#### Returns

[`DispatchResult`](DispatchResult.md)

## Methods

### isCancelledBecause

▸ **isCancelledBecause**(`reason`): `boolean`

Check if the dispatch has been cancelled because of
the given reason.

#### Parameters

| Name | Type |
| :------ | :------ |
| `reason` | `CancelledReason` |

#### Returns

`boolean`
