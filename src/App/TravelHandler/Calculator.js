/** See https://github.com/linkedconnections/client.js/tree/feature-delijn **/

import Client from 'lc-client';

class Calculator {

  planner;
  connectionCallback;
  resultCallback;

  constructor(entrypoints, connectionCallback, resultCallback) {
    this.planner = new Client({"entrypoints": entrypoints});
    this.query = this.query.bind(this);
  }

  query(arrivalStop, departureStop, departureTime, latestDepartureTime, searchTimeOut = 10000) {
    const self = this;
    console.log("departureTime:", departureTime);

    this.planner.query({
      "arrivalStop": arrivalStop,
      "departureStop": departureStop,
      "departureTime": departureTime,
      "latestDepartTime": latestDepartureTime,
      "searchTimeOut": searchTimeOut,
    }, function (resultStream, source) {
      resultStream.on('result', function (path) {
        console.log("Result:", path);
      });

      resultStream.on('data', function (connection) {
        console.log("Connection:", connection);
        // self.connectionCallback(connection);
        // If you're not interested anymore, you can stop the processing by doing this
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
        // console.log('.');
      });
    });
  }
}

export default Calculator;