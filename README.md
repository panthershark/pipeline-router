router
======

Node.js module for simplifying http routing for your server without having to sign up for the accompanying framework.  

This project strives to be a straight forward routing solution for common http applications where you need to parse urls and then activate some chain of logic.  Many other options either come with a much bigger framework or are trying to solve a bigger problem (like client side routing).

This routing module is targeted for speed hungry people that want to be closer to the metal.  If you are not that type of person, then use express.js.

[![browser support](https://ci.testling.com/tommydudebreaux/pipeline-router.png)](https://ci.testling.com/tommydudebreaux/pipeline-router)


# Install
```
npm install pipeline-router
```

# Example
This example is in the tests folder.  Here is a simple http router.

``` javascript
var http = require('http'),
	Router = require('pipeline-router');

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