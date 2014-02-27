/*
 * Copyright (c) 2014, Matteo Collina <hello@matteocollina.com>
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

"use strict";

var Qlobber = require('qlobber').Qlobber
  , assert = require('assert')

function MQEmitter(opts) {
  if (!(this instanceof MQEmitter)) {
    return new MQEmitter(opts)
  }

  opts = opts || {}

  this._messageQueue = []
  this._messageCallbacks = []

  this.concurrency = opts.concurrency || opts.maxlength || 0
  this.maxlength = opts.maxlength || 0
  this.current = 0
  this._matcher = new Qlobber()
}

MQEmitter.prototype.on = function on(topic, notify) {
  assert(topic)
  assert(notify)
  this._matcher.add(topic, notify)

  return this
}

MQEmitter.prototype.removeListener = function removeListener(topic, notify) {
  assert(topic)
  assert(notify)
  this._matcher.remove(topic, notify)

  return this
}

MQEmitter.prototype.emit = function emit(message, cb) {
  assert(message)

  if (this.concurrency > 0 && this.current >= this.concurrency) {

    if (this.maxlength > 0 && this._messageQueue.length === this.maxlength) {
      return cb(new Error('Max queue length reached'))
    }

    this._messageQueue.push(message)
    this._messageCallbacks.push(cb)
  } else {
    this.current++
    this._do(message, cb, new CallbackReceiver(this))
  }

  return this
}

MQEmitter.prototype._next = function next(receiver) {
  var message = this._messageQueue.shift()
    , callback = this._messageCallbacks.shift()

  if (!message) {
    this.current--
  } else {
    this._do(message, callback, receiver)
  }

  return this
}

MQEmitter.prototype._do = function(message, callback, receiver) {
  var matches = this._matcher.match(message.topic)
    , match
    , i

  if (matches.length === 0) {
    return this._next(receiver)
  }

  receiver.num = matches.length
  receiver.callback = callback

  for (i = 0; i < matches.length; i++) {
    match = matches[i]

    if (match.length === 1) {
      match(receiver.counter);
    } else {
      match(message, receiver.counter);
    }
  }

  return this
}

function CallbackReceiver(mq) {
  // these will be initialized by the caller
  this.num = -1
  this.callback = null

  var that = this

  this.counter = function() {
    that.num--;

    if (that.num === 0) {
      if (that.callback) {
        that.callback()
      }
      mq._next(that)
    }
  }
}

module.exports = MQEmitter
