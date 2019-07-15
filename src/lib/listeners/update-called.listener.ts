import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { debug } from '../utils/debug';

interface UpdateCalledListenerEvent extends EmittedEvent {
  readonly expression: { $ADD: {}, $DELETE: {}, $PUT: {} };
}

interface UpdateCalledListenerActions {
  updateExpression: (newExpression: UpdateCalledListenerEvent['expression']) => void;
}

export const updateCalledListener = ({ attributeName }: OptimisticLockingConfig) =>
  ({ event, actions }: EmittedObject<UpdateCalledListenerEvent, UpdateCalledListenerActions>) => {
    debug('model:update|update:called triggered');
    const { expression } = event;

    const newExpression = {
      ...expression,
      $ADD: {
        ...expression.$ADD,
        [attributeName]: 1,
      },
    };
    actions.updateExpression(newExpression);
    debug('model:update|update:called updated UpdateExpression to %O', newExpression);
  };
