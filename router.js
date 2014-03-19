var router = new require('routes').Router();

module.exports = router;

router.addRoute('/', require('./routes/index'));

router.addRoute('/nodes/*?', require('./routes/nodes'));

router.addRoute('/docs', require('./routes/docs'));
router.addRoute('/ping', require('./routes/ping'));
router.addRoute('/stats', require('./routes/stats'));
