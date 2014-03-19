#!/usr/bin/env node
/**
 * A machine database that stores information as flat JSON files
 *
 * Author: Dave Eddy <dave@daveeddy.com>
 * Date: 3/17/2014
 * License: MIT
 */

var http = require('http');

var accesslog = require('access-log');
var easyreq = require('easyreq');
var getopt = require('posix-getopt');

var _package = require('./package.json');
var router = require('./router');

function usage() {
  return [
    'Usage: machinedb-server [-d dir] [-h] [-H host] [-n] [-p port] [-u] [-v]',
    '',
    'A machine database that stores information as flat JSON files',
    '',
    'Options',
    '  -d, --dir <dir>    the database directory, defaults to ' + opts.dir,
    '  -h, --help         print this message and exit',
    '  -H, --host <host>  [env MACHINEDB_HOST] the address to bind to, defaults to ' + opts.host,
    '  -n, --no-log       [env MACHINEDB_NOLOG] disable logging, logging is enabled by default',
    '  -p, --port <port>  [env MACHINEDB_PORT] the port to bind to, defaults to ' + opts.port,
    '  -u, --updates      check npm for available updates',
    '  -v, --version      print the version number and exit'
  ].join('\n');
}

// command line arguments
var options = [
  'd:(dir)',
  'h(help)',
  'H:(host)',
  'n(no-log)',
  'p:(port)',
  'u(updates)',
  'v(version)'
].join('');
var parser = new getopt.BasicParser(options, process.argv);

var opts = {
  dir: process.cwd(),
  host: process.env.MACHINEDB_HOST || 'localhost',
  log: !process.env.MACHINEDB_LOG,
  port: process.env.MACHINEDB_PORT || 9000,
};
var option;
while ((option = parser.getopt()) !== undefined) {
  switch (option.option) {
    case 'd': opts.dir = option.optarg; break;
    case 'h': console.log(usage()); process.exit(0);
    case 'H': opts.host = option.optarg; break;
    case 'n': opts.log = false; break;
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

// verify the dir by cd'ing there
try {
  process.chdir(opts.dir);
} catch (e) {
  console.error('cannot cd to %s: %s', opts.dir, e.message);
  console.error('exiting');
  process.exit(1);
}

http.createServer(onrequest).listen(opts.port, opts.host, started);

// server started
function started() {
  console.log('server started on http://%s:%d', opts.host, opts.port);

  // buffer the logs
  var logbuffer = require('log-buffer');
  logbuffer(8192);
  // flush every 2 seconds
  setInterval(logbuffer.flush.bind(logbuffer), 2 * 1000);
}

// request callback
function onrequest(req, res) {
  easyreq(req, res);
  if (opts.log)
    accesslog(req, res);

  // route
  var route;
  try {
    route = router.match(req.urlparsed.normalizedpathname);
  } catch (e) {}
  if (!route)
    return res.notfound();

  // route it
  route.fn(req, res, route.params);
}
