#!/usr/bin/env node
/**
 * machinedb command line utility
 *
 * Author: Dave Eddy <dave@daveeddy.com>
 * Date: 3/17/2014
 * License: MIT
 */

var fs = require('fs');
var http = require('http');
var spawn = require('child_process').spawn;

var getopt = require('posix-getopt');
var tmp = require('tmp');

var _package = require('./package.json');

function usage() {
  return [
    'Usage: machinedb [-h] [-H host] [-p port] [-u] [-v]',
    '',
    'machinedb command line utility',
    '',
    'Examples',
    '  machinedb                 # same as GET /nodes',
    '  machinedb list            # list all nodes separated by newlines',
    '  machinedb show <node>     # same as GET /nodes/<node>',
    '  machinedb create <node>   # create a node by name <node>, reads JSON from stdin',
    '  machinedb update <node>   # update a node by name <node>, reads JSON from stdin',
    '  machinedb edit <node>     # edit a node by opening $EDITOR on the JSON returned by the server',
    '  machinedb delet <node>    # remove a node',
    '',
    'Options',
    '  -h, --help         print this message and exit',
    '  -H, --host <host>  [env MACHINEDB_HOST] the address to bind to, defaults to ' + opts.host,
    '  -p, --port <port>  [env MACHINEDB_PORT] the port to bind to, defaults to ' + opts.port,
    '  -u, --updates      check npm for available updates',
    '  -v, --version      print the version number and exit'
  ].join('\n');
}

// command line arguments
var options = [
  'h(help)',
  'H:(host)',
  'p:(port)',
  'u(updates)',
  'v(version)'
].join('');
var parser = new getopt.BasicParser(options, process.argv);

var opts = {
  host: process.env.MACHINEDB_HOST || 'localhost',
  port: process.env.MACHINEDB_PORT || 9000,
};
var option;
while ((option = parser.getopt()) !== undefined) {
  switch (option.option) {
    case 'h': console.log(usage()); process.exit(0);
    case 'H': opts.host = option.optarg; break;
    case 'p': opts.port = +option.optarg; break;
    case 'u': // check for updates
      require('latest').checkupdate(_package, function(ret, msg) {
        console.log(msg);
        process.exit(ret);
      });
      return;
    case 'v': console.log(_package.version); process.exit(0);
    default: console.error(usage()); process.exit(1);
  }
}

var args = process.argv.slice(parser.optind());

opts.method = 'GET';
opts.path = '/nodes/';
var data = '';

var node = args[1];
if (node)
  opts.path += encodeURIComponent(node);

switch (args[0]) {
  case 'create':
  case 'update':
    if (!node) {
      console.error('a node name must be specified');
      process.exit(1);
    }

    opts.method = 'PUT';
    var d = fs.readFileSync('/dev/stdin', 'utf-8');
    try {
      data = JSON.stringify(JSON.parse(d), null, 2);
    } catch(e) {
      console.error('failed to parse JSON');
      process.exit(1);
    }
    break;
  case 'delete':
    if (!node) {
      console.error('a node name must be specified');
      process.exit(1);
    }

    opts.method = 'DELETE';
    break;
}

var req = http.request(opts, function(res) {
  res.setEncoding('utf-8');
  var d = '';
  res.on('data', function(data) {
    d += data;
  });
  res.on('end', function() {
    var trimmed = (d || '').trim();
    if (res.statusCode !== 200) {
      console.error('%s %s failed with %d', opts.method, opts.path, res.statusCode);
      console.error(trimmed);
      process.exit(1);
    }
    var data;
    try {
      data = JSON.parse(d);
    } catch(e) {
      console.error('failed to parse response as JSON');
      console.error(trimmed);
      throw e;
    }

    switch (args[0]) {
      case 'list':
        console.log(data.map(function(n) { return n.name; }).join('\n'));
        break;
      case 'edit':
        if (!node) {
          console.error('a node name must be specified with `edit`');
          process.exit(1);
        }

        // create a tempfile
        tmp.file({postfix: '.json'}, function(err, path, fd) {
          if (err)
            throw err;

          // write the data to a tempfile
          fs.writeSync(fd, JSON.stringify(data, null, 2));
          process.stdin.pause();
          // now fork the editor on the file
          var child = spawn(process.env.EDITOR || 'vim', [path], {stdio: 'inherit'});
          child.on('exit', function(code) {
            if (code !== 0) {
              console.error('child process failed');
              process.exit(1);
            }

            // read the tempfile back in and parse it as JSON
            var filedata = fs.readFileSync(path, 'utf-8');
            var data;
            try {
              data = JSON.parse(filedata);
            } catch(e) {
              console.error('failed to parse JSON');
              process.exit(1);
            }

            // send the data back to the server
            opts.method = 'PUT';
            var req = http.request(opts, function(res) {
              res.setEncoding('utf-8');
              var d = '';
              res.on('data', function(data) {
                d += data;
              });
              res.on('end', function() {
                var trimmed = (d || '').trim();
                if (res.statusCode !== 200) {
                  console.error('%s %s failed with %d', opts.method, opts.path, res.statusCode);
                  console.error(trimmed);
                  process.exit(1);
                }

                try {
                  console.log(JSON.stringify(JSON.parse(d), null, 2));
                } catch(e) {
                  console.log(trimmed);
                }

                process.exit(0);
              });
            });
            req.on('error', function(e) {
              throw e;
            });
            req.end(JSON.stringify(data, null, 2));
          });
        });
        break;
      case 'show':
      default:
        console.log(JSON.stringify(data, null, 2));
        break;
    }
  });
});
req.on('error', function(e) {
  throw e;
});
req.end(data);
