var Router = require('../index'),
    test = require('tap').test,
    request = require('request'),
    http = require('http');

// create a router which simply returns the route string that was matched
var create = function () {
    var router = new Router();

    router.param('id');

    router.get('/books/:id', function (req, res) {
        res.end('/books/:id');
    });

    router.get('/books/:id/pages', function (req, res) {
        res.end('/books/:id/pages');
    });

    return router;
};

test('make sure /books/:id works', function (t) {
    var server = http.createServer(function (req, res) {
        var router = create();

        router.dispatch(req, res);
    }).listen(3000);

    request('http://localhost:3000/books/1', function (error, response, body) {
        t.notOk(error, 'not expecting an error');
        t.equal(body, '/books/:id', 'matched route should be /books/:id');
        server.close(function() {t.end();});
        t.end();
    });
});

test('make sure /books/:id/pages works', function (t) {
    var server = http.createServer(function (req, res) {
        var router = create();

        router.dispatch(req, res);
    }).listen(3000);

    request('http://localhost:3000/books/1/pages', function (error, response, body) {
        t.notOk(error, 'not expecting an error');
        t.equal(body, '/books/:id/pages', 'matched route should be /books/:id/pages');
        server.close(function () {t.end();})
    });
});

// process.exit();