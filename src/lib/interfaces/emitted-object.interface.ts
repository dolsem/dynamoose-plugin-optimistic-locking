import { EmittedEvent } from './emitted-event.interface';

export interface EmittedObject<Event extends EmittedEvent, Actions> {
  readonly model: any;
  readonly modelName: string;
  readonly plugins: any[];
  readonly plugin: any;
  readonly event: Event;
  readonly actions: Actions;
}