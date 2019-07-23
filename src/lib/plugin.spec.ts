// tslint:disable:no-expression-statement
// tslint:disable:no-console
import test from 'ava';
import * as DynamoDbLocal from 'dynamodb-local';
import dynamoose from 'dynamoose';
import sinon from 'sinon';

import * as listeners from './listeners';
import { OptimisticLockException } from './optimistic-lock.exception';
import { OptimisticLockingPlugin } from './plugin';

const attributeSymbol = Symbol('version');

let Day: any;
let BookCollection: any;

test.before(async () => {
  dynamoose.AWS.config.update({
    accessKeyId: 'AKID',
    region: 'us-east-1',
    secretAccessKey: 'SECRET',
  });
  dynamoose.local('http://localhost:8000');

  const { log } = console;
  console.log = s => (!s || !s.substr || s.substr(0, 27) !== 'Checking for DynamoDB-Local')
    && log(s);
  await DynamoDbLocal.launch(8000);
  console.log = log;

  // #region Fixtures
  const DaySchema = new dynamoose.Schema({
    date: {
      hashKey: true,
      type: Date,
    },
    events: {
      type: [String],
    },
  });
  Day = dynamoose.model('Day', DaySchema);

  const BookCollectionSchema = new dynamoose.Schema({
    author: {
      hashKey: true,
      type: String,
    },
    books: {
      type: [String]
    },
    derivedWorks: {
      type: [String]
    },
  }, {
    timestamps: true,
  });
  BookCollection = dynamoose.model('BookCollection', BookCollectionSchema);

  await Day.scan({}).exec();
  await BookCollection.scan({}).exec();
  // #endregion Fixtures
});

test.after.always(async () => {
  await DynamoDbLocal.stop(8000);
});

test.afterEach(() => {
  BookCollection.clearAllPlugins();
  Day.clearAllPlugins();
});

let prefix: string;

// #region Configuration
prefix = 'configuration:';

test.serial(`${prefix} uses correct defaults`, (t) => {
  const spy = sinon.spy(listeners, 'createListeners');

  BookCollection.plugin(OptimisticLockingPlugin);

  t.true(spy.calledOnce);
  t.is(spy.firstCall.args[0].fetchItemOnWriteError, false);
  t.is(spy.firstCall.args[0].allowUnsupported, false);
  t.is(spy.firstCall.args[0].attributeName, '__version');
  t.is(spy.firstCall.args[0].attributeSymbol.toString(), 'Symbol(version-attribute)');
});
// #endregion Configuration

// #region Get
prefix = 'get:';

test.serial(`${prefix} sets version on the result item`, async (t) => {
  Day.plugin(OptimisticLockingPlugin, { attributeSymbol, attributeName: 'version' });

  await new Promise((resolve, reject) => {
    dynamoose.ddb().putItem({
      Item: {
        date: { N: new Date('May 01 2019').getTime().toString() },
        version: { N: '500' },
      },
      TableName: 'Day',
    }, (err) => { if (err) { reject(err); } else { resolve(); } });
  });

  const day = await Day.get({ date: new Date('May 01 2019') });
  t.is(day[attributeSymbol], 500);
});
// #endregion Get

// #region Batch-Get
prefix = 'batch-get:';

test.serial(`${prefix} sets version on the result items`, async (t) => {
  Day.plugin(OptimisticLockingPlugin, { attributeSymbol, attributeName: 'version' });

  await new Promise((resolve, reject) => {
    dynamoose.ddb().batchWriteItem({
      RequestItems: {
        Day: [
          {
            PutRequest: {
              Item: {
                date: { N: new Date('Jun 01 2019').getTime().toString() },
                version: { N: '3' },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                date: { N: new Date('Jun 02 2019').getTime().toString() },
                version: { N: '1000' },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                date: { N: new Date('Jun 03 2019').getTime().toString() },
                version: { N: '76' },
              },
            },
          },
        ]
      },
    }, (err) => { if (err) { reject(err); } else { resolve(); } });
  });

  const days = await Day.batchGet([
    { date: new Date('Jun 03 2019') },
    { date: new Date('Jun 02 2019') },
    { date: new Date('Jun 01 2019') },
  ]);
  t.is(days[0][attributeSymbol], 76);
  t.is(days[1][attributeSymbol], 1000);
  t.is(days[2][attributeSymbol], 3);
});
// #endregion Get

