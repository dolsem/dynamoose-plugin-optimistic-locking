import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { Listener } from '../types';
import { debug, debugEnabled } from '../utils/debug';

interface BatchGetListenerEvent extends EmittedEvent {
  readonly keys: Array<{ [attrName: string]: any }>;
  readonly data: Array<{ Item: { [attrName: string]: any } }>;
}

export const batchGetListener = ({ attributeName }: OptimisticLockingConfig) => {
  if (!debugEnabled) { return null; }

  return ({ modelName, event }: EmittedObject<BatchGetListenerEvent, {}>): ReturnType<Listener> => {
    debug('model:batchget|batchget:called triggered');

    const { keys, data } = event;
    if (!data) { return; }

    const tuples = data.map(({ Item }, ix) => {
      const versionAttr = Item[attributeName];
      const version = versionAttr && Number(versionAttr.N);
      return `(${JSON.stringify(keys[ix])},${version})`;
    });

    debug(`model:batchget|batchget:called got ${data.length} instances of ${modelName}`
      + ` - (key,version): [\n${tuples.join(',\n')}\n]`);
  };
}