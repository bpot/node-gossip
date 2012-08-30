node-gossip implements a gossip protocol w/failure detection, allowing you to create a fault-tolerant, self-managing cluster of node.js processes.  Each server in the cluster has it's own set of key-value pairs which are propogated to the others peers in the cluster.  The API allows you to make changes to the local state, listen for changes in state, listen for new peers and be notified when a peer appears to be dead or appears to have come back to life.

The library is currently in 'hey it seems to work for me' state, there are probably some bugs lurking around. The API will probably change and suggestions on how to improve it are very welcome.

Check out the the scripts in the simulations/ directory for some examples.

### Usage

    var Gossiper = require('gossiper').Gossiper;
    // Create a seed peer.
    var seed = new Gossiper(9000, []);
    seed.start();

    // Create 20 new peers and point them at the seed (usually this would happen in 20 separate processes)
    // To prevent having a single point of failure you would probably have multiple seeds
    for(var i = 9001; i <= 9020;i++) {
      var g = new Gossiper(i, ['127.0.0.1:9000']);
      g.start();
      
      g.on('update', function(peer, k, v) {
        console.log("peer " + peer + " set " + k + " to " + v); // peer 127.0.0.1:9999 set somekey to somevalue
      });
    }

    // Add another peer which updates it's state after 15 seconds
    var updater = new Gossiper(9999, ['127.0.0.1:9000']);
    updater.start();
    setTimeout(function() {
      updater.setLocalState('somekey', 'somevalue');
    }, 15000);


### API

Gossiper methods:

    allPeers()
    livePeers()
    deadPeers()
    peerValue(peer, key)
    peerKeys(peer)
    getLocalState(key)
    setLocalSate(key, value)

Gossiper events:

    on('update', function(peer_name, key, value) {})
    on('new_peer', function(peer_name) {})
    on('peer_alive', function(peer_name) {})
    on('peer_failed', function(peer_name) {})

### Tests

    expresso -I lib test/*

### TODO

* test edge cases
* Cluster name -- dont allow peers to accidentally join the wrong cluster
* The scuttlebutt paper mentions a couple things we don't current do:
  * congestion throttling
  * make digests only be random subsets

### Acknowledgements

Both the gossip protocol and the failure detection algorithms are based off of academic papers and Cassandra's (http://www.cassandra.org/) implementation of those papers.  This library is highly indebted to both.

* ["Efficient reconciliation and flow control for anti-entropy protocols"](http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf)
* ["The Phi accrual failure detector"](http://vsedach.googlepages.com/HDY04.pdf)
