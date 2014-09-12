
var abstractTest  = require('./abstractTest')
  , test          = require('tape').test
  , mq            = require('./')

abstractTest({
    builder: mq
  , test: require('tape').test
})

test('queue concurrency', function(t) {
  t.plan(2)

  var e = mq({ concurrency: 1 })
    , expected = {
        topic: 'hello world'
      , payload: { my: 'message' }
    }
    , completed1 =  false

  t.equal(e.concurrency, 1)

  e.on('hello 1', function(message, cb) {
    setTimeout(cb, 10)
  })

  e.on('hello 2', function(message, cb) {
    cb()
  })

  start = Date.now()
  e.emit({ topic: 'hello 1' }, function() {
    completed1 = true
  })

  e.emit({ topic: 'hello 2' }, function() {
    t.ok(completed1, 'the first message must be completed')
  })
})
