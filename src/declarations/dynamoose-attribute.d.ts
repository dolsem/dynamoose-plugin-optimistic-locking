declare module 'dynamoose/dist/Attribute' {
  import { Schema, SchemaAttributes } from 'dynamoose';

  export function create(schema: Schema, name: string|symbol, definition: SchemaAttributes['']): any;
}
