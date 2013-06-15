var url = require('url');

var HttpContext = function(req, res) {

  // Factory support
  if (!(this instanceof HttpContext)) {
    return new HttpContext(req, res)
  }

  this.request = req;
  this.response = res;
  this.body = null;
  this.params = {};

  // 'http://' is required as of 0.8.5
  this.url = url.parse( 'http://' + req.headers.host.replace(/:\d+/, '') + req.url, true, true);

};

module.exports = HttpContext;

