var util = require("util"),
  events = require('events'),
  _ = require('lodash'),
  path = require('path'),
  HttpContext = require('./lib/httpcontext.js'),
  pipeline = require('node-pipeline'),
  formidable = require('formidable'),
  mkdirp = require('mkdirp'),
  fs = require('fs');

var Router = function() {
  var that = this;
  this.plRouter = pipeline.create();
  this.reset();
  this.uploadDir = '';

  try {
    this.uploadDir = path.join(process.cwd(), '/tmp/fileuploads');
  } catch (e) {}

  this.on('body', function() {
    that.parsed = true;
  });

  this.plRouter.on('error', function(err, results) {
    if (err) {
      that.emit('error', err, results);
    }
  });

};

util.inherits(Router, events.EventEmitter);

Router.prototype.reset = function() {
  this.plRouter.reset();
  this.params = [];
  this.query = null;
  this.parsed = false;
  this.httpContext = null;
  this.timeout = 120000; // same as node socket timeout
};

Router.prototype.dispatch = function(request, response) {
  this.reset(); // reset everything.
  var that = this;
  var httpContext = this.httpContext = new HttpContext(request, response);

  httpContext.format = {}; // initialize format object

  // parse body on post
  if (/(POST|PUT)/i.test(httpContext.request.method) && /(urlencoded|json|multipart\/form-data)/i.test(httpContext.request.headers['content-type'])) {
    var form = new formidable.IncomingForm();

    if (!fs.existsSync(that.uploadDir)) {
      mkdirp.sync(that.uploadDir);
    }

    form.uploadDir = that.uploadDir;

    form.on('field', function(field, value) {
      httpContext.body = httpContext.body || {};
      httpContext.body[field] = value;
    });

    form.on('error', function(err) {
      httpContext.body = err;
      that.emit('body', err);
    });

    form.on('file', function(name, file) {
      httpContext.files = httpContext.files || [];
      httpContext.files.push({
        name: file.name,
        file: file
      });
    });

    form.on('end', function() {
      that.emit('body', httpContext.body);
    });

    form.parse(httpContext.request);
  } else {
    httpContext.body = [];

    httpContext.request.on('data', function(chunk) {
      httpContext.body.push(chunk);
    });

    httpContext.request.on('end', function() {
      httpContext.body = Buffer.concat(httpContext.body);
      that.emit('body', httpContext.body);
    });
  }


  this.plRouter.on('end', function(err, results) {
    var matched = results[0].matched,
      res = results[0].httpContext.response;

    that.emit('end', err, results);

    if ((!matched || err) && res) {
      res.statusCode = 404;
      res.write("No matching route or failed route");
      res.end(err ? err.stack : '');
    }
  });

  this.plRouter.execute({
    httpContext: httpContext
  });
};



