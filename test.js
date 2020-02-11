/*
 * Copyright (c) 2014-2020, Matteo Collina <hello@matteocollina.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
 * IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
'use strict'

var abstractTest = require('./abstractTest')
var test = require('tape').test
var mq = require('./')

abstractTest({
  builder: mq,
  test: require('tape').test
})

test('queue concurrency', function (t) {
  t.plan(3)

  var e = mq({ concurrency: 1 })
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
  var e = mq()
  var expected = {
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

  var e = mq({ concurrency: 1 })
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
