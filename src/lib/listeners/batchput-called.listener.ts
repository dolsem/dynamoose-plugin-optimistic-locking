import {
  EmittedEvent,
  EmittedObject,
  OptimisticLockingConfig,
} from '../interfaces';
import { MixedListener } from '../types';
import { debug } from '../utils/debug';

interface BatchPutCalledListenerEvent extends EmittedEvent {
  readonly options: { [option: string]: any }|(() => any);
  readonly items: any;
}

interface BatchPutCalledListenerActions {
  updateOptions: (newOptions: { [option: string]: any }) => void;
}

type BatchPutCalledEmittedObject = EmittedObject<BatchPutCalledListenerEvent, BatchPutCalledListenerActions>;

export const batchPutCalledListener = ({ allowUnsupported, attributeSymbol }: OptimisticLockingConfig) => 
  ({ event, actions }: BatchPutCalledEmittedObject): ReturnType<MixedListener> => {
    debug('model:batchput|batchput:called triggered');
    if (!allowUnsupported) {
      return Promise.resolve({
        reject: new Error('Optimistic locking is not supported for batchPut requests.'
        + ' See https://github.com/dynamoosejs/dynamoose/issues/529.'),
      });
    }

    const { options, items } = event;

    const newVersions = items.map((item: any) => {
      const newVersion = (item[attributeSymbol] || 0) + 1;
      item[attributeSymbol] = newVersion;
      debug('model:batchput|batchput:called incremented version of %O', item);
      return newVersion;
    });

    actions.updateOptions({
      ...(typeof options === 'object' && options),
      $$__ol__version: newVersions,
    });
    debug('model:batchput|batchput:called updated options with item versions');
  }

