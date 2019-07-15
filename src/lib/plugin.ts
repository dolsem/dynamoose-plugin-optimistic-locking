import { OptimisticLockingConfig } from './interfaces';
import { createListeners } from './listeners';
import { debug } from './utils/debug';

const NAME = 'Dynamoose Optimistic Locking Plugin';
const DESC = 'Performs optimistic locking on db writes to protect data integrity in a concurrent enviroment';
const DEFAULT_OPTS: OptimisticLockingConfig = {
  allowUnsupported: false,
  attributeName: '__version',
  attributeSymbol: Symbol('version-attribute'),
  fetchItemOnWriteError: false,
};

export const OptimisticLockingPlugin = (plugin: any, options: Partial<OptimisticLockingConfig> = DEFAULT_OPTS) => {
  plugin.setName(NAME);
  plugin.setDescription(DESC);

  let config: OptimisticLockingConfig;
  if (options === DEFAULT_OPTS) { config = options as OptimisticLockingConfig; }
  else {
    const configReducer = (acc: OptimisticLockingConfig, key: keyof OptimisticLockingConfig) =>
      // tslint:disable-next-line:prefer-object-spread
      Object.assign(acc, { [key]: options[key] || DEFAULT_OPTS[key] })
    config = Object.keys(DEFAULT_OPTS).reduce<Partial<OptimisticLockingConfig>>(
      configReducer as () => ReturnType<typeof configReducer>,
      {}
    ) as OptimisticLockingConfig;
  }

  const listeners = createListeners(config);
  Object.keys(listeners).forEach(
    event => Object.keys(listeners[event]).forEach(
      (stage) => {
        const listener = listeners[event][stage];
        if (listener) {
          plugin.on(event, stage, listener);
          debug(`registered listener ${event}|${stage}`);
        }
      },
    ),
  );
};
