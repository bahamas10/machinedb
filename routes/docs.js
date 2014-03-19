var homepage = require('../package.json').homepage;

module.exports = docs;

function docs(req, res) {
  res.redirect(homepage);
}
