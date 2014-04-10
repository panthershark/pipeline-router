var Router = require('../index.js');
var MockRequest = require('hammock').Request;
var MockResponse = require('hammock').Response;
var assert = require('assert');
var _ = require('lodash');

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

suite('router POST', function() {

  test("test post with multiple params", function(done) {
  	var router = routerFactory.create();
    var body = new Buffer('one=foo&two=goo', 'utf-8');
  	var req = new MockRequest({
          url: '/kitten/bubbles',
          headers: { host: 'localhost', 'content-type': 'application/x-www-form-urlencoded', 'content-length': body.length },
          method: 'POST'
      });
    var res = new MockResponse();	

  	router.dispatch(req, res);

  	// this will write data to request body
  	req.end(body);

    res.on('end', function(err, data) {
    	var json = JSON.parse(data.body);
    	// console.log(data);

    	assert.ok(json.body.one, "ensure 'one' exists");
    	assert.equal(json.body.one, 'foo', "Check value of 'one'");

    	assert.ok(json.body.two, "ensure 'two' exists");
  		assert.equal(json.body.two, 'goo', "Check value of 'two'");

    	done();
    });
  });

  test("test post with multiple params.  json post.", function(done) {
    var router = routerFactory.create();
    var body = new Buffer('{ "one": "foo", "two": "goo" }', 'utf-8');
    var req = new MockRequest({
          url: '/kitten/bubbles',
          headers: { host: 'localhost', 'content-type': 'application/json', 'content-length': body.length },
          method: 'POST'
      });
    var res = new MockResponse(); 

    router.dispatch(req, res);

    // this will write data to request body
    req.end(body);

    res.on('end', function(err, data) {
      var json = JSON.parse(data.body);
      //console.log(buf);

      assert.ok(json.body.one, "ensure 'one' exists");
      assert.equal(json.body.one, 'foo', "Check value of 'one'");

      assert.ok(json.body.two, "ensure 'two' exists");
      assert.equal(json.body.two, 'goo', "Check value of 'two'");

      done();
    });
  });

  test("test POST from route table with GET coming first.", function(done) {
    var router = new Router();
    var handler = function(httpContext) {
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
    };

    var routes = {
      "someGetRoute": {
        "method": "GET",
        "name": "someGetRoute",
        "path": "/someGetRoute",
        "description": "Example GET route",
        "handler": handler,
        "params": {},
        "enabled": true
      },
      "somePostRoute": {
        "method": "POST",
        "name": "somePostRoute",
        "path": "/somePostRoute",
        "description": "Example POST route",
        "handler": handler,
        "params": {},
        "enabled": true
      }      
    };


    _.each(routes, function (route, key) {
      router.use(route.method,route.path,{ timeout: route.timeout },handler);
    });


    var body = new Buffer('{ "one": "foo", "two": "goo" }', 'utf-8');
    var req = new MockRequest({
        url: '/somePostRoute',
        headers: { host: 'localhost', 'content-type': 'application/json', 'content-length': body.length },
        method: 'POST'
    });
    var res = new MockResponse(); 

    router.dispatch(req, res);

    // this will write data to request body
    req.end(body);

    res.on('end', function(err, data) {
      var json = JSON.parse(data.body);

      assert.ok(json.body.one, "ensure 'one' exists");
      assert.equal(json.body.one, 'foo', "Check value of 'one'");

      assert.ok(json.body.two, "ensure 'two' exists");
      assert.equal(json.body.two, 'goo', "Check value of 'two'");

      done();
    });


  });
});
