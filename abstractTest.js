'use strict'

module.exports = function abstractTests (opts) {
  const builder = opts.builder
  const test = opts.test

  test('support on and emit', async t => {
    t.plan(4)

    const e = builder()
    const expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello world', function (message, cb) {
        t.assert.equal(e.current, 1, 'number of current messages')
        t.assert.deepEqual(message, expected)
        t.assert.equal(this, e)
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support multiple subscribers', async t => {
    t.plan(3)

    const e = builder()
    const expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello world', (message, cb) => {
        t.assert.ok(message, 'message received')
        cb()
      }, () => {
        e.on('hello world', (message, cb) => {
          t.assert.ok(message, 'message received')
          cb()
        }, () => {
          e.emit(expected, () => {
            e.close(() => {
              t.assert.ok(true, 'closed')
              resolve()
            })
          })
        })
      })
    })
  })

  test('support multiple subscribers and unsubscribers', async t => {
    t.plan(2)

    const e = builder()
    const expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      function first (message, cb) {
        t.fail('first listener should not receive any events')
        cb()
      }

      function second (message, cb) {
        t.assert.ok(message, 'second listener must receive the message')
        cb()
        e.close(() => {
          t.assert.ok(true, 'closed')
          resolve()
        })
      }

      e.on('hello world', first, () => {
        e.on('hello world', second, () => {
          e.removeListener('hello world', first, () => {
            e.emit(expected)
          })
        })
      })
    })
  })

  test('removeListener', async t => {
    t.plan(1)

    const e = builder()
    const expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }
    let toRemoveCalled = false

    function toRemove (message, cb) {
      toRemoveCalled = true
      cb()
    }

    await new Promise(resolve => {
      e.on('hello world', (message, cb) => {
        cb()
      }, () => {
        e.on('hello world', toRemove, () => {
          e.removeListener('hello world', toRemove, () => {
            e.emit(expected, () => {
              e.close(() => {
                t.assert.ok(!toRemoveCalled, 'the toRemove function must not be called')
                resolve()
              })
            })
          })
        })
      })
    })
  })

  test('without a callback on emit and on', async t => {
    t.plan(1)

    const e = builder()
    const expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello world', (message, cb) => {
        cb()
        e.close(() => {
          t.assert.ok(true, 'closed')
          resolve()
        })
      })

      setTimeout(() => {
        e.emit(expected)
      }, 100)
    })
  })

  test('without any listeners', async t => {
    t.plan(2)

    const e = builder()
    const expected = {
      topic: 'hello world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.emit(expected)
      t.assert.equal(e.current, 0, 'reset the current messages trackers')
      e.close(() => {
        t.assert.ok(true, 'closed')
        resolve()
      })
    })
  })

  test('support one level wildcard', async t => {
    t.plan(2)

    const e = builder()
    const expected = {
      topic: 'hello/world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello/+', (message, cb) => {
        t.assert.equal(message.topic, 'hello/world')
        cb()
      }, () => {
      // this will not be catched
        e.emit({ topic: 'hello/my/world' })

        // this will be catched
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support one level wildcard - not match empty words', async t => {
    t.plan(2)

    const e = builder({ matchEmptyLevels: false })
    const expected = {
      topic: 'hello/dummy/world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello/+/world', (message, cb) => {
        t.assert.equal(message.topic, 'hello/dummy/world')
        cb()
      }, () => {
      // this will not be catched
        e.emit({ topic: 'hello//world' })

        // this will be catched
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support one level wildcard - match empty words', async t => {
    t.plan(3)

    const e = builder({ matchEmptyLevels: true })

    await new Promise(resolve => {
      e.on('hello/+/world', (message, cb) => {
        const topic = message.topic
        if (topic === 'hello//world' || topic === 'hello/dummy/world') {
          t.assert.ok(true, `received ${topic}`)
        }
        cb()
      }, () => {
      // this will be catched
        e.emit({ topic: 'hello//world' })
        // this will be catched
        e.emit({ topic: 'hello/dummy/world' }, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support one level wildcard - match empty words', async t => {
    t.plan(2)

    const e = builder({ matchEmptyLevels: true })
    await new Promise(resolve => {
      e.on('hello/+', (message, cb) => {
        t.assert.equal(message.topic, 'hello/')
        cb()
      }, () => {
      // this will be catched
        e.emit({ topic: 'hello/' }, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support one level wildcard - not match empty words', async t => {
    t.plan(1)

    const e = builder({ matchEmptyLevels: false })

    await new Promise(resolve => {
      e.on('hello/+', (message, cb) => {
        t.fail('should not catch')
        cb()
      }, () => {
      // this will not be catched
        e.emit({ topic: 'hello/' }, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support changing one level wildcard', async t => {
    t.plan(2)

    const e = builder({ wildcardOne: '~' })
    const expected = {
      topic: 'hello/world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello/~', (message, cb) => {
        t.assert.equal(message.topic, 'hello/world')
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support deep wildcard', async t => {
    t.plan(2)

    const e = builder()
    const expected = {
      topic: 'hello/my/world',
      payload: { my: 'message' }
    }
    await new Promise(resolve => {
      e.on('hello/#', (message, cb) => {
        t.assert.equal(message.topic, 'hello/my/world')
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support deep wildcard without separator', async t => {
    t.plan(2)

    const e = builder()
    const expected = {
      topic: 'hello',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('#', (message, cb) => {
        t.assert.equal(message.topic, expected.topic)
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support deep wildcard - match empty words', async t => {
    t.plan(2)

    const e = builder({ matchEmptyLevels: true })
    const expected = {
      topic: 'hello',
      payload: { my: 'message' }
    }

    const wrong = {
      topic: 'hellooo',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello/#', (message, cb) => {
        t.assert.equal(message.topic, expected.topic)
        cb()
      }, () => {
        e.emit(wrong) // this should not be received
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support changing deep wildcard', async t => {
    t.plan(2)

    const e = builder({ wildcardSome: '*' })
    const expected = {
      topic: 'hello/my/world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello/*', (message, cb) => {
        t.assert.equal(message.topic, 'hello/my/world')
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('support changing the level separator', async t => {
    t.plan(2)

    const e = builder({ separator: '~' })
    const expected = {
      topic: 'hello~world',
      payload: { my: 'message' }
    }

    await new Promise(resolve => {
      e.on('hello~+', (message, cb) => {
        t.assert.equal(message.topic, 'hello~world')
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            t.assert.ok(true, 'closed')
            resolve()
          })
        })
      })
    })
  })

  test('close support', async t => {
    const e = builder()
    let check = false

    t.assert.ok(!e.closed, 'must have a false closed property')

    await new Promise(resolve => {
      e.close(() => {
        t.assert.ok(check, 'must delay the close callback')
        t.assert.ok(e.closed, 'must have a true closed property')
        resolve()
      })
      check = true
    })
  })

  test('emit after close errors', async t => {
    const e = builder()

    await new Promise(resolve => {
      e.close(() => {
        e.emit({ topic: 'hello' }, err => {
          t.assert.ok(err, 'must return an error')
          resolve()
        })
      })
    })
  })

  test('support multiple subscribers with wildcards', async t => {
    const e = builder()
    const expected = {
      topic: 'hello/world',
      payload: { my: 'message' }
    }
    let firstCalled = false
    let secondCalled = false

    await new Promise(resolve => {
      e.on('hello/#', (message, cb) => {
        t.assert.ok(!firstCalled, 'first subscriber must only be called once')
        firstCalled = true
        cb()
      })

      e.on('hello/+', (message, cb) => {
        t.assert.ok(!secondCalled, 'second subscriber must only be called once')
        secondCalled = true
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            resolve()
          })
        })
      })
    })
  })

  test('support multiple subscribers with wildcards (deep)', async t => {
    const e = builder()
    const expected = {
      topic: 'hello/my/world',
      payload: { my: 'message' }
    }
    let firstCalled = false
    let secondCalled = false

    await new Promise(resolve => {
      e.on('hello/#', (message, cb) => {
        t.assert.ok(!firstCalled, 'first subscriber must only be called once')
        firstCalled = true
        cb()
      })

      e.on('hello/+/world', (message, cb) => {
        t.assert.ok(!secondCalled, 'second subscriber must only be called once')
        secondCalled = true
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            resolve()
          })
        })
      })
    })
  })

  test('emit & receive buffers', async t => {
    const e = builder()
    const msg = Buffer.from('hello')
    const expected = {
      topic: 'hello',
      payload: msg
    }

    await new Promise(resolve => {
      e.on('hello', (message, cb) => {
        t.assert.deepEqual(msg, message.payload)
        cb()
      }, () => {
        e.emit(expected, () => {
          e.close(() => {
            resolve()
          })
        })
      })
    })
  })

  test('packets are emitted in order', async t => {
    const e = builder()
    const total = 10000
    const topic = 'test'

    let received = 0

    await new Promise(resolve => {
      e.on(topic, (msg, cb) => {
        let fail = false
        if (received !== msg.payload) {
          t.fail(`leak detected. Count: ${received} - Payload: ${msg.payload}`)
          fail = true
        }

        received++

        if (fail || received === total) {
          e.close(() => {
            resolve()
          })
        }
        cb()
      }, () => {
        for (let payload = 0; payload < total; payload++) {
          e.emit({ topic, payload })
        }
      })
    })
  })

  test('calling emit without cb when closed doesn\'t throw error', async t => {
    const e = builder()
    const msg = Buffer.from('hello')
    const expected = {
      topic: 'hello',
      payload: msg
    }

    await new Promise(resolve => {
      e.close(() => {
        try {
          e.emit(expected)
        } catch (error) {
          t.assert.ifError('throws error')
        }
        resolve()
      })
    })
  })
}
