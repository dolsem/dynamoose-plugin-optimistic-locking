import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { OptimisticLockException } from '../optimistic-lock.exception';
import { AsyncListener } from '../types';
import { debug } from '../utils/debug';

interface PutResponseListenerEvent extends EmittedEvent {
  readonly error: Error;
  readonly item: { Item: any };
}

interface PutResponseListenerActions {
  updateError: (error: Error) => void;
}

type PutResponseEmittedObject = EmittedObject<PutResponseListenerEvent, PutResponseListenerActions>;

const getItemKey = async (model: any, data: PutResponseListenerEvent['item']) => {
  const { hashKey, rangeKey } = model.$__.schema;
  const { name: hashKeyName } = hashKey;
  const hashKeyValue = await hashKey.parseDynamo(data.Item[hashKeyName]);
  if (!rangeKey) { return { [hashKeyName]: hashKeyValue }; }

  const { name: rangeKeyName } = rangeKey;
  const rangeKeyValue = await rangeKey.parseDynamo(data.Item[rangeKeyName]);
  return { [rangeKeyValue]: hashKeyValue, [rangeKeyName]: rangeKeyValue };
};

export const putResponseListener = ({
  attributeName, attributeSymbol, fetchItemOnWriteError,
}: OptimisticLockingConfig) => {
  if (!fetchItemOnWriteError) { return null; }

  return async ({ model, event, actions }: PutResponseEmittedObject): ReturnType<AsyncListener> => {
    debug('model:put|request:post triggered');
    const { error, item } = event;

    if (error) {
      if (error.message === 'The conditional request failed') {
        debug('model:put|request:post conditional request failed');

        let itemInDb;
        const key = await getItemKey(model, item);
        try {
          debug('model:put|request:post fetching latest version of item with key %o', key);
          itemInDb = await model.get(key);
        } catch (err) {
          return { reject: err };
        }

        if (itemInDb && itemInDb[attributeSymbol] >= Number(item.Item[attributeName].N)) {
          const optimisticLockException = new OptimisticLockException('Cannot overwrite newer version', itemInDb, error);
          actions.updateError(optimisticLockException);
        } else {
          debug('model:put|request:post version in db is not newer - error not caused by optimistic locking of %o', key);
        }
      }
    } else {
      debug('model:put|request:post successfully saved to db %O', item);
    }
  }
}
