router
========

Node.js module for simplifying http routing for your server without having to sign up for the accompanying framework.  

There are other solutions out there, but they suffer from one of the following problems.
* Over-architected
* Trying to solve routing for the browser and server and need to mature before they are usable (flatiron/director) 
* Tied to a larger framework (express.js)

This routing module is targeted for speed hungry people that want to be closer to the metal.  If you are not that type of person, then use express.js.


# Install
```
npm install -----placeholder-----
```

# Example
This example is in the tests folder.  Here is a simple http router.

``` javascript
var http = require('http'),
	Router = require('../index.js');

var routerFactory = {
	create: function() {
		var router = new Router();

		router.param('zip', /zip-(\d{5})/);
		router.param('item', /(\w*)/);

		router.get('/foo/:zip/:item', function(req, res) {
			res.writeHead(200, { 'Content-Type': 'application/json' });
	        res.write(JSON.stringify(req.params));
	        res.end();
		});

		router.get('/', function(req, res) {
			res.write("Home");
			res.end();
		});

		return router;
	}
};

var server = http.createServer(function (req, res) {
	var router = routerFactory.create();

	router.dispatch(req, res);

});

server.listen(3000);
```