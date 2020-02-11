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

var Qlobber = require('qlobber').Qlobber
var assert = require('assert')
var fastparallel = require('fastparallel')

function MQEmitter (opts) {
  if (!(this instanceof MQEmitter)) {
    return new MQEmitter(opts)
  }

  var that = this

  opts = opts || {}

  opts.wildcardOne = opts.wildcardOne || '+'
  opts.wildcardSome = opts.wildcardSome || '#'
  opts.separator = opts.separator || '/'

  this._messageQueue = []
  this._messageCallbacks = []
  this._parallel = fastparallel({
    results: false,
    released: released
  })

  this.concurrency = opts.concurrency

  this.current = 0
  this._matcher = new Qlobber({
    separator: opts.separator,
    wildcard_one: opts.wildcardOne,
    wildcard_some: opts.wildcardSome
  })

  this.closed = false
  this._released = released

  function released () {
    that.current--

    var message = that._messageQueue.shift()
    var callback = that._messageCallbacks.shift()

    if (message) {
      that._do(message, callback)
    }
  }
}

Object.defineProperty(MQEmitter.prototype, 'length', {
  get: function () {
    return this._messageQueue.length
  },
  enumerable: true
})

MQEmitter.prototype.on = function on (topic, notify, done) {
  assert(topic)
  assert(notify)
  this._matcher.add(topic, notify)

  if (done) {
    setImmediate(done)
  }

  return this
}

MQEmitter.prototype.removeListener = function removeListener (topic, notify, done) {
  assert(topic)
  assert(notify)
  this._matcher.remove(topic, notify)

  if (done) {
    setImmediate(done)
  }

  return this
}

MQEmitter.prototype.emit = function emit (message, cb) {
  assert(message)

  if (this.closed) {
    return cb(new Error('mqemitter is closed'))
  }

  cb = cb || nop

  if (this.concurrency > 0 && this.current >= this.concurrency) {
    this._messageQueue.push(message)
    this._messageCallbacks.push(cb)
  } else {
    this._do(message, cb)
  }

  return this
}

MQEmitter.prototype.close = function close (cb) {
  this.closed = true
  setImmediate(cb)

  return this
}

MQEmitter.prototype._do = function (message, callback) {
  var matches = this._matcher.match(message.topic)

  this.current++
  this._parallel(this, matches, message, callback)

  return this
}

function nop () {}

module.exports = MQEmitter
