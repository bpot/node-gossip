var AccrualFailureDetector = require('./accrual_failure_detector').AccrualFailureDetector,
    EventEmitter = require('events').EventEmitter,
    sys          = require('sys'); 

var PeerState = exports.PeerState = function(name) {
  EventEmitter.call(this);
  this.max_version_seen = 0;
  this.attrs            = {};
  this.detector         = new AccrualFailureDetector();
  this.alive            = true;
  this.heart_beat_version = 0;
  this.PHI              = 8;
  this.name             = name;
};

sys.inherits(PeerState, EventEmitter);

PeerState.prototype.updateWithDelta = function(k,v,n) {
  // It's possibly to get the same updates more than once if we're gossiping with multiple peers at once
  // ignore them
  if(n > this.max_version_seen) {
    this.max_version_seen = n;
    this.setKey(k,v,n);
    if(k == '__heartbeat__') {
      var d = new Date();
      this.detector.add(d.getTime());
    }
  }
}

/* This is used when the peerState is owned by this peer */

PeerState.prototype.updateLocal = function(k,v) {
  this.max_version_seen += 1;
  this.setKey(k,v,this.max_version_seen);
}

PeerState.prototype.getValue = function(k) {
  if(this.attrs[k] == undefined) {
    return undefined;
  } else {
    return this.attrs[k][0];
  }
}

PeerState.prototype.getKeys = function() {
  var keys = [];
  for(k in this.attrs) { keys.push(k) };
  return keys;
}

PeerState.prototype.setKey = function(k,v,n) {
  this.attrs[k] = [v,n];
  this.emit('update', k, v);
}

PeerState.prototype.beatHeart = function() {
  this.heart_beat_version += 1;
  this.updateLocal('__heartbeat__', this.heart_beat_version);
}

PeerState.prototype.deltasAfterVersion = function(lowest_version) {
  deltas = []
  for(k in this.attrs) {
    var value   = this.attrs[k][0];
    var version = this.attrs[k][1];
    if(version > lowest_version) {
      deltas.push([k,value,version]);
    }
  }
  return deltas;
}

PeerState.prototype.isSuspect = function() {
  var d = new Date();
  var phi = this.detector.phi(d.getTime());
  if(phi > this.PHI) {
    this.markDead();
    return true;
  } else {
    this.markAlive();
    return false;
  }
}

PeerState.prototype.markAlive = function() {
  if(!this.alive) {
    this.alive = true;
    this.emit('peer_alive');
  }
}

PeerState.prototype.markDead = function() {
  if(this.alive) {
    this.alive = false;
    this.emit('peer_failed');
  }
}
