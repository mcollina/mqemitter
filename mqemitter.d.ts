/* eslint no-unused-vars: 0 */
/* eslint no-undef: 0 */
/* eslint space-infix-ops: 0 */

/// <reference types="node" />

export default function MQEmitter (options?: MQEmitterOptions): MQEmitter

export interface MQEmitterOptions {
  concurrency?: number
  matchEmptyLevels?: boolean
  separator?: string
  wildcardOne?: string
  wildcardSome?: string
}

export type Message = object & { topic: string }

export interface MQEmitter {
  current: number
  concurrent: number
  on(topic: string, listener: (message: Message, done: () => void) => void, callback?: () => void): this
  emit(message: Message, callback?: (error?: Error) => void): void
  removeListener(topic: string, listener?: (message: Message, done: () => void) => void, callback?: () => void): void
  close(callback: () => void): void
}
