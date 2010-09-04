var AccrualFailureDetector = exports.AccrualFailureDetector = function() {
  this.last_time = undefined;
  this.intervals = [];
}

AccrualFailureDetector.prototype.add = function(arrival_time) {
  if(this.last_time == undefined) {
    var i = 750;
  } else {
    var i = arrival_time - this.last_time;
  }

  this.last_time = arrival_time;
  this.intervals.push(i);
  if(this.intervals.length > 1000) {
    this.intervals.shift();
  }
};

AccrualFailureDetector.prototype.phi = function(current_time) {
  var current_interval = current_time - this.last_time;
  var exp = -1 * current_interval / this.interval_mean();

  var p = Math.pow(Math.E, exp);
  return -1 * (Math.log(p) / Math.log(10));
};

AccrualFailureDetector.prototype.interval_mean = function(current_time) {
  sum = 0;
  for(i in this.intervals) {
    sum += this.intervals[i];
  }
  return sum / this.intervals.length;
};