// #region Put
prefix = 'put:';

test.serial(`${prefix} prevents old version from getting saved`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin);

  const asoiaf = new BookCollection({
    author: 'George R. R. Martin',
    books: ['A Game of Thrones', 'A Clash of Kings', 'A Storm of Swords'],
    derivedWorks: ['Game of Thrones (TV Series)'],
  });
  await asoiaf.save();
  const asoiafCopy = await BookCollection.get(asoiaf);

  asoiaf.books.push('A Feast for Crows');
  asoiafCopy.derivedWorks.push('Game of Thrones: A Telltale Games Series');

  await t.throwsAsync(
    Promise.all([asoiaf.save(), asoiafCopy.save()]),
    'The conditional request failed'
  );
});

test.serial(`${prefix} updates item version on save`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { attributeSymbol });

  const earthsea = await BookCollection.create({
    author: 'Ursula K. Le Guin',
    books: ['A Wizard of Earthsea', 'The Tombs of Atuan'],
  });
  t.is(earthsea[attributeSymbol], 1);

  earthsea.books.push('The Farthest Shore');
  await earthsea.save();
  t.is(earthsea[attributeSymbol], 2);
});

test.serial(`${prefix} works with conditional updates`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { attributeSymbol });

  const artemisFowl = new BookCollection({
    author: 'Eoin Colfer',
    books: ['Artemis Fowl', 'The Arctic Incident', 'The Eternity Code'],
  });
  await artemisFowl.save();

  artemisFowl.books.push('The Opal Deception');
  await artemisFowl.save({
    condition: 'author = :author',
    conditionValues: { author: artemisFowl.author },
  });
  t.is(artemisFowl[attributeSymbol], 2);
});

test.serial(`${prefix} supports fetchItemOnWriteError option`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { fetchItemOnWriteError: true });

  const dt = new BookCollection({
    author: 'Stephen Edwin King',
    books: [
      'The Dark Tower: The Gunslinger',
      'The Dark Tower II: The Drawing of the Three',
      'The Dark Tower III: The Waste Lands',
    ],
  });
  await dt.save();
  const dtCopy = await BookCollection.get(dt);

  dt.books.push('The Dark Tower IV: Wizard and Glass');
  dtCopy.derivedWorks = ['The Dark Tower (2017 film)'];

  const error = await Promise.all([dt.save(), dtCopy.save()]).catch(e => e);
  t.true(error instanceof OptimisticLockException);
  t.truthy(error.itemInDb);
});
// #endregion Put

// #region Update
prefix = 'update:';

test.serial(`${prefix} updates item version on Model.update`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { attributeSymbol });

  let sherlockHolmes = await BookCollection.create({
    author: 'Sir Arthur Conan Doyle',
    books: ['A Study in Scarlet', 'The Sign of the Four'],
  });
  t.is(sherlockHolmes[attributeSymbol], 1);

  await BookCollection.update(sherlockHolmes, {
    $ADD: { books: ['The Hound of the Baskervilles'] },
  });
  sherlockHolmes = await BookCollection.get(sherlockHolmes);
  t.is(sherlockHolmes[attributeSymbol], 2);
  t.true(sherlockHolmes.books.includes('The Hound of the Baskervilles'));
});

test.serial(`${prefix} works with conditional updates`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { attributeSymbol });

  let httyd = new BookCollection({
    author: 'Cressida Cowell',
    books: [
      'Hiccup: The Viking Who Was Seasick',
      'How to Train Your Dragon',
      'How to Be a Pirate',
    ],
  });
  await httyd.save();

  await BookCollection.update(
    httyd,
    { $ADD: { books: ['How to Speak Dragonese'] } },
    { condition: 'author = :author', conditionValues: { author: httyd.author } },
  );

  httyd = await BookCollection.get(httyd);
  t.is(httyd[attributeSymbol], 2);
});
// #endregion Update

