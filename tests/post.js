var http = require('http'),
	Router = require('../index.js');

var routerFactory = {
	create: function() {
		var router = new Router();

		router.param('id', /(\w+)/);

		router.post('/thing/:id', function(req, res) {
			res.writeHead(200, { 'Content-Type': 'application/json' });
	        res.write(
	        	JSON.stringify({
					query: req.params,
					body: req.body
				})
			);
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