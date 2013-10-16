var url = require('url');
var Guid = require('guid');

var HttpContext = function(req, res) {

  // Factory support
  if (!(this instanceof HttpContext)) {
    return new HttpContext(req, res)
  }

  this.request = req;
  this.response = res;
  this.body = null;
  this.params = {};
  this.id = Guid.create();

  this.url = url.parse(req.url, true, true);
};

module.exports = HttpContext;