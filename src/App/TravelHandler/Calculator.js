/** See https://github.com/linkedconnections/client.js/tree/feature-delijn **/

import * as lc from 'lc-client';

class Calculator {

  planner;

  constructor(entrypoints) {
    this.planner = new lc.Client({"entrypoints" : entrypoints});
  }

  query(arrivalStop, departureStop, departureTime, latestDepartureTime, searchTimeOut = 10000) {
    this.planner.query({
      "arrivalStop": arrivalStop,
      "departureStop": departureStop,
      "departureTime": departureTime,
      "latestDepartTime": latestDepartureTime,
      "searchTimeOut" : searchTimeOut,
    }, function (resultStream, source) {
      resultStream.on('result', function (path) {
        console.log(path);
      });

      resultStream.on('data', function (connection) {
        console.log(connection);
        //if you're not interested anymore, you can stop the processing by doing this
        // if (stop_condition) {
        //   source.close();
        // }
      });

      //you can also count the number of HTTP requests done by the interface as follows
      source.on('request', function (url) {
        console.log('Requesting', url);
      });

      //you can also catch when a response is generated HTTP requests done by the interface as follows
      source.on('response', function (url) {
        console.log('Response received for', url);
      });
    });
  }
}

export default Calculator;