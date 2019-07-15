export class OptimisticLockException<E extends Error> extends Error {
  constructor(message: string, itemInDb: any, originalError?: { [k in keyof E]: any }) {
    super(message);

    (this as any)._itemInDb = itemInDb;

    if (originalError) {
      Object.keys(originalError).forEach(((key: keyof E) => {
        if (key !== 'message') {
          (this as any)[key] = originalError[key];
        }
      }) as (key: string) => void);
    }
  }

  get itemInDb() {
    return (this as any)._itemInDb;
  }

  get attempts() {
    return (this as any)._attempts;
  }
};
