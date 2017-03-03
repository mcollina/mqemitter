mqemitter&nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/mqemitter.svg)](https://travis-ci.org/mcollina/mqemitter)
=================================================================

An Opinionated Message Queue with an emitter-style API, but with
callbacks.

  * <a href="#install">Installation</a>
  * <a href="#basic">Basic Example</a>
  * <a href="#api">API</a>
  * <a href="#wildcards">Wildcards</a>
  * <a href="#licence">Licence &amp; copyright</a>

If you need a multi process MQEmitter, check out the table below:

<table><tbody>
<tr><th align="left"><a href="https://github.com/mcollina/mqemitter-redis">mqemitter redis</a></th></tr>
<tr><th align="left"><a href="https://github.com/mcollina/mqemitter-mongodb">mqemitter mongodb</a></th></tr>
<tr><th align="left"><a href="https://github.com/mcollina/mqemitter-child-process">mqemitter child process</a></th></tr>
<tr><th align="left"><a href="https://github.com/mcollina/mqemitter-cs">mqemitter client server</a></th></tr>
<tr><th align="left"><a href="https://github.com/GavinDmello/mqemitter-aerospike">mqemitter aerospike</a></th></tr>
</tbody></table>

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

<a name="install"></a>
## Installation

```
$ npm install mqemitter --save
```

<a name="basic"></a>
## Basic Example

```js
var mq = require('mqemitter')
var emitter = mq({ concurrency: 5 })
var message

emitter.on('hello world', function (message, cb) {
  // call callback when you are done
  // do not pass any errors, the emitter cannot handle it.
  cb()
})

// topic is mandatory
message = { topic: 'hello world', payload: 'or any other fields' }
emitter.emit(message, function () {
  // emitter will never return an error
})
```

## API

  * <a href="#mq"><code>MQEmitter</code></a>
  * <a href="#emit"><code>emitter#<b>emit()</b></code></a>
  * <a href="#on"><code>emitter#<b>on()</b></code></a>
  * <a href="#removeListener"><code>emitter#<b>removeListener()</b></code></a>
  * <a href="#close"><code>emitter#<b>close()</b></code></a>
  * <a href="#closed"><code>emitter#<b>closed</b></code></a>

-------------------------------------------------------
<a name="mq"></a>
### MQEmitter(opts)

MQEmitter is the class and function exposed by this module.
It can be created by `MQEmitter()` or using `new MQEmitter()`.

An MQEmitter accepts the following options:

- `concurrency`: the maximum number of concurrent messages that can be
  on concurrent delivery.
- `wildcardOne`: the char that will match one level wildcards.
- `wildcardSome`: that char that will match multiple level wildcards.
- `separator`: the separator for the different levels.

For more information on wildcards, see [this explanation](#wildcards) or
[Qlobber](https://github.com/davedoesdev/qlobber).

-------------------------------------------------------
<a name="emit"></a>
### emitter.emit(message, callback())

Emit the given message, which must have a `topic` property, which can contain wildcards
as defined on creation.

-------------------------------------------------------
<a name="on"></a>
### emitter.on(topic, callback(message, done), [onDone(err)])

Add the given callback to the passed topic. Topic can contain wildcards,
as defined on creation.
The `callback`, accept two parameters, the passed message and a `done`
callback.

The callback __must never error__ and `done` must not be called with an
__`err`__ object.

`onDone` will be called when the event subscribe is done correctly.

-------------------------------------------------------
<a name="removeListener"></a>
### emitter.removeListener(topic, callback(message, done), [removeDone(err)])

The inverse of `on`.

-------------------------------------------------------
<a name="close"></a>
### emitter.close(callback())

Close the given emitter. After, all writes will return an error.

<a name="wildcards"></a>
## Wildcards

__MQEmitter__ supports the use of wildcards: every topic is splitted
according to `separator` (default `/`).

The wildcard character `+` matches exactly one word:

```javascript
var mq = require('mqemitter')
  , emitter = mq()

emitter.on('hello/+/world', function(message, cb) {
  // this will print { topic: 'hello/my/world', 'something': 'more' }
  console.log(message)
  cb()
})

emitter.on('hello/+', function(message, cb) {
  // this will not be called
  console.log(message)
  cb()
})

emitter.emit({ topic: 'hello/my/world', something: 'more' })
```

The wildcard character `#` matches zero or more words:

```javascript
var mq = require('mqemitter')
  , emitter = mq()

emitter.on('hello/#', function(message, cb) {
  // this will print { topic: 'hello/my/world', 'something': 'more' }
  console.log(message)
  cb()
})

emitter.on('#', function(message, cb) {
  // this will print { topic: 'hello/my/world', 'something': 'more' }
  console.log(message)
  cb()
})

emitter.on('hello/my/world/#', function(message, cb) {
  // this will print { topic: 'hello/my/world', 'something': 'more' }
  console.log(message)
  cb()
})

emitter.emit({ topic: 'hello/my/world', something: 'more' })
```

Of course, you can mix `#` and `+` in the same subscription.

## LICENSE

MIT
