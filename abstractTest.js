
function buildTests(opts) {
  var builder = opts.builder
    , test    = opts.test

  test('support on and emit', function(t) {
    t.plan(3)

    var e = builder()
      , expected = {
            topic: 'hello world'
          , payload: { my: 'message' }
        }

    e.on('hello world', function(message, cb) {
      t.equal(e.current, 1, 'number of current messages')
      t.equal(message, expected)
      t.equal(this, e)
      cb()
    })

    e.emit(expected, function() {
      t.end()
    })
  })

  test('support multiple subscribers', function(t) {
    t.plan(2)

    var e = builder()
      , expected = {
            topic: 'hello world'
          , payload: { my: 'message' }
        }

    e.on('hello world', function(message, cb) {
      t.ok(true)
      cb()
    })

    e.on('hello world', function(message, cb) {
      t.ok(true)
      cb()
    })

    e.emit(expected, function() {
      t.end()
    })
  })

  test('removeListener', function(t) {
    var e = builder()
      , expected = {
            topic: 'hello world'
          , payload: { my: 'message' }
        }

    e.on('hello world', function(message, cb) {
      cb()
    })

    function toRemove(message, cb) {
      t.ok(false, 'the toRemove function must not be called')
      t.end()
    }

    e.on('hello world', toRemove)

    e.removeListener('hello world', toRemove)

    e.emit(expected, function() {
      t.end()
    })
  })

  test('without a callback on emit', function(t) {
    var e = builder()
      , expected = {
            topic: 'hello world'
          , payload: { my: 'message' }
        }

    e.on('hello world', function(message, cb) {
      cb()
      t.end()
    })

    e.emit(expected)
  })

  test('without any listeners', function(t) {
    var e = builder()
      , expected = {
            topic: 'hello world'
          , payload: { my: 'message' }
        }

    e.emit(expected)
    t.equal(e.current, 0, 'reset the current messages trackers')
    t.end()
  })

  test('without any listeners and a callback', function(t) {
    var e = builder()
      , expected = {
            topic: 'hello world'
          , payload: { my: 'message' }
        }

    e.emit(expected, function() {
      t.equal(e.current, 1, 'there 1 message that is being processed')
      t.end()
    })
  })

  test('support one level wildcard', function(t) {
    t.plan(1)

    var e = builder()
      , expected = {
            topic: 'hello/world'
          , payload: { my: 'message' }
        }

    e.on('hello/+', function(message, cb) {
      t.equal(message.topic, 'hello/world')
      cb()
    })

    // this will not be catched
    e.emit({ topic: 'hello/my/world' })

    // this will be catched
    e.emit(expected)
  })

  test('support changing one level wildcard', function(t) {
    t.plan(1)

    var e = builder({ wildcardOne: '~' })
      , expected = {
            topic: 'hello/world'
          , payload: { my: 'message' }
        }

    e.on('hello/~', function(message, cb) {
      t.equal(message.topic, 'hello/world')
      cb()
    })

    e.emit(expected, function() {
      t.end()
    })
  })

  test('support deep wildcard', function(t) {
    t.plan(1)

    var e = builder()
      , expected = {
            topic: 'hello/my/world'
          , payload: { my: 'message' }
        }

    e.on('hello/#', function(message, cb) {
      t.equal(message.topic, 'hello/my/world')
      cb()
    })

    e.emit(expected)
  })

  test('support changing deep wildcard', function(t) {
    t.plan(1)

    var e = builder({ wildcardSome: '*' })
      , expected = {
            topic: 'hello/my/world'
          , payload: { my: 'message' }
        }

    e.on('hello/*', function(message, cb) {
      t.equal(message.topic, 'hello/my/world')
      cb()
    })

    e.emit(expected)
  })

  test('support changing the level separator', function(t) {
    t.plan(1)

    var e = builder({ separator: '~' })
      , expected = {
            topic: 'hello~world'
          , payload: { my: 'message' }
        }

    e.on('hello~+', function(message, cb) {
      t.equal(message.topic, 'hello~world')
      cb()
    })

    e.emit(expected, function() {
      t.end()
    })
  })

  test('close support', function(t) {
    t.plan(3)

    var e     = builder()
      , check = false

    t.notOk(e.closed, 'must have a false closed property')

    e.close(function() {
      t.ok(check, 'must delay the close callback')
      t.ok(e.closed, 'must have a true closed property')
    })

    check = true
  })

  test('emit after close errors', function(t) {
    t.plan(1)

    var e = builder()

    e.close(function() {
      e.emit({ topic: 'hello' }, function(err) {
        t.ok(err, 'must return an error')
      })
    })
  })
}

module.exports = buildTests
