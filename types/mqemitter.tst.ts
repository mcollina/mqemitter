import { expect, test } from 'tstyche'
import mqEmitter from './mqemitter'
import type { Message, MQEmitter } from './mqemitter'

function listener (message: Message, done: () => void) {}

test('mqemitter factory', () => {
  expect(mqEmitter()).type.toBe<MQEmitter>()

  expect(mqEmitter({ concurrency: 200, matchEmptyLevels: true })).type.toBe<MQEmitter>()

  expect(
    mqEmitter({
      concurrency: 10,
      matchEmptyLevels: true,
      separator: '/',
      wildcardOne: '+',
      wildcardSome: '#'
    })
  ).type.toBe<MQEmitter>()
})

test('mqemitter methods', () => {
  expect(mqEmitter().on('topic', listener)).type.toBe<MQEmitter>()

  // emit() requires a Message — null must be rejected (paired positive below)
  expect(mqEmitter().emit).type.not.toBeCallableWith(null)
  expect(mqEmitter().emit).type.toBeCallableWith({ topic: 'test' })

  expect(
    mqEmitter().emit({ topic: 'test', prop1: 'prop1', [Symbol.for('me')]: 42 })
  ).type.toBe<void>()

  expect(mqEmitter().emit({ topic: 'test', prop1: 'prop1' }, () => {})).type.toBe<void>()

  expect(mqEmitter().removeListener('topic', listener)).type.toBe<void>()

  expect(mqEmitter().close(() => null)).type.toBe<void>()
})
