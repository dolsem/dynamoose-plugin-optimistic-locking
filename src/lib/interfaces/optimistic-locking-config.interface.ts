export interface OptimisticLockingConfig {
  attributeName: string,
  attributeSymbol: symbol,
  fetchItemOnWriteError: boolean,
  allowUnsupported: boolean,
}