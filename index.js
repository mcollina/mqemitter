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

MQEmitter.prototype.emit = function emit(message, cb) {
  assert(message)
  assert(cb)

  var matches = this._matcher.match(message.topic)
    , i
    , receiver = new CallbackReceiver(matches.length, cb)
    , match

  for (i = 0; i < matches.length; i++) {
    match = matches[i]

    if (match.length === 1) {
      match(receiver.counter);
    } else {
      match(message, receiver.counter);
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
