var util = require("util"),
    events = require('events'),
    url = require('url'),
    _ = require('lodash'),
    pipeline = require('node-pipeline'),
    formaline = require('formaline');

var Router = function() {
    var that = this;

    this.plRouter = pipeline.create();
    this.params = [];

    this.plRouter.on('error', function(err, results){ 
        if (err) {
            that.emit('error', err, results);
        }
    });
}; 

util.inherits(Router, events.EventEmitter);

Router.prototype.dispatch = function(req, res) {

    this.plRouter.on('end', function(err, results) {
        var matched = results[0].matched,
            res = results[0].res;

        if (!matched || err) {    
            res.statusCode = 404;
            res.write("No matching route or failed route");
            res.end(err ? err.stack : '');
        }
    });

    // 'http://' is required as of 0.8.5
    req.urlParsed = url.parse( 'http://' + req.headers.host.replace(/:\d+/, '') + req.url, true, true);

    this.plRouter.execute({ 
        req: req,
        res: res
    });
};
Router.prototype.use = function(method, urlformat, callback) {
    var options = {},
        that = this;

    options.callback = _.last(arguments);
    options.method = method.toUpperCase();

    // support plain old regex
    if (urlformat instanceof RegExp) {
        options.urlformat = urlformat;
    }
    else {
        _.extend(options, this.parseParams(urlformat));
    }

    this.plRouter.use(function(data, next) {
        var matched = data[0].matched,
            req = data[0].req,
            res = data[0].res,
            pathname = req.urlParsed.pathname;

        if ( !matched && req.method === options.method && options.urlformat.test(pathname) ) {
            
            // stop trying to match
            data[0].matched = true;
            next(null, options);

            // send to handler
            req.params = that.parseUrl(pathname, options.paramMap);
            req.query = req.urlParsed.query;

            // parse body on post
            if (req.method == 'POST') {
                var form = new formaline({});
                form.on('load', function() {
                    req.body = arguments;
                    callback(req, res);
                })
                .on('error', function(err) {
                    req.body = err;
                    callback(req, res);
                })
                .parse(req, res);
            }
            else {
                callback(req, res);
            }
        }
        else {
            next();
        }
    });
};
Router.prototype.get = function(urlformat, callback) {
    Array.prototype.splice.call(arguments, 0, 0, 'get');
    return this.use.apply(this, arguments);
};
Router.prototype.post = function(urlformat, callback) {
    Array.prototype.splice.call(arguments, 0, 0, 'post');
    return this.use.apply(this, arguments);
};
Router.prototype.param = function(name, regex) {
    this.params.push({ name: name, regex: regex });
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
                ret[pmap.name] = _.last(m);
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
        var param = _.find(that.params, function(p) { return str.substring(1) === ':' + p.name; });

        if (param) {
            paramMap.push(param);
            var rstr = param.regex.toString();
            urlformat.push('\\/' + (str[0] === '?' ? '?' : '')); // push separator (double backslash escapes the ? or /)
            urlformat.push(rstr.substring(1, rstr.length - 1));  // push regex
        }
        else {
            paramMap.push(null);
            urlformat.push(str);
        }
    });

    return {
        urlformat: new RegExp('^' + urlformat.join('') + '$'),
        paramMap: paramMap
    };
};

module.exports = Router;