'use strict'

const { Qlobber } = require('qlobber')
const assert = require('node:assert')

class MQEmitter {
  constructor (opts = {}) {
    const that = this

    opts.matchEmptyLevels = opts.matchEmptyLevels === undefined ? true : !!opts.matchEmptyLevels
    opts.separator = opts.separator || '/'
    opts.wildcardOne = opts.wildcardOne || '+'
    opts.wildcardSome = opts.wildcardSome || '#'

    this._messageQueue = []
    this._messageCallbacks = []

    this.concurrency = opts.concurrency || 0

    this.current = 0
    this._doing = false
    this._matcher = new Qlobber({
      match_empty_levels: opts.matchEmptyLevels,
      separator: opts.separator,
      wildcard_one: opts.wildcardOne,
      wildcard_some: opts.wildcardSome
    })

    this.closed = false
    this._released = released

    function released () {
      that.current--

      const message = that._messageQueue.shift()
      const callback = that._messageCallbacks.shift()

      if (message) {
        that._do(message, callback)
      } else {
        that._doing = false
      }
    }
  }

  get length () {
    return this._messageQueue.length
  }

  on (topic, notify, done) {
    assert(topic)
    assert(notify)
    this._matcher.add(topic, notify)

    if (done) {
      setImmediate(done)
    }

    return this
  }

  removeListener (topic, notify, done) {
    assert(topic)
    assert(notify)
    setImmediate(() => {
      this._matcher.remove(topic, notify)
      if (done) {
        done()
      }
    })
    return this
  }

  removeAllListeners (topic, done) {
    assert(topic)
    this._matcher.remove(topic)

    if (done) {
      setImmediate(done)
    }

    return this
  }

  emit (message, cb = noop) {
    assert(message)

    if (this.closed) {
      return cb(new Error('mqemitter is closed'))
    }

    if (this.concurrency > 0 && this.current >= this.concurrency) {
      this._messageQueue.push(message)
      this._messageCallbacks.push(cb)
      if (!this._doing) {
        process.emitWarning('MqEmitter leak detected', { detail: 'For more info check: https://github.com/mcollina/mqemitter/pull/94' })
        this._released()
      }
    } else {
      this._do(message, cb)
    }

    return this
  }

  close (cb) {
    this.closed = true
    setImmediate(cb)

    return this
  }

  _do (message, callback) {
    this._doing = true
    const matches = this._matcher.match(message.topic)
    this.current++
    // short circuit if no matches
    if (matches.length === 0) {
      callback()
      this._released()
      return this
    }
    // if single match, just call the callback
    // and we avoid the overhead of Promise.allSettled
    if (matches.length === 1) {
      const boundMatch = matches[0].bind(this)
      boundMatch(message, () => {
        callback()
        this._released()
      })
      return this
    }
    // if multiple matches, use Promise.allSettled to call them
    // and wait for all of them to finish
    const promises = matches.map((match) => {
      const boundMatch = match.bind(this)
      return new Promise((resolve) => {
        boundMatch(message, resolve)
      })
    })

    Promise.allSettled(promises).then(() => {
      callback()
      this._released()
    })

    return this
  }
}

function noop () { }

module.exports = (opts) => new MQEmitter(opts)
module.exports.MQEmitter = MQEmitter