Router.prototype.use = function(method, urlformat, options, formats, handle) {
  var options = options || {},
    that = this;
  
  options.handle = _.last(arguments);
  options.method = method.toUpperCase();
  options.query = _.pick(this.query, options.query);
  options.formats = formats;

  if (options.timeout == null) {
    options.timeout = this.timeout; // default 30s timeout
  }

  // support plain old regex
  if (urlformat instanceof RegExp) {
    options.urlformat = urlformat;
  } else {
    _.extend(options, this.parseParams(urlformat));
  }

  var emitEvaluateEvent = function(httpContext, matched) {
    var data = {
      method: method,
      urlformat: urlformat,
      options: options,
      httpContext: httpContext,
      matched: matched
    };

    that.emit('evaluate', data);

    if (matched) {
      that.emit('match', data);
      that.plRouter.end();
    }
  };

  this.plRouter.use(function(data, next) {
    var matched = data[0].matched,
      httpContext = data[0].httpContext,
      fragment = null;

    // quick fail check
    if (matched || httpContext.request.method !== options.method) {

      // check if httpContext.request.method isn't HEAD and router method isn't GET
        if (httpContext.request.method != 'HEAD' || options.method != 'GET') {
            next();
            return;
        }
        else {
            // HEAD method is identical to GET but MUST NOT return a message-body in the response
            httpContext.response._hasBody = false;
        }
    }

    // check if we have formats field in router config - example "formats": ["json, html, txt, xml"],
    if (!_.isUndefined(options.formats) && _.isArray(options.formats) && !_.isEmpty(options.formats)) {

      _.forEach(options.formats, function(format) {

        var dotFormat = "." + format; // .json OR .html (/car-dealer/CA/Acura.html OR /car-dealer/CA/Acura.js)
        var dotFormatIndex = httpContext.url.pathname.indexOf(dotFormat); // index of current format

        // if current format is part of httpContext.url.pathname (/car-dealer/CA/Acura.json)
        if (dotFormatIndex !== -1) {

          // set format type to httpContext
          httpContext.format[format] = true;

          // remove dotFormat from path and pathname (/car-dealer/CA/Acura)
          httpContext.url.pathname = httpContext.url.pathname.substr(0, dotFormatIndex);
          httpContext.url.path = httpContext.url.path.substr(0, dotFormatIndex);
        }
      });
    }

    // evaluate hash for rest match
    if (httpContext.url.hash && options.urlformat.test(httpContext.url.hash.slice(1))) {
      // hash matched. lets set flag
      matched = true;
      fragment = httpContext.url.hash.slice(1);
    }

    // evaluate pathname for rest match
    else if (options.urlformat.test(httpContext.url.pathname)) {
      // pathname matched. lets set flag
      matched = true;
      fragment = httpContext.url.pathname;
    }


    if (matched) {
      // validate query against params.  if any of the regex fail, then matched will change to false.
      _.each(options.query, function(regex, key) {
        matched = matched && regex.test(httpContext.url.query[key]);
      });
    }

    // stop trying to match if query matched too
    if (matched) {
      httpContext.query = httpContext.url.query;
      data[0].matched = true;
      next(null, options);

      // send to handler
      httpContext.params = that.parseUrl(fragment, options.paramMap);
      emitEvaluateEvent(httpContext, true);

      if (options.timeout) {
        var res = httpContext.response;

        if (res) {
          var resTimeout = setTimeout(function() {

            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/html'
              });
            }
            res.end('Request timed out');

          }, options.timeout);

          res.on('finish', clearTimeout.bind(null, resTimeout));
        }
      }

      if (/(POST|PUT)/i.test(httpContext.request.method) && !that.parsed) {
        that.on('body', function() {
          options.handle(httpContext);
        });
      } else {
        options.handle(httpContext);
      }
    } else {
      emitEvaluateEvent(httpContext, false);
      next();
    }
  });
};
Router.prototype.get = function(urlformat, options, callback) {
  Array.prototype.splice.call(arguments, 0, 0, 'get');
  return this.use.apply(this, arguments);
};
Router.prototype.post = function(urlformat, options, callback) {
  Array.prototype.splice.call(arguments, 0, 0, 'post');
  return this.use.apply(this, arguments);
};
Router.prototype.param = function(arg0, arg1) {
  var params = [];

  if (_.isArray(arg0)) {
    params = arg0;
  } else {
    // insert the single param to the array for concat below.
    params.push({
      name: arg0,
      regex: arg1
    });
  }

  // convert nulls and strings to regex
  _.each(params, function(p) {
    // default null vals to catch all regex.
    if (p.regex == null) {
      p.regex = /(.*)/;
    }
    // convert string vals to regex.
    else if (_.isString(p.regex)) {
      p.regex = new RegExp(p.regex);
    }
  });

  // add to the array of params for this instance
  this.params = this.params.concat(params);
};



Router.prototype.parseUrl = function(url, paramMap) {
  var restParams = url.split('/'),
    ret = {},
    that = this;

  if (restParams[0] === "") {
    restParams.splice(0, 1);
  }

  _.each(paramMap, function(pmap, i) {
    var param = restParams[i];
    if (param && pmap) {
      var m = pmap.regex.exec(param);
      if (m) {
        ret[pmap.name] = decodeURIComponent(_.last(m));
      }
    }
  });

  return ret;

};
/** ------- **/

var regexSplit = /(\?|\/)([^\?^\/]+)/g;
Router.prototype.parseParams = function(s) {
  s = s || '';

  var restParams = s.match(regexSplit),
    that = this,
    paramMap = [],
    urlformat = [];

  if (!restParams || restParams.length === 0) {
    restParams = [s];
  }

  // replace named params with corresponding regexs and build paramMap.
  _.each(restParams, function(str, i) {
    var param = _.find(that.params, function(p) {
      return str.substring(1) === ':' + p.name;
    });

    if (param) {
      paramMap.push(param);
      var rstr = param.regex.toString();
      urlformat.push('\\/' + (str[0] === '?' ? '?' : '')); // push separator (double backslash escapes the ? or /)
      urlformat.push(rstr.substring(1, rstr.length - 1)); // push regex
    } else {
      paramMap.push(null);
      urlformat.push(str);
    }
  });

  return {
    urlformat: new RegExp('^' + urlformat.join('') + '$'),
    paramMap: paramMap
  };
};

Router.prototype.qparam = function(name, regex) {
  this.query = this.query || {};
  this.query[name] = regex;
};

module.exports = Router;