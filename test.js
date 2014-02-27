
var test = require('tap').test
  , mq = require('./')

test('support on and emit', function(t) {
  t.plan(2)

  var e = mq()
    , expected = { my: 'message' }

  e.on('hello world', function(topic, message, cb) {
    t.equal(topic, 'hello world')
    t.equal(message, expected)
    cb()
  })

  e.emit('hello world', expected, function() {
    t.end()
  })
})

test('support multiple subscribers', function(t) {
  t.plan(2)

  var e = mq()
    , expected = { my: 'message' }

  e.on('hello world', function(topic, message, cb) {
    t.ok(true)
    cb()
  })

  e.on('hello world', function(topic, message, cb) {
    t.ok(true)
    cb()
  })

  e.emit('hello world', expected, function() {
    t.end()
  })
})

test('support wildcards', function(t) {
  t.plan(1)

  var e = mq()
    , expected = { my: 'message' }

  e.on('hello.*', function(topic, message, cb) {
    t.equal(topic, 'hello.world')
    cb()
  })

  e.emit('hello.world', expected, function() {
    t.end()
  })
})

test('support two on arguments', function(t) {
  t.plan(1)

  var e = mq()
    , expected = { my: 'message' }

  e.on('hello world', function(message, cb) {
    t.equal(message, expected)
    cb()
  })

  e.emit('hello world', expected, function() {
    t.end()
  })
})

test('support only one on argument', function(t) {
  t.plan(1)

  var e = mq()
    , expected = { my: 'message' }

  e.on('hello world', function(cb) {
    t.ok(true)
    cb()
  })

  e.emit('hello world', expected, function() {
    t.end()
  })
})
