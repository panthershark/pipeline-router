var util = require("util"),
    events = require('events'),
    url = require('url'),
    _ = require('lodash'),
    bodyParser = require('connect').bodyParser(),
    pipeline = require('node-pipeline');

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
        var res = results[0].res;

        if (err && res.socket.bytesWritten == 0) {    
            res.writeHead(404);
            res.end("No matching route");
        }
    });

    req.urlParsed = url.parse( req.headers.host + req.url);

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
        var req = data[0].req,
            res = data[0].res,
            url = req.urlParsed.pathname;

        if ( req.method === options.method && options.urlformat.test(url) ) {
            
            // stop trying to match
            next(null, options);

            // send to handler
            req.params = that.parseUrl(url, options.paramMap);

            // parse body on post
            if (req.method == 'POST') {
                bodyParser(req, res, function() {
                    callback(req, res);
                });
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
Router.prototype.parseParams = function(s) {
    var restParams = s ? s.split('/') : [],
        that = this,
        paramMap = [],
        urlformat = [];

    // replace named params with corresponding regexs and build paramMap.
    _.each(restParams, function(str, i) {
        var param = _.find(that.params, function(p) { return str === ':' + p.name; });

        if (param) {
            paramMap.push(param);
            var rstr = param.regex.toString();
            urlformat.push(rstr.substring(1, rstr.length - 1));
        }
        else {
            paramMap.push(null);
            urlformat.push(str);
        }
    });

    return {
        urlformat: new RegExp('^' + urlformat.join('\\/') + '$'),
        paramMap: paramMap
    };
};

module.exports = Router;