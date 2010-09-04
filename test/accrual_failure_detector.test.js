var AccrualFailureDetector = require('accrual_failure_detector').AccrualFailureDetector;

module.exports = {
  'should have a low phi value after only a second' : function(assert) {
    var afd = new AccrualFailureDetector();
    var time = 0;
    for(var i = 0;i < 100;i++) {
      time += 1000;
      afd.add(time);
    }
    assert.ok(afd.phi(time + 1000) < 0.5);
  },

  'should have a high phi value after ten seconds' : function(assert) {
    var afd = new AccrualFailureDetector();
    var time = 0;
    for(var i = 0;i < 100;i++) {
      time += 1000;
      afd.add(time);
    }
    assert.ok(afd.phi(time + 10000) > 4);
  },

  'should only keep last 1000 values' : function(assert) {
    var afd = new AccrualFailureDetector();
    var time = 0;
    for(var i = 0;i < 2000;i++) {
      time += 1000;
      afd.add(time);
    }
    assert.equal(1000, afd.intervals.length);
  }
}
