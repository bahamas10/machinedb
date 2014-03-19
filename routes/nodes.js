var fs = require('fs');

var staticroute = require('static-route')({
  slice: '/nodes'
});

module.exports = nodes;

function nodes(req, res) {
  var uri;
  try {
    uri = decodeURIComponent(req.urlparsed.pathname);
  } catch(e) {
    res.json({error: 'failed to decode URI'}, 400);
    return;
  }
  var file = uri.replace(/^\/nodes\//, '');

  if (!file) {
    // they requested '/nodes', give them all the nodes
    getAllNodes(function(err, data) {
      if (err)
        return res.error();

      res.json(data);
    });
    return;
  }

  // validate key
  if (!safekey(file)) {
    res.json({error: 'key contains illegal characters'}, 400);
    return;
  }

  // check HTTP method
  switch (req.method) {
    case 'HEAD':
    case 'GET':
      // rely on static-route for this
      staticroute(req, res);
      break;
    case 'PUT':
      var ws = fs.createWriteStream(file);

      req.pipe(ws);

      ws.on('close', function() {
        res.json({message: 'saved', status: 'ok'});
      });

      ws.on('error', function(err) {
        res.json({error: err.message, code: err.code}, 500);
        ws.destroy();
      });

      break;
    case 'DELETE':
      fs.unlink(file, function(err) {
        if (err) {
          var code = err.code === 'ENOENT' ? 404 : 500;
          res.json({error: err.message, code: err.code}, code);
        } else {
          res.json({message: 'deleted', status: 'ok'});
        }
      });
      break;
    default:
      res.json({error: 'unsupported HTTP method'}, 501);
      break;
  }
}

// check if a key is safe
function safekey(key) {
  return key && key.indexOf('/') === -1 && key.indexOf('\\') === -1 && key.indexOf('\0') === -1;
}

// TODO super basic caching
function getAllNodes(cb) {
  var data = [];
  fs.readdir('.', function(e, d) {
    if (e)
      return cb(e);
    var len = d.length;
    var i = 0;
    if (i === len)
      return cb(null, []);
    d.forEach(function(fname) {
      if (fname[0] === '.')
        return done();
      fs.readFile(fname, 'utf-8', function(e, filedata) {
        if (e)
          return done();

        var d;
        try {
          d = JSON.parse(filedata);
          d.name = fname;
        } catch(e) {}

        if (d)
          data.push(d);

        done();

      });
      function done() {
        if (++i === len)
          cb(null, data);
      }
    });
  });
}
