var PeerState = require('peer_state').PeerState,
    Scuttle = require('scuttle').Scuttle,
    EventEmitter = require('events').EventEmitter,
    net          = require('net'), 
    sys          = require('sys'),
    child_process = require('child_process'),
    dns         = require('dns'),
    msgpack     = require('msgpack'); 

var Gossiper = exports.Gossiper = function(port, seeds, ip_to_bind) {
  EventEmitter.call(this);
  this.peers    = {};
  this.ip_to_bind     = ip_to_bind;
  this.port     = port;
  this.my_state = new PeerState();
  this.scuttle  = new Scuttle(this.peers, this.my_state);

  this.handleNewPeers(seeds);
}

sys.inherits(Gossiper, EventEmitter);

Gossiper.prototype.start = function(callback) {
  var self = this;

  // Create Server
  this.server = net.createServer(function (net_stream) {
    var mp_stream = new msgpack.Stream(net_stream);
    mp_stream.on('msg', function(msg) { self.handleMessage(net_stream, mp_stream, msg) });
  });

  // Bind to ip/port
  if(this.ip_to_bind) {
    this.peer_name    = [this.address, this.port.toString()].join(':');
    this.peers[this.peer_name] = this.my_state;
    this.my_state.name = this.peer_name;
    this.server.listen(this.port, this.ip_to_bind, callback);
  } else {
    // this is an ugly hack to get the hostname of the local machine
    // we don't listen on any ip because it's important that we listen 
    // on the same ip that the server identifies itself as
    child_process.exec('hostname', function(error, stdout, stderr) {
      var l = stdout.length;
      var hostname = stdout.slice(0, l - 1);
      dns.lookup(hostname, 4, function(err,address, family) {
        self.peer_name    = [address, self.port.toString()].join(':');
        self.peers[self.peer_name] = self.my_state;
        self.my_state.name = self.peer_name;
        self.server.listen(self.port, address, callback);
      });
    });
  }

  this.handleNewPeers(this.seeds);
  this.heartBeatTimer = setInterval(function() { self.my_state.beatHeart() }, 1000 );
  this.gossipTimer = setInterval(function() { self.gossip() }, 1000);
}

Gossiper.prototype.stop = function() {
  this.server.close();
  clearInterval(this.heartBeatTimer);
  clearInterval(this.gossipTimer);
}


// The method of choosing whice peer(s) to gossip to is borrowed from Cassandra.
// They seemed to have worked out all of the edge cases
// http://wiki.apache.org/cassandra/ArchitectureGossip
Gossiper.prototype.gossip = function() {
  // Find a live peer to gossip to
  if(this.livePeers() > 0) {
    var live_peer = this.chooseRandom(this.livePeers());
    this.gossipToPeer(live_peer);
  }

  // Possilby gossip to a dead peer
  var prob = this.deadPeers().length / (this.livePeers().length + 1)
  if(Math.random() < prob) {
    var dead_peer = this.chooseRandom(this.deadPeers());
    this.gossipToPeer(dead_peer);
  }

  // Gossip to seed under certain conditions
  if(live_peer && !this.seeds[live_peer] && this.livePeers().length < this.seeds.length) {
    if(Math.random() < (this.seeds / this.allPeers.size())) {
      this.gossipToPeer(chooseRandom(this.peers));
    }
  }

  // Check health of peers
  for(var i in this.peers) {
    var peer = this.peers[i];
    if(peer != this.my_state) {
      peer.isSuspect();
    }
  }
}

Gossiper.prototype.chooseRandom = function(peers) {
  // Choose random peer to gossip to
  var i = Math.floor(Math.random()*1000000) % peers.length;
  return peers[i];
}

Gossiper.prototype.gossipToPeer = function(peer) {
  var a = peer.split(":");
  var gosipee = new net.createConnection(a[1], a[0]);
  var self = this;
  gosipee.on('connect', function(net_stream) {
    var mp_stream = new msgpack.Stream(gosipee);
    mp_stream.on('msg', function(msg) { self.handleMessage(gosipee, mp_stream, msg) });
    mp_stream.send(self.requestMessage());
  });
  gosipee.on('error', function(exception) {
//    console.log(self.peer_name + " received " + sys.inspect(exception));
  });
}

Gossiper.REQUEST          = 0;
Gossiper.FIRST_RESPONSE   = 1;
Gossiper.SECOND_RESPONSE  = 2;

Gossiper.prototype.handleMessage = function(net_stream, mp_stream, msg) {
  switch(msg.type) {
    case Gossiper.REQUEST:
      mp_stream.send(this.firstResponseMessage(msg.digest));
      break;
    case Gossiper.FIRST_RESPONSE:
      this.scuttle.updateKnownState(msg.updates);
      mp_stream.send(this.secondResponseMessage(msg.request_digest));
      net_stream.end();
      break;
    case Gossiper.SECOND_RESPONSE:
      this.scuttle.updateKnownState(msg.updates);
      net_stream.end();
      break;
    default:
      // shit went bad
      break;
  }
}

// MESSSAGES


Gossiper.prototype.handleNewPeers = function(new_peers) {
  var self = this;
  for(var i in new_peers) {
    var peer_name = new_peers[i];
    this.peers[peer_name] = new PeerState(peer_name);
    this.emit('new_peer', peer_name);

    var peer = this.peers[peer_name];
    this.listenToPeer(peer);
  }
}

Gossiper.prototype.listenToPeer = function(peer) {
  var self = this;
  peer.on('update', function(k,v) {
    self.emit('update', peer.name, k, v);
  });
  peer.on('peer_alive', function() {
    self.emit('peer_alive', peer.name);
  });
  peer.on('peer_failed', function() {
    self.emit('peer_failed', peer.name);
  });
}

Gossiper.prototype.requestMessage = function() {
  var m = {
    'type'    : Gossiper.REQUEST,
    'digest'  : this.scuttle.digest(),
  };
  return m;
};

Gossiper.prototype.firstResponseMessage = function(peer_digest) {
  var sc = this.scuttle.scuttle(peer_digest)
  this.handleNewPeers(sc.new_peers);
  var m = {
    'type'            : Gossiper.FIRST_RESPONSE,
    'request_digest'  : sc.requests,
    'updates'         : sc.deltas
  };
  return m;
};

Gossiper.prototype.secondResponseMessage = function(requests) {
  var m = {
    'type'    : Gossiper.SECOND_RESPONSE,
    'updates' : this.scuttle.fetchDeltas(requests)
  };
  return m;
};

Gossiper.prototype.setLocalState = function(k, v) {
  this.my_state.updateLocal(k,v);
}

Gossiper.prototype.getLocalState = function(k) {
  return this.my_state.getValue(k);
}

Gossiper.prototype.peerKeys = function(peer) {
  return this.peers[peer].getKeys();
}

Gossiper.prototype.peerValue = function(peer, k) {
  return this.peers[peer].getValue(k);
}

Gossiper.prototype.allPeers = function() {
  var keys = [];
  for(var k in this.peers) { keys.push(k) };
  return keys;
}

Gossiper.prototype.livePeers = function() {
  var keys = [];
  for(var k in this.peers) { if(k.alive) { keys.push(k)} };
  return keys;
}

Gossiper.prototype.deadPeers = function() {
  var keys = [];
  for(var k in this.peers) { if(!k.alive) { keys.push(k) } };
  return keys;
}
