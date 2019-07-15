import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { Listener } from '../types';
import { debug } from '../utils/debug';

interface PutCalledListenerEvent extends EmittedEvent {
  readonly options: { [option: string]: any }|(() => any);
  readonly item: any;
}

interface PutCalledListenerActions {
  updateOptions: (newOptions: { [option: string]: any }) => void;
}

type PutCalledEmittedObject = EmittedObject<PutCalledListenerEvent, PutCalledListenerActions>;

export const putCalledListener = ({ attributeSymbol }: OptimisticLockingConfig) => 
  ({ event, actions }: PutCalledEmittedObject): ReturnType<Listener> => {
    debug('model:put|put:called triggered');
    const { options, item } = event;

    const newVersion = (item[attributeSymbol] || 0) + 1;
    item[attributeSymbol] = newVersion;
    debug('model:put|put:called incremented version of %O', item);

    actions.updateOptions({
      ...(typeof options === 'object' && options),
      $$__ol__version: newVersion,
    });
    debug('model:put|put:called updated options with item version');
  };
