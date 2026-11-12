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

// a slow subscriber that keeps every slot it gets until its callback is called
function holdSlots (e) {
  const pending = []
  e.on('slow/topic', (message, cb) => {
    pending.push(cb)
  })
  return pending
}

for (const withSubscriber of [false, true]) {
  const name = withSubscriber ? 'with a synchronous subscriber' : 'without subscribers'

  test(`draining a long queue of messages ${name} does not overflow the stack`, async t => {
    const concurrency = 100
    // recursing once per queued message overflowed after a few thousand
    const total = 20000
    const e = mq({ concurrency })
    const pending = holdSlots(e)
    const order = []
    if (withSubscriber) {
      e.on('queued/#', (message, cb) => cb())
    }

    // fill every slot with a message whose delivery is still pending
    for (let i = 0; i < concurrency; i++) {
      e.emit({ topic: 'slow/topic' })
    }

    for (let i = 0; i < total; i++) {
      e.emit({ topic: `queued/${i}` }, () => order.push(i))
    }

    t.assert.equal(e.length, total)

    const drained = new Promise(resolve => e.emit({ topic: 'queued/last' }, resolve))
    pending.forEach(cb => cb())
    await drained

    t.assert.equal(order.length, total, 'every queued message is delivered')
    t.assert.ok(order.every((value, i) => value === i), 'in order')
    t.assert.equal(e.current, 0, 'every slot is released')
  })
}

test('a message emitted after slots free up in the same tick does not overtake the queue', t => {
  const e = mq({ concurrency: 2 })
  const pending = holdSlots(e)
  const order = []

  e.on('fast/topic', (message, cb) => {
    order.push(message.id)
    cb()
  })

  e.emit({ topic: 'slow/topic' })
  e.emit({ topic: 'slow/topic' })
  e.emit({ topic: 'fast/topic', id: 'queued' })

  pending.forEach(cb => cb())
  e.emit({ topic: 'fast/topic', id: 'new' })

  t.assert.deepEqual(order, ['queued', 'new'])
})

test('a subscriber throwing during a drain does not stop later deliveries', t => {
  const e = mq({ concurrency: 2 })
  const pending = holdSlots(e)
  const delivered = []

  e.on('throw/topic', () => {
    throw new Error('boom')
  })
  e.on('fast/topic', (message, cb) => {
    delivered.push(message.id)
    cb()
  })

  e.emit({ topic: 'slow/topic' })
  e.emit({ topic: 'slow/topic' })
  e.emit({ topic: 'throw/topic' })
  e.emit({ topic: 'fast/topic', id: 'after' })

  t.assert.throws(() => pending[0](), /boom/)
  pending[1]()

  t.assert.deepEqual(delivered, ['after'])
})

test('a subscriber releasing another slot and then throwing does not stall the emitter', t => {
  const e = mq({ concurrency: 2 })
  const pending = holdSlots(e)
  const delivered = []

  e.on('throw/topic', () => {
    pending[1]()
    throw new Error('boom')
  })
  e.on('fast/topic', (message, cb) => {
    delivered.push(message.id)
    cb()
  })

  e.emit({ topic: 'slow/topic' })
  e.emit({ topic: 'slow/topic' })
  e.emit({ topic: 'throw/topic' })

  t.assert.throws(() => pending[0](), /boom/)
  e.emit({ topic: 'fast/topic', id: 'after' })

  t.assert.deepEqual(delivered, ['after'])
})
