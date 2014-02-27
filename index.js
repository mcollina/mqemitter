
var Qlobber = require('qlobber').Qlobber
  , assert = require('assert')


function MQEmitter() {
  if (!(this instanceof MQEmitter)) {
    return new MQEmitter()
  }


  this._matcher = new Qlobber();
}

MQEmitter.prototype.on = function on(topic, notify) {
  assert(topic)
  assert(notify)
  this._matcher.add(topic, notify)
}

MQEmitter.prototype.emit = function emit(topic, message, cb) {
  assert(topic)
  assert(cb)

  var matches = this._matcher.match(topic)
    , i
    , receiver = new CallbackReceiver(matches.length, cb)
    , match

  for (i = 0; i < matches.length; i++) {
    match = matches[i]

    if (match.length === 3) {
      match(topic, message, receiver.counter);
    } else if (match.length === 2) {
      match(message, receiver.counter);
    } else {
      match(receiver.counter);
    }
  }
}

function CallbackReceiver(num, callback) {
  this.num = num;
  this.callback = callback;

  var that = this;

  this.counter = function() {
    that.num--;
    if (that.num === 0) {
      that.callback();
    }
  }
}

module.exports = MQEmitter
