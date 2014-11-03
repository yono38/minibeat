var cbApi = (function  () {

  var api = {},
      baseUrl = 'http://api.chartbeat.com/',
        path = 'live/toppages/v3/'
      // Add the API Key here
      apiKey = 'API_KEY_HERE',
      host = 'gizmodo.com';

  api.getData = function(callback) {
    requestUrl = baseUrl + path + '?apikey=' + apiKey + '&host=' + host;
    request = new XMLHttpRequest();
    request.open('get', requestUrl, true);
    request.onload = function(e) {
      var response = request.response;
      response = JSON.parse(response);
      callback(response);
    };
    	request.onerror = function(e) {
      callback(request.response, e);
    };
    request.send();
  };

  return api;

})();



