# Dynamoose Plugin - Optimistic Locking

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Coverage Status][coverage-image]][coverage-url]
[![License: MIT][license-image]][license-url]

Dynamoose is a modeling tool for Amazon's DynamoDB ([https://github.com/dynamoosejs/dynamoose](https://github.com/dynamoosejs/dynamoose)).
Optimistic Locking is a technique that protects data integrity in a concurrent enviroment, ensuring multiple write operations on the same data do not overwrite each other (by default last operation wins)


## Getting Started

### Installation

    $ npm i dynamoose-plugin-optimistic-locking

### Example

```js
const {
  OptimisticLockingPlugin,
  OptimisticLockException,
} = require('dynamoose-plugin-optimistic-locking');

const BookCollectionSchema = new dynamoose.Schema({
  author: {
    type: String,
    hashKey: true,
  },
  books: [String],
  derivedWorks: [String],
});
const BookCollection = dynamo.model("BookCollection", BookCollectionSchema)
BookCollection.plugin(OptimisticLockingPlugin, { fetchItemOnWriteError: true });

const asoiaf = await BookCollection.create({
  author: 'George R. R. Martin',
  books: ['A Game of Thrones', 'A Clash of Kings', 'A Storm of Swords'],
  derivedWorks: ['Game of Thrones (TV Series)'],
});
asoiaf.getVersion(); // Returns 1.
...
let updatedCollection;
while (!updatedCollection) {
  asoiaf.push('A Feast For Crows');
  try {
    updatedCollection = await BookCollection.put(asoiaf);
  } catch (err) {
    if (!(err instanceof OptimisticLockException)) throw err;
    asoiaf = err.itemInDb;
  }
}
```

## API

### Plugin Options

```js
BookCollection.plugin(OptimisticLockingPlugin, {/* Plugin Options */});
```

**fetchItemOnWriteError**: boolean (default: `false`)

If set to `true`, Optimistic Locking Plugin will perform a database read automatically if conditional update fails. If the version of the item in the database is newer than the one being saved, it will throw an instance of `OptimisticLockException`. The item from the database is stored as `itemInDb` property on the exception object. If set to `false`, the original `ConditionalCheckFailedException` is thrown, and there is no guarantee that optimistic locking is the cause of the received exception. Setting to `true` is recommended to get the most out of the plugin.

**attributeName**: string (default: `'__version'`)

DynamoDB attribute name for storing version number.

**attributeSymbol**: symbol

Can be used to override default symbol for accessing version prop on an item. Using `getVersion()` and `setVersion()` methods is recommended instead.

### Static methods

**Model.putNextVersion(item, updateFunction[, options])**
Sends put request in a loop fetching newest item version every iteration, until request succeeds or max attempts reached (if specified). Requires `fetchItemOnWriteError` plugin option to be set to `true`.
```js
BookCollection.plugin(OptimisticLockingPlugin, { fetchItemOnWriteError: true });

const updatedAsoiaf = await BookCollection.putNextVersion(
  asoiaf,
  (item) => { item.derivedWorks.push('Game of Thrones: A Telltale Games Series'); },
  { maxAttempts: 3 }
);
```
| Parameter Name | Type | Description | |
| ---- | ---- | ----------- | -------- |
| item | `object` | item to update and save to the database | required |
| updateFunction | `function`  | applies updates to the item, will be called every iteration | required |
| options | `object`  | extra options | &nbsp; |
| options.maxAttempts | `number`  | by default operation will run until the item is saved, but will fail after max attempts have been reached if this option is specified | &nbsp; |

### Instance methods

**item.getVersion()**
Returns current item version
```js
asoiaf.getVersion();
```

**item.setVersion(number)**
Overwrites item version with custom value. Note that this value will be incremented before the item is saved.

## Roadmap

- Better TypeScript support
- Provide option to disable optimistic locking for invidual put/batchPut/update calls

## License

MIT

[npm-image]: https://img.shields.io/npm/v/dynamoose-plugin-optimistic-locking.svg
[npm-url]: https://npmjs.org/package/dynamoose-plugin-optimistic-locking
[downloads-image]: https://img.shields.io/npm/dm/dynamoose-plugin-optimistic-locking.svg
[downloads-url]: https://npmjs.org/package/dynamoose-plugin-optimistic-locking
[travis-image]: https://travis-ci.org/dolsem/dynamoose-plugin-optimistic-locking.svg?branch=master
[travis-url]: https://travis-ci.org/dolsem/dynamoose-plugin-optimistic-locking
[coverage-image]: https://coveralls.io/repos/github/dolsem/dynamoose-plugin-optimistic-locking/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/dolsem/dynamoose-plugin-optimistic-locking?branch=master
[license-image]: https://img.shields.io/badge/License-MIT-blue.svg
[license-url]: https://opensource.org/licenses/MIT