// #region Batch-Put
prefix = 'batch-put:';

test.serial(`${prefix} fails if \`allowUnsupported\` is set to false`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin);

  const moomins = new BookCollection({
    author: 'Tove Jansson',
    books: [
      'The Moomins and the Great Flood',
      'Comet in Moominland',
      'Finn Family Moomintroll',
    ],
  });

  const ts = new BookCollection({
    author: 'Mark Twain',
    books: [
      'The Adventures of Tom Sawyer',
      'Adventures of Huckleberry Finn',
      'Tom Sawyer Abroad',
      'Tom Sayer, Detective',
    ],
  })

  await t.throwsAsync(
    BookCollection.batchPut([moomins, ts]),
    'Optimistic locking is not supported for batchPut requests.'
      + ' See https://github.com/dynamoosejs/dynamoose/issues/529.'
  );
});

test.serial(`${prefix} succeeds if \`allowUnsupported\` is set to true`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { allowUnsupported: true, attributeSymbol });

  const nightWatch = new BookCollection({
    author: 'Sergei Lukyanenko',
    books: [
      'Night Watch',
      'Day Watch',
      'Twilight Watch',
    ],
    derivedWorks: ['Night Watch (2004 film)'],
  });

  const narnia = new BookCollection({
    author: 'C. S. Lewis',
    books: [
      'The Lion, the Witch and the Wardrobe',
      'Prince Caspian: The Return to Narnia',
      'The Voyage of the Dawn Treader',
    ],
    derivedWorks: [
      'The Lion, the Witch and the Wardrobe (1967 TV serial)',
    ],
  });
  await narnia.save();
  const narniaCopy = await BookCollection.get(narnia);

  narnia.books.push('The Silver Chair');
  narniaCopy.derivedWorks.push('The Lion, the Witch and the Wardrobe (1979 film)');

  await t.notThrowsAsync(
    Promise.all([
      BookCollection.batchPut([narnia]),
      BookCollection.batchPut([nightWatch, narniaCopy]),
    ])
  );
  
  const savedNightWatch = await BookCollection.get(nightWatch);
  const savedNarnia = await BookCollection.get(narnia);
  t.is(savedNightWatch[attributeSymbol], 1);
  t.is(savedNarnia[attributeSymbol], 2);
  t.is(savedNarnia.derivedWorks.length, 2);
});

// #endregion Batch-Put

// #region Get-Set-Version
prefix = 'get-set-version:';

test.serial(`${prefix} extends model and works correctly`, async (t) => {
  t.plan(10);

  Day.plugin(OptimisticLockingPlugin, { allowUnsupported: true });

  const days = [
    new Day({ date: new Date('Jul 11 2019') }),
    new Day({ date: new Date('Jul 12 2019') }),
    new Day({ date: new Date('Jul 13 2019') }),
    new Day({ date: new Date('Jul 14 2019') }),
  ];
  t.is(typeof days[0].getVersion, 'function');
  t.is(typeof days[0].setVersion, 'function');

  days.forEach((day) => day.setVersion(day.date.getTime()));
  days.forEach((day) => t.is(day.getVersion(), day.date.getTime()));

  await Day.batchPut(days);

  const daysFromDb: any[] = await Day.batchGet(days);
  daysFromDb.forEach((day) => t.is(day.getVersion(), day.date.getTime() + 1));
});
// #endregion Get-Set-Version

// #region Put-Next-Version
prefix = 'put-next-version:';

test.serial(`${prefix} requires fetchItemOnWriteError set to \`true\``, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { fetchItemOnWriteError: false });

  await t.throwsAsync(
    BookCollection.putNextVersion(),
    'putNextVersion requires fetchItemOnWriteError set to `true`'
  );
});

