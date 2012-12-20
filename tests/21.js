require('./post');
var http = require('http'),
	tap = require('tap'),
	test = tap.test;

var options = {
  host: 'localhost',
  port: 3000,
  path: '/thing/123',
  method: 'POST',
  headers: { "Content-Type": "application/x-www-form-urlencoded" }
};

test("test post with multiple params", function(t) {

	var req = http.request(options, function(res) {
		var buf = '';

	  res.on('data', function (chunk) {
	    buf += chunk;
	  });

	  res.on('end', function() {
	  	var json = JSON.parse(buf);
	  	//console.log(buf);

	  	t.ok(json.body.one, "Insure 'one' exists");
	  	t.equals(json.body.one, 'foo', "Check value of 'one'");

	  	t.ok(json.body.two, "Insure 'two' exists");
		t.equals(json.body.two, 'goo', "Check value of 'two'");

	  	t.end();
	  })
	});

	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});

	// write data to request body
	req.write('one=foo&two=goo');
	req.end();

});
