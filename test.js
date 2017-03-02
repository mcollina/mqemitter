/*
 * Copyright (c) 2014-2016, Matteo Collina <hello@matteocollina.com>
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

test('queue concurrency and releasing', function (t) {
  var e = mq({ concurrency: 2 })
  var sent = 0
  var received = 0
  var lastmsg = 0

  t.equal(e.concurrency, 2)

  e.on('overflow', function (message, cb) {
    t.ok(lastmsg === (message.num - 1), 'messages should arrive in correct order')
    lastmsg = message.num
    received++
  })

  do {
    sent++
    e.emit({topic: 'overflow', num: sent}, function () {})
  }
  while (sent < 4)

  t.equal(received, sent, 'there should be equal received and sent messages')
  e.close(function () {
    t.end()
  })
})
