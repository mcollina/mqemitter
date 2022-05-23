'use strict'

const { test } = require('tape')
const mq = require('../')

require('../abstractTest')({
  builder: mq,
  test
})

test('queue concurrency', function (t) {
  t.plan(3)

  const e = mq({ concurrency: 1 })
  let completed1 = false

  t.equal(e.concurrency, 1)

  e.on('hello 1', function (message, cb) {
    setTimeout(cb, 10)
  })

  e.on('hello 2', function (message, cb) {
    cb()
  })

  e.emit({ topic: 'hello 1' }, function () {
    completed1 = true
  })

  e.emit({ topic: 'hello 2' }, function () {
    t.ok(completed1, 'the first message must be completed')
  })

  t.equal(e.length, 1)
})

test('queue released when full', function (t) {
  t.plan(21)

  const e = mq({ concurrency: 1 })

  e.on('hello 1', function (message, cb) {
    t.ok(true, 'message received')
    setTimeout(cb, 10)
  })

  function onSent () {
    t.ok(true, 'message sent')
  }

  for (let i = 0; i < 9; i++) {
    e._messageQueue.push({ topic: 'hello 1' })
    e._messageCallbacks.push(onSent)
    e.current++
  }

  e.emit({ topic: 'hello 1' }, onSent)

  process.once('warning', function (warning) {
    t.equal(warning.message, 'MqEmitter leak detected', 'warning message')
  })
})

test('without any listeners and a callback', function (t) {
  const e = mq()
  const expected = {
    topic: 'hello world',
    payload: { my: 'message' }
  }

  e.emit(expected, function () {
    t.equal(e.current, 1, 'there 1 message that is being processed')
    e.close(function () {
      t.end()
    })
  })
})

test('queue concurrency with overlapping subscriptions', function (t) {
  t.plan(3)

  const e = mq({ concurrency: 1 })
  let completed1 = false

  t.equal(e.concurrency, 1)

  e.on('000001/021/#', function (message, cb) {
    setTimeout(cb, 10)
  })

  e.on('000001/021/000B/0001/01', function (message, cb) {
    setTimeout(cb, 20)
  })

  e.emit({ topic: '000001/021/000B/0001/01' }, function () {
    completed1 = true
  })

  e.emit({ topic: '000001/021/000B/0001/01' }, function () {
    t.ok(completed1, 'the first message must be completed')
    process.nextTick(function () {
      t.equal(e.current, 0, 'no message is in flight')
    })
  })
})

test('removeListener without a callback does not throw', function (t) {
  const e = mq()
  function fn () {}

  e.on('hello', fn)
  e.removeListener('hello', fn)

  t.end()
})

test('removeAllListeners removes listeners', function (t) {
  const e = mq()

  e.on('hello', function () {
    t.fail('listener called')
  })

  e.removeAllListeners('hello', function () {
    e.emit({ topic: 'hello' }, function () {
      t.end()
    })
  })
})

test('removeAllListeners without a callback does not throw', function (t) {
  const e = mq()
  function fn () {}

  e.on('hello', fn)
  e.removeAllListeners('hello')

  t.end()
})

test('set defaults to opts', function (t) {
  const opts = {}
  mq(opts)

  t.deepEqual(opts, {
    matchEmptyLevels: true,
    separator: '/',
    wildcardOne: '+',
    wildcardSome: '#'
  })

  t.end()
})

test('removeListener inside messageHandler', function (t) {
  t.plan(3)

  const e = mq()

  function messageHandler1 (message, cb) {
    t.ok(true, 'messageHandler1 called')
    // removes itself
    e.removeListener('hello', messageHandler1)
    cb()
  }

  e.on('hello', messageHandler1)

  function messageHandler2 (message, cb) {
    t.ok(true, 'messageHandler2 called')
    cb()
  }

  e.on('hello', messageHandler2)

  e.emit({ topic: 'hello' }, function () {
    t.ok(true, 'emit callback received')
  })
})
