/// <reference types="node" />

interface MQEmitterOptions {
  concurrency?: number
  matchEmptyLevels?: boolean
  separator?: string
  wildcardOne?: string
  wildcardSome?: string
}

export type Message = Record<string, any> & { topic: string }

export interface MQEmitter {
  current: number
  concurrent: number
  on(topic: string, listener: (message: Message, done: () => void) => void, callback?: () => void): this
  emit(message: Message, callback?: (error?: Error) => void): void
  removeListener(topic: string, listener: (message: Message, done: () => void) => void, callback?: () => void): void
  close(callback: () => void): void
}

export default function (options?: MQEmitterOptions): MQEmitter
