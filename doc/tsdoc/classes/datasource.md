[o-spreadsheet API](../README.md) / DataSource

# Class: DataSource<M, D\>

DataSource is an abstract class that contains the logic of fetching and
maintaining access to data that have to be loaded.

A class which extends this class have to implement two different methods:
* `_fetchMetadata`: This method should fetch the metadata, i.e. data that
should be fetch only once.

* `_fetch`: This method should fetch the data from the server.

To get the data from this class, there is three options:
* `get`: async function that will returns the data when it's loaded
* `getSync`: get the data that are currently loaded, undefined if no data
are loaded
* specific method: Subclass can implement concrete method to have access to a
particular data.

## Type parameters

Name |
:------ |
`M` |
`D` |

## Hierarchy

* *EventBus*

  ↳ **DataSource**

## Table of contents

### Constructors

- [constructor](datasource.md#constructor)

### Properties

- [data](datasource.md#data)
- [metadata](datasource.md#metadata)

### Methods

- [\_fetch](datasource.md#_fetch)
- [\_fetchMetadata](datasource.md#_fetchmetadata)
- [get](datasource.md#get)
- [getLastUpdate](datasource.md#getlastupdate)
- [getMetadataSync](datasource.md#getmetadatasync)
- [getSync](datasource.md#getsync)
- [loadMetadata](datasource.md#loadmetadata)

## Constructors

### constructor

\+ **new DataSource**<M, D\>(): [*DataSource*](datasource.md)<M, D\>

#### Type parameters:

Name |
:------ |
`M` |
`D` |

**Returns:** [*DataSource*](datasource.md)<M, D\>

## Properties

### data

• `Protected` **data**: *undefined* \| D

___

### metadata

• `Protected` **metadata**: *undefined* \| M

## Methods

### \_fetch

▸ `Abstract`**_fetch**(`params?`: FetchParams): *Promise*<D\>

Method that should be overridden to retrieve data from the server

#### Parameters:

Name | Type |
:------ | :------ |
`params?` | FetchParams |

**Returns:** *Promise*<D\>

___

### \_fetchMetadata

▸ `Abstract`**_fetchMetadata**(): *Promise*<M\>

Fetch the metadata, which should be fetched once.

**Returns:** *Promise*<M\>

___

### get

▸ **get**(`params?`: FetchParams): *Promise*<D\>

This method should be use to get the data

#### Parameters:

Name | Type |
:------ | :------ |
`params?` | FetchParams |

**Returns:** *Promise*<D\>

___

### getLastUpdate

▸ **getLastUpdate**(): *undefined* \| *number*

**Returns:** *undefined* \| *number*

___

### getMetadataSync

▸ **getMetadataSync**(): *undefined* \| M

Get the metadata ONLY if it's ready (loaded). Returns undefined if it's
not ready

**Returns:** *undefined* \| M

___

### getSync

▸ **getSync**(): *undefined* \| D

Get the data ONLY if it's ready (data are loaded). Returns undefined if
it's not ready

**Returns:** *undefined* \| D

___

### loadMetadata

▸ **loadMetadata**(): *Promise*<void\>

Load the metadata

**Returns:** *Promise*<void\>
