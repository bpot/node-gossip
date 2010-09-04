var PeerState = require('./peer_state').PeerState;
var Scuttle = exports.Scuttle = function(peers, local_peer) {
  this.peers      = peers;
  this.local_peer = local_peer;
};

Scuttle.prototype.digest = function() {
  var digest = {};
  for(i in this.peers) {
    var p = this.peers[i];
    digest[i] = p.max_version_seen;
  }
  return digest;
}

// HEART OF THE BEAST

Scuttle.prototype.scuttle = function(digest) {
  var deltas_with_peer  = [];
  var requests          = {}
  var new_peers         = [];
  for(var peer in digest) {
    var local_version   = this.maxVersionSeenForPeer(peer);
    var local_peer      = this.peers[peer];
    var digest_version  = digest[peer];

    if(!this.peers[peer]) {
      // We don't know about this peer. Request all information.
      requests[peer] = 0;
      new_peers.push(peer);
    } else if(local_version > digest[peer]) {
      // We have more recent information for this peer. Build up deltas.
      deltas_with_peer.push( { peer : peer, deltas :  local_peer.deltasAfterVersion(digest[peer]) });
    } else if(local_version < digest[peer]) {
      // They have more recent information, request it.
      requests[peer] = local_version;
    } else {
      // Everything is the same.
    }
  }

  // Sort by peers with most deltas
  deltas_with_peer.sort( function(a,b) { return b.deltas.length - a.deltas.length } );

  var deltas = [];
  for(i in deltas_with_peer) {
    var peer = deltas_with_peer[i];
    var peer_deltas = peer.deltas;

    // Sort deltas by version number
    peer_deltas.sort(function(a,b) { return a[2] - b[2]; })
    if(peer_deltas.length > 1) {
    //  console.log(peer_deltas);
    }
    for(j in peer_deltas) {
      var delta = peer_deltas[j];
      delta.unshift(peer.peer);
      deltas.push(delta);
    }
  }

  return {  'deltas' : deltas, 
            'requests' : requests,
            'new_peers' : new_peers };
}

Scuttle.prototype.maxVersionSeenForPeer = function(peer) {
  if(this.peers[peer]) {
    return this.peers[peer].max_version_seen;
  } else {
    return 0;
  }
}

Scuttle.prototype.updateKnownState = function(deltas) {
  for(i in deltas) {
    var d = deltas[i];

    var peer_name  = d.shift();
    var peer_state = this.peers[peer_name];
    peer_state.updateWithDelta(d[0],d[1],d[2]);
  }
};

Scuttle.prototype.fetchDeltas = function(requests) {
  var deltas = []
  for(i in requests) {
    var peer_deltas = this.peers[i].deltasAfterVersion(requests[i]);
    peer_deltas.sort(function(a,b) { return a[2] - b[2]; });
    for(j in peer_deltas) {
      peer_deltas[j].unshift(i);
      deltas.push(peer_deltas[j]);
    }
  }
  return deltas;
}
