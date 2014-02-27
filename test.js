
var test = require('tap').test
  , mq = require('./')

test('it should support on and emit', function(t) {
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

test('it should support multiple subscribers', function(t) {
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
