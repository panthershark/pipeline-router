var _ = require('lodash'),
    bodyParser = require('connect').bodyParser(),
	pipeline = require('node-pipeline');

var Router = function() {
    this.plRouter = pipeline.create();
    this.params = [];

    this.plRouter.on('end', function(err, data){ 
    	if (!err || !err.success) {
    		var res = data[0].res;
            res.writeHead(404);
            res.end("No matching route");
    	}
    });
}; 

Router.prototype = { 
	dispatch: function(req, res) {
		this.plRouter.execute({ 
			req: req,
			res: res
		});
	},
    on: function(method, urlformat, callback) {
        var options = {},
        	that = this;

        options.callback = _.last(arguments);
        options.method = method.toUpperCase();
        options.success = false;

        // support plain old regex
        if (urlformat instanceof RegExp) {
        	options.urlformat = urlformat;
        }
        else {
        	_.extend(options, this.parseParams(urlformat));
        }

        this.plRouter.use(function(data, next) {
            var req = data[0].req,
                res = data[0].res;

            if ( req.method === options.method && options.urlformat.test(req.url) ) {
                
                // stop trying to match
                options.success = true;
                next({ message: "Matched route", success: true }, options);

                // send to handler
                req.params = that.parseUrl(req.url, options.paramMap);

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
    },
    get: function(urlformat, callback) {
    	Array.prototype.splice.call(arguments, 0, 0, 'get');
        return this.on.apply(this, arguments);
    },
    post: function(urlformat, callback) {
        Array.prototype.splice.call(arguments, 0, 0, 'post');
        return this.on.apply(this, arguments);
    },
    param: function(name, regex) {
        this.params.push({ name: name, regex: regex });
    },
    parseUrl: function(url, paramMap) {
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

    },
    parseParams: function(s) {
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
    }
};

module.exports = Router;