var Router = require('../index.js');
var MockRequest = require('hammock').Request;
var MockResponse = require('hammock').Response;
var test = require('tape').test;

var routerFactory = {
	create: function() {
		var router = new Router();

		router.param('zip', /zip-(\d{5})/);
		router.param('item', /(\w+)/);

		router.get('/foo/:zip/:item', function(httpContext) {
			var req = httpContext.request, 
					res = httpContext.response;

			res.writeHead(200, { 'Content-Type': 'application/json' });
	    res.write(JSON.stringify(httpContext.params));
	    res.end();
		});

		router.get('/', function(httpContext) {
			var req = httpContext.request, 
					res = httpContext.response;

			res.write("Home");
			res.end();
		});

		return router;
	}
};

test('Home route', function(t) {
	var router = routerFactory.create();
	var req = new MockRequest({
        url: '/',
        headers: { host: 'localhost' },
        method: 'GET'
    });
  var res = new MockResponse();	

  res.on('end', function(err, data) {
  	
  	t.notOk(err, 'Should not return err');
  	t.equal(data.body, 'Home', 'Home body should match gold.');
  	t.end();
  });

	router.dispatch(req, res);
});

test('Restful route', function(t) {
	var router = routerFactory.create();
	var req = new MockRequest({
        url: '/foo/zip-12345/puppies',
        headers: { host: 'localhost' },
        method: 'GET'
    });
  var res = new MockResponse();	

  res.on('end', function(err, data) {

  	t.notOk(err, 'Should not return err');
  	t.deepEqual(JSON.parse(data.body), { zip: '12345', item: 'puppies' }, 'Returned object from route should match gold.');
  	t.end();

  });

	router.dispatch(req, res);
});

