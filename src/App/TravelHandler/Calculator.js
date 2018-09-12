/** See https://github.com/linkedconnections/client.js/tree/feature-delijn **/

import Client from 'lc-client';

class Calculator {

  handler;
  planner;
  calculationCancelled;

  connectionCallback;
  resultCallback;
  finishCalculatingCallback;

  constructor(handler, entrypoints, connectionCallback, resultCallback, finishCalculatingCallback) {
    this.calculationCancelled = false;

    this.handler = handler;
    this.planner = new Client({"entrypoints": entrypoints});
    this.connectionCallback = connectionCallback;
    this.resultCallback = resultCallback;
    this.finishCalculatingCallback = finishCalculatingCallback;
    this.query = this.query.bind(this);

    window.addEventListener("cancel", () => {
      this.calculationCancelled = true;
    })
  }

  query(arrivalStop, departureStop, departureTime, latestDepartureTime, searchTimeOut = 10000) {
    const self = this;

    this.planner.query({
      "arrivalStop": arrivalStop,
      "departureStop": departureStop,
      "departureTime": departureTime,
      "latestDepartTime": latestDepartureTime,
      "searchTimeOut": searchTimeOut,
    }, function (resultStream, source) {

      resultStream.on('result', function (path) {
        console.log("Result:", path);
        self.finishCalculatingCallback(self.handler, path);
        source.close();
      });

      resultStream.on('data', function (connection) {
        self.connectionCallback(connection);

        // If you're not interested anymore, you can stop the processing by doing this
        if (self.calculationCancelled) {
          console.log("--- Cancelled ---");
          source.close();
        }
      });

      // You can also count the number of HTTP requests done by the interface as follows
      source.on('request', function (url) {
        // console.log('Requesting', url);
      });

      // You can also catch when a response is generated HTTP requests done by the interface as follows
      source.on('response', function (url) {
        // console.log('Response received for', url);
      });
    });
  }
}

export default Calculator;