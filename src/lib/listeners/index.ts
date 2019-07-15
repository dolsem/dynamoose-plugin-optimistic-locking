/* tslint:disable:object-literal-sort-keys */
import { Listeners, OptimisticLockingConfig } from '../interfaces';

import { batchPutCalledListener } from './batchput-called.listener';
import { batchPutRequestListener } from './batchput-request.listener';
import { getListener } from './get.listener';
import { initListener } from './init.listener';
import { putCalledListener } from './put-called.listener';
import { putRequestListener } from './put-request.listener';
import { putResponseListener } from './put-response.listener';
import { updateCalledListener } from './update-called.listener';


export const createListeners = (configuration: OptimisticLockingConfig): Listeners => ({
  'plugin': {
    'init': initListener(configuration),
  },
  'model:get': {
    'request:post': getListener(configuration),
  },
  'model:put': {
    'put:called': putCalledListener(configuration),
    'request:pre': putRequestListener(configuration),
    'request:post': putResponseListener(configuration),
  },
  'model:batchput': {
    'batchput:called': batchPutCalledListener(configuration),
    'request:pre': batchPutRequestListener(configuration),
  },
  'model:update': {
    'update:called': updateCalledListener(configuration),
  },
});
