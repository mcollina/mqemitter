/*
 * Copyright (c) 2014-2017, Matteo Collina <hello@matteocollina.com>
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

var Buffer = require('safe-buffer').Buffer

function buildTests (opts) {
  var builder = opts.builder
  var test = opts.test

  test('support on and emit', function (t) {
    t.plan(4)

    var e = builder()
    var expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    e.on('hello world', function (message, cb) {
      t.equal(e.current, 1, 'number of current messages')
      t.deepEqual(message, expected)
      t.equal(this, e)
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.pass('closed')
        })
      })
    })
  })

  test('support multiple subscribers', function (t) {
    t.plan(3)

    var e = builder()
    var expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    e.on('hello world', function (message, cb) {
      t.ok(message, 'message received')
      cb()
    }, function () {
      e.on('hello world', function (message, cb) {
        t.ok(message, 'message received')
        cb()
      }, function () {
        e.emit(expected, function () {
          e.close(function () {
            t.pass('closed')
          })
        })
      })
    })
  })

  test('support multiple subscribers and unsubscribers', function (t) {
    t.plan(2)

    var e = builder()
    var expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    function first (message, cb) {
      t.fail('first listener should not receive any events')
      cb()
    }

    function second (message, cb) {
      t.ok(message, 'second listener must receive the message')
      cb()
      e.close(function () {
        t.pass('closed')
      })
    }

    e.on('hello world', first, function () {
      e.on('hello world', second, function () {
        e.removeListener('hello world', first, function () {
          e.emit(expected)
        })
      })
    })
  })

  test('removeListener', function (t) {
    t.plan(1)

    var e = builder()
    var expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }
    var toRemoveCalled = false

    function toRemove (message, cb) {
      toRemoveCalled = true
      cb()
    }

    e.on('hello world', function (message, cb) {
      cb()
    }, function () {
      e.on('hello world', toRemove, function () {
        e.removeListener('hello world', toRemove, function () {
          e.emit(expected, function () {
            e.close(function () {
              t.notOk(toRemoveCalled, 'the toRemove function must not be called')
            })
          })
        })
      })
    })
  })

  test('without a callback on emit and on', function (t) {
    t.plan(1)

    var e = builder()
    var expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    e.on('hello world', function (message, cb) {
      cb()
      e.close(function () {
        t.pass('closed')
      })
    })

    setTimeout(function () {
      e.emit(expected)
    }, 100)
  })

  test('without any listeners', function (t) {
    t.plan(2)

    var e = builder()
    var expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    e.emit(expected)
    t.equal(e.current, 0, 'reset the current messages trackers')
    e.close(function () {
      t.pass('closed')
    })
  })

  test('support one level wildcard', function (t) {
    t.plan(2)

    var e = builder()
    var expected = {
      topic: 'hello/world',
      payload: { my: 'message' }
    }

    e.on('hello/+', function (message, cb) {
      t.equal(message.topic, 'hello/world')
      cb()
    }, function () {
      // this will not be catched
      e.emit({ topic: 'hello/my/world' })

      // this will be catched
      e.emit(expected, function () {
        e.close(function () {
          t.pass('closed')
        })
      })
    })
  })

  test('support changing one level wildcard', function (t) {
    t.plan(2)

    var e = builder({ wildcardOne: '~' })
    var expected = {
      topic: 'hello/world',
      payload: { my: 'message' }
    }

    e.on('hello/~', function (message, cb) {
      t.equal(message.topic, 'hello/world')
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.pass('closed')
        })
      })
    })
  })

  test('support deep wildcard', function (t) {
    t.plan(2)

    var e = builder()
    var expected = {
      topic: 'hello/my/world',
      payload: { my: 'message' }
    }

    e.on('hello/#', function (message, cb) {
      t.equal(message.topic, 'hello/my/world')
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.pass('closed')
        })
      })
    })
  })

  test('support changing deep wildcard', function (t) {
    t.plan(2)

    var e = builder({ wildcardSome: '*' })
    var expected = {
      topic: 'hello/my/world',
      payload: { my: 'message' }
    }

    e.on('hello/*', function (message, cb) {
      t.equal(message.topic, 'hello/my/world')
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.pass('closed')
        })
      })
    })
  })

  test('support changing the level separator', function (t) {
    t.plan(2)

    var e = builder({ separator: '~' })
    var expected = {
      topic: 'hello~world',
      payload: { my: 'message' }
    }

    e.on('hello~+', function (message, cb) {
      t.equal(message.topic, 'hello~world')
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.pass('closed')
        })
      })
    })
  })

  test('close support', function (t) {
    var e = builder()
    var check = false

    t.notOk(e.closed, 'must have a false closed property')

    e.close(function () {
      t.ok(check, 'must delay the close callback')
      t.ok(e.closed, 'must have a true closed property')
      t.end()
    })

    check = true
  })

  test('emit after close errors', function (t) {
    var e = builder()

    e.close(function () {
      e.emit({ topic: 'hello' }, function (err) {
        t.ok(err, 'must return an error')
        t.end()
      })
    })
  })

  test('support multiple subscribers with wildcards', function (t) {
    var e = builder()
    var expected = {
      topic: 'hello/world',
      payload: { my: 'message' }
    }
    var firstCalled = false
    var secondCalled = false

    e.on('hello/#', function (message, cb) {
      t.notOk(firstCalled, 'first subscriber must only be called once')
      firstCalled = true
      cb()
    })

    e.on('hello/+', function (message, cb) {
      t.notOk(secondCalled, 'second subscriber must only be called once')
      secondCalled = true
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.end()
        })
      })
    })
  })

  test('support multiple subscribers with wildcards (deep)', function (t) {
    var e = builder()
    var expected = {
      topic: 'hello/my/world',
      payload: { my: 'message' }
    }
    var firstCalled = false
    var secondCalled = false

    e.on('hello/#', function (message, cb) {
      t.notOk(firstCalled, 'first subscriber must only be called once')
      firstCalled = true
      cb()
    })

    e.on('hello/+/world', function (message, cb) {
      t.notOk(secondCalled, 'second subscriber must only be called once')
      secondCalled = true
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.end()
        })
      })
    })
  })

  test('emit & receive buffers', function (t) {
    var e = builder()
    var msg = Buffer.from('hello')
    var expected = {
      topic: 'hello',
      payload: msg
    }

    e.on('hello', function (message, cb) {
      t.deepEqual(msg, message.payload)
      cb()
    }, function () {
      e.emit(expected, function () {
        e.close(function () {
          t.end()
        })
      })
    })
  })
}

module.exports = buildTests
