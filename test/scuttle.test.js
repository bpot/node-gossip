var Scuttle = require('scuttle').Scuttle;
var PeerState = require('peer_state').PeerState;

module.exports = {
  // digest
  'digest should have max versions we have seen' : function(assert) {
    var p1 = new PeerState();
    p1.max_version_seen = 10;
    var p2 = new PeerState();
    p2.max_version_seen = 12;
    var p3 = new PeerState();
    p3.max_version_seen = 22;

    var peers = {
      'a' : p1,
      'b' : p2,
      'c' : p3
    }

    var scuttle = new Scuttle(peers);
    assert.deepEqual( { 'a' : 10, 'b' : 12, 'c' : 22 },
                      scuttle.digest());
  },

  // scuttle
  // scuttle new peer
  'new peers should be in result' : function(assert) {
    var scuttle = new Scuttle({});
    var res = scuttle.scuttle( { 'new_peer' : 12 } ) 
    assert.deepEqual(['new_peer'], res.new_peers);
  },
  'request all information about a new peer' : function(assert) {
    var scuttle = new Scuttle({});
    var res = scuttle.scuttle( { 'new_peer' : 12 } ) 
    assert.deepEqual({ 'new_peer' : 0}, res.requests);
  },
  // scuttle deltas
  'send peer all deltas for peers we know more about' : function(assert) {
    var p1 = new PeerState();
    p1.updateLocal('hi', 'hello');
    p1.updateLocal('meh', 'goodbye');
    var scuttle = new Scuttle({'me' : p1});
    var res = scuttle.scuttle( {'me' : 0, 'new_peer' : 12 } ) 
    assert.deepEqual([['me', 'hi', 'hello', 1],
                      ['me', 'meh', 'goodbye', 2]], 
                     res.deltas);
  }

  // deltas should be sorted by version number
  // deltas should be ordered by the peer with the most
}
