// tslint:disable-next-line:no-submodule-imports
import { create as createAttr } from 'dynamoose/dist/Attribute';

import { extendModel, extendModelInstance } from '../api';
import { EmittedEvent, EmittedObject, OptimisticLockingConfig } from '../interfaces';
import { Listener } from '../types';
import { debug } from '../utils/debug';

export const initListener = (configuration: OptimisticLockingConfig) => 
  ({ model, modelName }: EmittedObject<EmittedEvent, {}>): ReturnType<Listener> => {
    debug(`initializing plugin for model \`${modelName}\` with configuration %O`, configuration);

    const { attributeName, attributeSymbol } = configuration;
    const { schema: originalSchema } = model.$__;

    const schema = Object.create(Object.getPrototypeOf(originalSchema));
    Object.assign(schema, originalSchema);
    schema.attributes[attributeName] = createAttr(
      schema,
      attributeSymbol,
      { type: Number, default: 1 },
    );
    Object.assign(model.$__, { schema });

    extendModel(model, configuration);
    extendModelInstance(model, configuration);

    debug(`plugin initialized for model \`${modelName}\``);
  };
