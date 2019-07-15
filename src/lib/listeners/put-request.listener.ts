// tslint:disable:prefer-object-spread
import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { Listener } from '../types';
import { debug } from '../utils/debug';

interface PutRequestListenerEvent extends EmittedEvent {
  readonly options: { $$__ol__version: number };
  readonly item: {
    Item: any,
    ConditionExpression: string;
    ExpressionAttributeNames: { [key: string]: string },
    ExpressionAttributeValues: {  [key: string]: string },
  };
}

interface PutRequestListenerActions {
  updateItem: (newItem: { Item: any }) => void;
}

type PutRequestEmittedObject = EmittedObject<PutRequestListenerEvent, PutRequestListenerActions>;

export const putRequestListener = ({ attributeName }: OptimisticLockingConfig) =>
  ({ event, actions }: PutRequestEmittedObject): ReturnType<Listener> => {
    debug('model:put|request:pre triggered');
    const { item, options } = event;
    const version = { N: options.$$__ol__version.toString() };
    const condition = 'attribute_not_exists(#optimisticlockingversion) OR '
      + '#optimisticlockingversion < :optimisticlockingversion';

    item.Item[attributeName] = version;

    item.ConditionExpression = item.ConditionExpression
      ? `(${item.ConditionExpression}) AND (${condition})`
      : condition;
    item.ExpressionAttributeNames = Object.assign(
      item.ExpressionAttributeNames || {},
      { '#optimisticlockingversion': attributeName },
    );
    item.ExpressionAttributeValues = Object.assign(
      item.ExpressionAttributeValues || {},
      { ':optimisticlockingversion': version },
    );

    actions.updateItem(item);
    debug('model:put|request:pre added version value to request');
  };
