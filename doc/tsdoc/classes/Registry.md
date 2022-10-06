[o-spreadsheet API](../README.md) / Registry

# Class: Registry<T\>

Registry

The Registry class is basically just a mapping from a string key to an object.
It is really not much more than an object. It is however useful for the
following reasons:

1. it let us react and execute code when someone add something to the registry
  (for example, the FunctionRegistry subclass this for this purpose)
2. it throws an error when the get operation fails
3. it provides a chained API to add items to the registry.

## Type parameters

| Name |
| :------ |
| `T` |

## Table of contents

### Constructors

- [constructor](Registry.md#constructor)

### Properties

- [content](Registry.md#content)

### Methods

- [add](Registry.md#add)
- [get](Registry.md#get)
- [getAll](Registry.md#getall)
- [getKeys](Registry.md#getkeys)
- [remove](Registry.md#remove)

## Constructors

### constructor

• **new Registry**<`T`\>()

#### Type parameters

| Name |
| :------ |
| `T` |

## Properties

### content

• **content**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: `T`

## Methods

### add

▸ **add**(`key`, `value`): [`Registry`](Registry.md)<`T`\>

Add an item to the registry

Note that this also returns the registry, so another add method call can
be chained

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `T` |

#### Returns

[`Registry`](Registry.md)<`T`\>

___

### get

▸ **get**(`key`): `T`

Get an item from the registry

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`T`

___

### getAll

▸ **getAll**(): `T`[]

Get a list of all elements in the registry

#### Returns

`T`[]

___

### getKeys

▸ **getKeys**(): `string`[]

Get a list of all keys in the registry

#### Returns

`string`[]

___

### remove

▸ **remove**(`key`): `void`

Remove an item from the registry

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`void`