test.serial(`${prefix} succeeds`, async (t) => {
  BookCollection.plugin(OptimisticLockingPlugin, { attributeSymbol, fetchItemOnWriteError: true });

  const hp = new BookCollection({
    author: 'Joanne K. Rowling',
    books: [
      'Harry Potter and the Philosopher\'s Stone',
      'Harry Potter and the Chamber of Secrets',
    ],
  });
  await hp.save();

  const { item: hp2, attempts: hp2Attempts } = await BookCollection.putNextVersion(
    hp,
    (item: any) => item.books.push('Harry Potter and the Prizoner of Azkaban')
  );
  t.is(hp2[attributeSymbol], 2);
  t.is(hp2.books.length, 3);
  t.is(hp2Attempts, 1);

  let hpCopy = await BookCollection.get(hp);
  hpCopy.derivedWorks = ['Harry Potter (Movie Series)'];  
  await hpCopy.save();

  const { item: hp4, attempts: hp4Attempts } = await BookCollection.putNextVersion(
    hp2,
    (item: any) => item.books.push('Harry Potter and the Goblet of Fire')
  );
  t.is(hp4[attributeSymbol], 4);
  t.is(hp4.books.length, 4);
  t.is(hp4Attempts, 2);

  hpCopy = await BookCollection.get(hp);
  hpCopy.derivedWorks.push('Fantastic Beasts (Movie Series)');  
  await hpCopy.save();

  let i = 0;
  const games = [
    'Harry Potter and the Philosopher\'s Stone (videogame)',
    'Harry Potter and the Chamber of Secrets (videogame)',
  ];
  const { item: hp8, attempts: hp8Attempts } = await BookCollection.putNextVersion(
    hp4,
    async (item: any) => {
      if (i < 2) {
        hpCopy.derivedWorks.push(games[i]);
        await hpCopy.save();
        i += 1;
      }
      item.books.push('Harry Potter and the Order of the Phoenix');
    }
  );
  t.is(hp8[attributeSymbol], 8);
  t.is(hp8.books.length, 5);
  t.is(hp8Attempts, 3);
});

test.serial(`${prefix} supports maxAttempts option`, async (t) => {
  t.plan(8);

  BookCollection.plugin(OptimisticLockingPlugin, { attributeSymbol, fetchItemOnWriteError: true });

  let soue = new BookCollection({
    author: 'Lemony Snicket',
    books: ['The Bad Beginning', 'The Reptile Room', 'The Wide Window'],
  });
  await soue.save();
  const soueCopy = await BookCollection.get(soue);

  const books4to8 = [
    'The Miserable Mill',
    'The Austere Academy',
    'The Ersatz Elevator',
    'The Vile Village',
    'The Hostile Hospital',
  ];

  let i = 0;
  const { item: soue4, attempts } = await BookCollection.putNextVersion(
    soueCopy,
    async (item: any) => {
      if (i < 2) {
        soue.books.push(books4to8[i]);
        await soue.save();
        i += 1;
      }
      item.derivedWorks = ['Lemony Snicket\'s A Series of Unfortunate Events (Movie)'];
    },
    { maxAttempts: 3 },
  );
  t.is(soue4[attributeSymbol], 4);
  t.is(soue4.derivedWorks.length, 1);
  t.is(attempts, 3);

  soue = await BookCollection.get(soue);
  try {
    await BookCollection.putNextVersion(
      soue4,
      async (item: any) => {
        if (i < 5) {
          soue.books.push(books4to8[i]);
          await soue.save();
          i += 1;
        }
        item.derivedWorks.push('A Series of Unfortunate Events (TV series)');
      },
      { maxAttempts: 3 },
    );
  } catch (err) {
    t.truthy(err);
    t.true(err instanceof OptimisticLockException);
    t.is(err.attempts, 3);

    t.truthy(err.itemInDb);
    t.is(err.itemInDb.books.length, 8);
  }
});
// #endregion Put-Next-Version
