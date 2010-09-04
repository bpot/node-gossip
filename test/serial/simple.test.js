var Gossiper = require('gossiper').Gossiper;

module.exports = {
  'basic test' : function(assert, beforeExit) {
    var seed = new Gossiper(7000, []);
    seed.start();

    var g1 = new Gossiper(7001, ['127.0.0.1:7000']);
    g1.start();
    g1.setLocalState('holla','at');

    var g2 = new Gossiper(7002, ['127.0.0.1:7000']);
    g2.start();
    g2.setLocalState('your','node');

    setTimeout(function() {
      seed.stop();
      g1.stop();
      g2.stop();
    }, 10000);

    beforeExit(function() {
      assert.equal('node', g1.peerValue('127.0.0.1:7002', 'your'));
      assert.equal('node', g2.peerValue('127.0.0.1:7002', 'your'));
      assert.equal('node', seed.peerValue('127.0.0.1:7002', 'your'));
      assert.equal('at', g2.peerValue('127.0.0.1:7001', 'holla'));
    });
  }

}
