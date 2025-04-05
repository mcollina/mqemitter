'use strict'

const { test } = require('node:test')
const mq = require('../')

require('../abstractTest')({
  builder: mq,
  test
})

test('queue concurrency', async t => {
  t.plan(3)

  await new Promise(resolve => {
    const e = mq({ concurrency: 1 })
    let completed1 = false

    t.assert.equal(e.concurrency, 1)

    e.on('hello 1', (message, cb) => {
      setTimeout(cb, 10)
    })

    e.on('hello 2', (message, cb) => {
      cb()
    })

    e.emit({ topic: 'hello 1' }, () => {
      completed1 = true
    })

    e.emit({ topic: 'hello 2' }, () => {
      t.assert.ok(completed1, 'the first message must be completed')
      resolve()
    })
    t.assert.equal(e.length, 1)
  })
})

test('queue released when full', async t => {
  t.plan(21)

  await new Promise(resolve => {
    const e = mq({ concurrency: 1 })

    e.on('hello 1', (message, cb) => {
      t.assert.ok(true, 'message received')
      setTimeout(cb, 10)
    })

    function onSent () {
      t.assert.ok(true, 'message sent')
    }

    for (let i = 0; i < 9; i++) {
      e._messageQueue.push({ topic: 'hello 1' })
      e._messageCallbacks.push(onSent)
      e.current++
    }

    e.emit({ topic: 'hello 1' }, onSent)

    process.once('warning', warning => {
      t.assert.equal(warning.message, 'MqEmitter leak detected', 'warning message')
    })
    setTimeout(resolve, 200)
  })
})

test('without any listeners and a callback', async t => {
  const e = mq()
  const expected = {
    topic: 'hello world',
    payload: { my: 'message' }
  }
  await new Promise(resolve => {
    e.emit(expected, () => {
      t.assert.equal(e.current, 1, 'there 1 message that is being processed')
      e.close(() => {
        resolve()
      })
    })
  })
})

test('queue concurrency with overlapping subscriptions', async t => {
  t.plan(3)

  const e = mq({ concurrency: 1 })
  let completed1 = false

  await new Promise(resolve => {
    t.assert.equal(e.concurrency, 1)

    e.on('000001/021/#', (message, cb) => {
      setTimeout(cb, 10)
    })

    e.on('000001/021/000B/0001/01', (message, cb) => {
      setTimeout(cb, 20)
    })

    e.emit({ topic: '000001/021/000B/0001/01' }, () => {
      completed1 = true
    })

    e.emit({ topic: '000001/021/000B/0001/01' }, () => {
      t.assert.ok(completed1, 'the first message must be completed')
      process.nextTick(() => {
        t.assert.equal(e.current, 0, 'no message is in flight')
        resolve()
      })
    })
  })
})

test('removeListener without a callback does not throw', t => {
  t.plan(1)
  const e = mq()
  function fn () {}

  e.on('hello', fn)
  e.removeListener('hello', fn)

  t.assert.ok(true, 'no error thrown')
})

test('removeAllListeners removes listeners', async t => {
  t.plan(1)
  const e = mq()

  await new Promise(resolve => {
    e.on('hello', () => {
      t.fail('listener called')
    })

    e.removeAllListeners('hello', () => {
      e.emit({ topic: 'hello' }, () => {
        t.assert.ok(true, 'no error thrown')
        resolve()
      })
    })
  })
})

test('removeAllListeners without a callback does not throw', t => {
  t.plan(1)
  const e = mq()
  function fn () {}

  e.on('hello', fn)
  e.removeAllListeners('hello')

  t.assert.ok(true, 'no error thrown')
})

test('set defaults to opts', t => {
  t.plan(1)
  const opts = {}
  mq(opts)

  t.assert.deepEqual(opts, {
    matchEmptyLevels: true,
    separator: '/',
    wildcardOne: '+',
    wildcardSome: '#'
  })
})

test('removeListener inside messageHandler', t => {
  t.plan(3)

  const e = mq()

  function messageHandler1 (message, cb) {
    t.assert.ok(true, 'messageHandler1 called')
    // removes itself
    e.removeListener('hello', messageHandler1)
    cb()
  }

  e.on('hello', messageHandler1)

  function messageHandler2 (message, cb) {
    t.assert.ok(true, 'messageHandler2 called')
    cb()
  }

  e.on('hello', messageHandler2)

  e.emit({ topic: 'hello' }, () => {
    t.assert.ok(true, 'emit callback received')
  })
})
