export type Listener = (...args: any) => { resolve?: any, reject?: Error }|void
export type AsyncListener = (...args: any) => Promise<ReturnType<Listener>>
export type MixedListener = (...args: any) => ReturnType<Listener>|ReturnType<AsyncListener>