import { OptimisticLockingConfig, PutNextVersionOptions, PutNextVersionResult } from './interfaces';
import { OptimisticLockException } from './optimistic-lock.exception';
import { debug } from './utils/debug';

export const extendModel = (model: any, { fetchItemOnWriteError }: OptimisticLockingConfig) => {
  Object.assign(model, {

    async putNextVersion(
      item: any,
      updateFunction: (item: any) => boolean|Promise<boolean>,
      { maxAttempts }: PutNextVersionOptions = {},
    ): Promise<PutNextVersionResult> {
      debug('putNextVersion|called %O', item);
      if (!fetchItemOnWriteError) {
        debug('putNextVersion|failure fetchItemOnWriteError is set to `false`')
        throw new Error('putNextVersion requires fetchItemOnWriteError set to `true`');
      }

      let savedItem: any;
      let attempts = 0;
      let shouldContinue = true;
      while (!savedItem) {
        shouldContinue = await updateFunction(item);
        if (!shouldContinue) { break; }

        attempts += 1;
        debug('putNextVersion|put attempt %d', attempts);
        try {
          savedItem = await model.prototype.put.call(item);
        } catch (err) {
          if (!(err instanceof OptimisticLockException)) {
            debug('putNextVersion|failure unexpected error');
            Object.assign(err, { attempts });
            throw err;
          }

          if (maxAttempts && (attempts === maxAttempts)) {
            debug('putNextVersion|failure max attempts exceeded: %d', maxAttempts);
            Object.assign(err, { _attempts: attempts });
            throw err;
          }

          item = err.itemInDb;
        }
      }

      let result: PutNextVersionResult;
      if (!shouldContinue) {
        result = { item, attempts };
        debug('putNextVersion|success updateFunction returned false %O', result);
      } else {
        result = { item: savedItem, attempts };
        debug('putNextVersion|success %O', result);
      }

      return result;
    },

  });
}

export const extendModelInstance = (model: any, { attributeSymbol }: OptimisticLockingConfig) => {
  Object.assign(model.prototype, {

    getVersion(): number {
      return (this as any)[attributeSymbol];
    },

    setVersion(version: number): void {
      (this as any)[attributeSymbol] = version;
    },

  });
}