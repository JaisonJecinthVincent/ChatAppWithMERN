module.exports = {
  // Generate random string for unique data
  $randomString: function() {
    return Math.random().toString(36).substring(2, 15);
  },
  
  // Generate random integer
  $randomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // Processor function to handle request/response data
  processor: function(requestParams, response, context, ee, next) {
    // Log important metrics
    if (response && response.statusCode) {
      const url = requestParams.url || 'unknown';
      const method = requestParams.method || 'GET';
      const statusCode = response.statusCode;
      const responseTime = response.timings ? response.timings.phases.total : 0;
      
      // Log slow requests
      if (responseTime > 1000) {
        console.log(`⚠️  Slow request: ${method} ${url} - ${statusCode} (${responseTime}ms)`);
      }
      
      // Log errors
      if (statusCode >= 400) {
        console.log(`❌ Error: ${method} ${url} - ${statusCode}`);
      }
    }
    
    return next();
  },
  
  // Before scenario hook
  beforeScenario: function(req, userContext, events, done) {
    // Add some randomness to prevent thundering herd
    setTimeout(() => {
      done();
    }, Math.random() * 100);
  },
  
  // After response hook
  afterResponse: function(req, res, userContext, events, done) {
    // Track response times
    if (res.timings && res.timings.phases) {
      userContext.lastResponseTime = res.timings.phases.total;
      
      // If response time is too high, add a small delay to prevent overwhelming
      if (res.timings.phases.total > 2000) {
        setTimeout(done, 100);
      } else {
        done();
      }
    } else {
      done();
    }
  }
};