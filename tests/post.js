var Router = require('../index.js');
var MockRequest = require('hammock').Request;
var MockResponse = require('hammock').Response;
var test = require('tape').test;

var routerFactory = {
	create: function() {
		var router = new Router();

		router.param('name', /(\w+)/);

		router.post('/kitten/:name', function(httpContext) {
			var req = httpContext.request, 
					res = httpContext.response;
					
			res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(
      	JSON.stringify({
					params: httpContext.params,
					query: httpContext.query,
					body: httpContext.body
				})
			);
      res.end();
		});

		return router;
	}
};

test("test post with multiple params", function(t) {
	var router = routerFactory.create();
	var req = new MockRequest({
        url: '/kitten/bubbles',
        headers: { host: 'localhost', 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        body: 'one=foo&two=goo'
    });
  var res = new MockResponse();	

	router.dispatch(req, res);

	// this will write data to request body
	req.end();

  res.on('end', function(err, data) {
  	var json = JSON.parse(data.body);
  	//console.log(buf);

  	t.ok(json.body.one, "ensure 'one' exists");
  	t.equals(json.body.one, 'foo', "Check value of 'one'");

  	t.ok(json.body.two, "ensure 'two' exists");
		t.equals(json.body.two, 'goo', "Check value of 'two'");

  	t.end();
  });


});
