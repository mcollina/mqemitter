'use strict'

const abstractTest = require('./abstractTest')
const t = require('tap')
const test = t.test
const mq = require('./')

abstractTest({
  builder: mq,
  test: test
})

test('queue concurrency', function (t) {
  t.plan(3)

  const e = mq({ concurrency: 1 })
  var completed1 = false

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
  var completed1 = false

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
