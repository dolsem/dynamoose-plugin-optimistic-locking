import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { Listener } from '../types';
import { debug, debugEnabled } from '../utils/debug';

interface GetListenerEvent extends EmittedEvent {
  readonly key: { [attrName: string]: any };
  readonly options: { [option: string]: any };
  readonly data: { Item: { [attrName: string]: any } };
}

export const getListener = ({ attributeName }: OptimisticLockingConfig) => {
  if (!debugEnabled) { return null; }

  return ({ modelName, event }: EmittedObject<GetListenerEvent, {}>): ReturnType<Listener> => {
    debug('model:get|get:called triggered');

    const { key, data } = event;
    if (!data) { return; }
    const versionAttr = data.Item[attributeName];
    const version = versionAttr && Number(versionAttr.N);

    debug(`model:get|get:called got instance of ${modelName} with key ${JSON.stringify(key)} and version ${version}`);
  };
}