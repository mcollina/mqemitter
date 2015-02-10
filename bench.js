var mqemitter = require('./')
  , emitter = mqemitter({ concurrency: 10 })
  , total = 1000000
  , written = 0
  , received = 0
  , timerKey = 'time for sending ' + total + ' messages'

function write() {
  if (written === total) {
    return
  }

  written++

  emitter.emit({ topic: 'hello', payload: 'world' }, write)
}

emitter.on('hello', function(msg, cb) {
  received++
  if (received === total) {
    console.timeEnd(timerKey)
  }
  setImmediate(cb)
})

console.time(timerKey)
write()
write()
write()
write()
write()
write()
write()
write()
write()
write()
write()
write()
