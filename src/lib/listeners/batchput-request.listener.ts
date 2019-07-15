import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { Listener } from '../types';
import { debug } from '../utils/debug';

type BatchPutItems = Array<{
  RequestItems: {
    [model: string]: Array<{
      PutRequest: {
        Item: any,
        ConditionExpression: string;
        ExpressionAttributeNames: { [key: string]: string },
        ExpressionAttributeValues: {  [key: string]: string },
      },
    }>,
  },
}>;

interface BatchPutRequestListenerEvent extends EmittedEvent {
  readonly options: { $$__ol__version: number[] };
  readonly items: BatchPutItems;
}

interface BatchPutRequestListenerActions {
  updateItems: (newItems: BatchPutItems) => void;
}

type BatchPutRequestEmittedObject = EmittedObject<BatchPutRequestListenerEvent, BatchPutRequestListenerActions>;

export const batchPutRequestListener = ({ attributeName, allowUnsupported }: OptimisticLockingConfig) => {
  if (!allowUnsupported) { return null; }

  return ({ event, actions, modelName }: BatchPutRequestEmittedObject): ReturnType<Listener> => {
    debug('model:batchput|request:pre triggered');
    const { items: batches, options } = event;
    
    let i = 0;
    actions.updateItems(
      batches.map(({ RequestItems: { [modelName]: items } }) => ({
        RequestItems: {
          [modelName]: items.map((item) => {
            const version = { N: options.$$__ol__version[i].toString() };       
            item.PutRequest.Item[attributeName] = version;

            i += 1;
            return item;
          }),
        }
      }))
    );
    debug('model:batchput|request:pre added version values to request');
  };
}
