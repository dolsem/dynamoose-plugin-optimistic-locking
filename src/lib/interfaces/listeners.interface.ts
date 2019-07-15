import { AsyncListener, Listener, MixedListener } from '../types';

export interface Listeners {
  [event: string]: {
    [stage: string]: Listener|AsyncListener|MixedListener|null;
  };
};
