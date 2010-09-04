var Gossiper = require('gossiper').Gossiper,
    PeerState = require('peer_state').PeerState;

module.exports = {
  'should be able to set and retrieve local state' : function(assert) {
    var g = new Gossiper();
    g.setLocalState('hi', 'hello');
    assert.equal('hello', g.getLocalState('hi'));
  },
  'should be able to get a list of keys for a peer' : function(assert) {
    var g = new Gossiper();
    g.peers['p1'] = new PeerState();
    g.peers['p1'].attrs['keyz'] = [];
    g.peers['p1'].attrs['keyzy'] = [];
    assert.deepEqual(['keyz','keyzy'], g.peerKeys('p1'));
  },
  'should be able to get the value of a key for a peer' : function(assert) {
    var g = new Gossiper();
    g.peers['p1'] = new PeerState();
    g.peers['p1'].attrs['keyz'] = ['hi', 1];
    assert.equal('hi', g.peerValue('p1','keyz'));
  },
  'should be able to get a list of peers' : function(assert) {
    var g = new Gossiper();
    g.peers['p1'] = new PeerState();
    g.peers['p2'] = new PeerState();
    assert.deepEqual(['p1','p2'], g.allPeers());
  },
  'should emit new_peer event when we learn about a new peer' : function(assert, beforeExit) {
    var g = new Gossiper();
    // mock scuttle
    g.scuttle = { 'scuttle' : function(v) {
      return { 'new_peers' : ['127.0.0.1:8010'] };
    }} ;

    var emitted = false;
    g.on('new_peer', function() {
      emitted = true;
    });
    g.firstResponseMessage({});
    beforeExit(function() {
      assert.ok(emitted);
    });
  },
  'should emit update event when we learn more about a peer' : function(assert, beforeExit) {
    var g = new Gossiper();
    g.peers['127.0.0.1:8010'] = new PeerState();
    g.handleNewPeers(['127.0.0.1:8010']);
    var update = null;
    g.on('update', function(peer,k,v) {
     update = [peer,k,v];
    });
    g.peers['127.0.0.1:8010'].updateLocal('howdy', 'yall');
    beforeExit(function() {
      assert.deepEqual(['127.0.0.1:8010', 'howdy', 'yall'], update);
    });
  }
}
