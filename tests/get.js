var Router = require('../index.js');
var MockRequest = require('hammock').Request;
var MockResponse = require('hammock').Response;
var util = require("util");
var assert = require('assert');

var routerFactory = {
  create: function() {
    var router = new Router();

    router.param('zip', /zip-(\d{5})/);
    router.param('item', /(\w+)/);
    router.qparam('puppy', /(true|false)/);


    router.get('/foo/:zip/dogs', { query: ['puppy'] }, function(httpContext) {
      var req = httpContext.request, 
          res = httpContext.response;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({
        restparams: httpContext.params,
        queryparams: httpContext.query
      }));
      res.end();
    });

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

suite('router GET', function() {
  test('Home route', function(done) {
    var router = routerFactory.create();
    var req = new MockRequest({
          url: '/',
          headers: { host: 'localhost' },
          method: 'GET'
      });
    var res = new MockResponse(); 

    res.on('end', function(err, data) {
      
      assert.ifError(err, 'Should not return err');
      assert.equal(data.body, 'Home', 'Home body should match gold.');
      done();
    });

    router.on('match', function(data) {
      // console.log(util.inspect(data));

      assert.ok(data.httpContext, 'Context should exist');
      assert.ok(data.matched, 'Route should match');
    });
    
    router.dispatch(req, res);
  });

  test('Restful route', function(done) {
    var router = routerFactory.create();
    var req = new MockRequest({
          url: '/foo/zip-12345/puppies',
          headers: { host: 'localhost' },
          method: 'GET'
      });
    var res = new MockResponse(); 

    res.on('end', function(err, data) {

      assert.ifError(err, 'Should not return err');
      assert.deepEqual(JSON.parse(data.body), { zip: '12345', item: 'puppies' }, 'Returned object from route should match gold.');
      done();

    });

    router.on('match', function(data) {
      // console.log(util.inspect(data));

      assert.ok(data.httpContext, 'Context should exist');
      assert.ok(data.matched, 'Route should match');
    });

    router.dispatch(req, res);
  });

  test('Restful route with querystring validation - valid', function(done) {
    var router = routerFactory.create();
    var req = new MockRequest({
          url: '/foo/zip-12345/dogs?puppy=true',
          headers: { host: 'localhost' },
          method: 'GET'
      });
    var res = new MockResponse(); 

    res.on('end', function(err, data) {

      assert.ifError(err, 'Should not return err');
      assert.deepEqual(JSON.parse(data.body), { restparams: { zip: '12345' }, queryparams: { puppy: 'true' }}, 'Returned object from route should match gold.');
      done();

    });

    router.on('match', function(data) {
      // console.log(util.inspect(data));

      assert.ok(data.httpContext, 'Context should exist');
      assert.ok(data.matched, 'Route should match');
    });

    router.dispatch(req, res);
  });

  test('Restful route with querystring validation - invalid query value', function(done) {
    var router = routerFactory.create();
    var req = new MockRequest({
          url: '/foo/zip-12345/dogs?puppy=thisisnotok',
          headers: { host: 'localhost' },
          method: 'GET'
      });
    var res = new MockResponse(); 

    res.on('end', function(err, data) {

      assert.ifError(err, 'Should not return err');

      // gold value is the return of the item route, not the dogs route.
      assert.deepEqual(JSON.parse(data.body), {"zip":"12345","item":"dogs"}, 'Returned object from route should match gold.');
      done();

    });

    router.on('match', function(data) {
      // console.log(util.inspect(data));

      assert.ok(data.httpContext, 'Context should exist');
      assert.ok(data.matched, 'Route should match');
    });

    router.dispatch(req, res);
  });

  test('Restful route with querystring validation - omitted query value', function(done) {
    var router = routerFactory.create();
    var req = new MockRequest({
          url: '/foo/zip-12345/dogs',
          headers: { host: 'localhost' },
          method: 'GET'
      });
    var res = new MockResponse(); 

    res.on('end', function(err, data) {

      assert.ifError(err, 'Should not return err');

      // gold value is the return of the item route, not the dogs route.
      assert.deepEqual(JSON.parse(data.body), {"zip":"12345","item":"dogs"}, 'Returned object from route should match gold.');
      done();

    });

    router.on('match', function(data) {
      // console.log(util.inspect(data));

      assert.ok(data.httpContext, 'Context should exist');
      assert.ok(data.matched, 'Route should match');
    });

    router.dispatch(req, res);
  });
});