var serialize = require('./lib/serialize')
var parse = require('./lib/parse')
var Options = require('./lib/Options').Options

exports.serialize = serialize.serialize
exports.parse = parse.parse
exports.createSerializer = serialize.createSerializer
exports.createParser = parse.createParser
exports.Options = Options
exports.fetch = require('./fetch').fetch
exports.XMLHttpRequest = require('./xhr').XMLHttpRequest
