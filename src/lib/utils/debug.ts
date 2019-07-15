import { debug as createDebugger } from 'debug';
export const debugEnabled = !!process.env.DEBUG;
export const debug = createDebugger('dynamoose-plugin:optimistic-locking');