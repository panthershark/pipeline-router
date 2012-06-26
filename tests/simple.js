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