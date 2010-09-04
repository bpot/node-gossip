var PeerState = require('peer_state').PeerState;
module.exports = {
  // UpdateWithDelta
  "updateWithDelta should set key to value" : function(assert) {
    var ps = new PeerState();
    ps.updateWithDelta('a', 'hello', 12);
    assert.equal('hello', ps.getValue('a'));
  },

  "updateWithDelta should update the max version" : function(assert) {
    var ps = new PeerState();
    ps.updateWithDelta('a', 'hello', 12);
    ps.updateWithDelta('a', 'hello', 14);
    assert.equal(14, ps.max_version_seen);
  },

  "updates should trigger 'update' event" : function(assert, beforeExit) {
    var ps = new PeerState();
    var n = 0;
    ps.on('update', function(k,v) {
      ++n;
      assert.equal('a', k);
      assert.equal('hello', v);
    });
    ps.updateWithDelta('a', 'hello', 12);
    beforeExit(function() { assert.equal(1, n) });
  },

  // updateLocal
  "updateLocal should set key to value" : function(assert) {
    var ps = new PeerState();
    ps.updateLocal('a', 'hello', 12);
    assert.equal('hello', ps.getValue('a'));
  },

  "updateLocal should increment the max version" : function(assert) {
    var ps = new PeerState();
    ps.updateLocal('a', 'hello');
    ps.updateLocal('a', 'hello');
    assert.equal(2, ps.max_version_seen);
  },

  // deltasAfterVersion
  "deltasAfterVersion should return all deltas after a version number" : function(assert) {
    var ps = new PeerState();
    ps.updateLocal('a', 1);
    ps.updateLocal('b', 'blah');
    ps.updateLocal('a', 'super');
    assert.deepEqual([['a','super','3']], ps.deltasAfterVersion(2));
  }
}
