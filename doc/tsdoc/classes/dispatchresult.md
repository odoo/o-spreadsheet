[o-spreadsheet API](../README.md) / DispatchResult

# Class: DispatchResult

Holds the result of a command dispatch.
The command may have been successfully dispatched or cancelled
for one or more reasons.

## Table of contents

### Constructors

- [constructor](DispatchResult.md#constructor)

### Properties

- [reasons](DispatchResult.md#reasons)

### Accessors

- [isSuccessful](DispatchResult.md#issuccessful)
- [Success](DispatchResult.md#success)

### Methods

- [isCancelledBecause](DispatchResult.md#iscancelledbecause)

## Constructors

### constructor

• **new DispatchResult**(`results?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `results` | [`CommandResult`](../enums/CommandResult.md) \| [`CommandResult`](../enums/CommandResult.md)[] | `[]` |

## Properties

### reasons

• `Readonly` **reasons**: [`CancelledReason`](../README.md#cancelledreason)[]

## Accessors

### isSuccessful

• `get` **isSuccessful**(): `boolean`

#### Returns

`boolean`

___

### Success

• `Static` `get` **Success**(): [`DispatchResult`](DispatchResult.md)

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
| `reason` | [`CancelledReason`](../README.md#cancelledreason) |

#### Returns

`boolean`
