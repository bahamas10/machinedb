var version = 'v' + require('../package.json').version;
var started = Date.now();

module.exports = stats;

function stats(req, res) {
  var ret = {
    arch: process.arch,
    dir: process.cwd(),
    machinedbversion: version,
    mem: process.memoryUsage(),
    nodeversion: process.version,
    now: Date.now(),
    pid: process.pid,
    platform: process.platform,
    started: started
  };
  res.json(ret);
}
