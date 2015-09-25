'use strict'

var Struct = require('observ-struct')
var Observ = require('observ')
var Path = require('observ-path')
var watch = require('observ/watch')
var createStore = require('weakmap-shim/create-store')
var Event = require('weakmap-event')
var series = require('run-series')
var partial = require('ap').partial
var Table = require('./table')

module.exports = Router

function Router (data) {
  data = data || {}

  var state = Struct({
    path: Path(data.path),
    listening: Observ(false),
    active: Observ()
  })

  store(state).table = Table()

  return state
}

Router.listen = function listen (state) {
  if (state.listening()) return

  var table = routes(state)

  return watch(state.path, function onPath (path) {
    var match = routes(state).match(path)

    if (!match) {
      return NotFoundEvent.broadcast(state, {
        path: path
      })
    }

    var hooks = table.get(match.key).hooks()

    series(hooks.map(function (hook) {
      return partial(hook, match.params)
    }), done)

    function done (err) {
      if (err) return ErrorEvent.broadcast(state, err)
      store(match.key).render = match.render
      state.active.set(match.key)
    }
  })
}

var NotFoundEvent = Event()
Router.onNotFound = NotFoundEvent.listen

var ErrorEvent = Event()
Router.onError = ErrorEvent.listen

var store = createStore()

Router.route = function route (state, options) {
  return routes(state).add(options)
}

Router.hook = function hook (state, route, callback) {
  routes(state).get(route).hook(callback)
}

Router.render = function render (state) {
  if (!state.active) return
  return store(state.active).render()
}

function routes (state) {
  return store(state).table
}
