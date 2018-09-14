/** See https://github.com/linkedconnections/client.js/tree/feature-delijn **/

import Client from 'lc-client';

class Calculator {

  handler;
  planners;
  calculationCancelled;

  connectionCallback;
  resultCallback;
  finishCalculatingCallback;

  constructor(handler, entrypoints, connectionCallback, resultCallback, finishCalculatingCallback) {
    this.calculationCancelled = false;

    this.handler = handler;
    this.planners = {};
    for (const province of Object.keys(entrypoints)) {
      this.planners[province] = new Client({"entrypoints": [entrypoints[province].connectionsUrl]});
    }
    this.connectionCallback = connectionCallback;
    this.resultCallback = resultCallback;
    this.finishCalculatingCallback = finishCalculatingCallback;
    this.queryPlanner = this.queryPlanner.bind(this);

    window.addEventListener("cancel", () => {
      this.calculationCancelled = true;
    })
  }

  queryPlanner(province, arrivalStop, departureStop, departureTime, latestDepartureTime, keepCalculating=false, searchTimeOut=9000) {
    const self = this;
    const planner = this.planners[province];
    this.calculationCancelled = false;

    let start = new Date(), end, diff;

    planner.timespanQuery({
      "arrivalStop": arrivalStop,
      "departureStop": departureStop,
      "departureTime": departureTime,
      "latestDepartTime": latestDepartureTime,
      "searchTimeOut": searchTimeOut,
    }, function (resultStream, source) {

      resultStream.on('result', function (path) {
        self.finishCalculatingCallback(self.handler, path, keepCalculating);

        end = new Date();
        diff = (end - start) / 1000;
        console.log("Elapsed time: ", diff);
        start = new Date();

        if (!keepCalculating) source.close();
      });

      resultStream.on('data', function (connection) {
        self.connectionCallback(connection);
      });

      // You can also count the number of HTTP requests done by the interface as follows
      source.on('request', function (url) {
        // console.log('Requesting', url);
      });

      // You can also catch when a response is generated HTTP requests done by the interface as follows
      source.on('response', function (url) {
        // console.log('Response received for', url);
        if (self.calculationCancelled) {
          console.log("--- Cancelled ---");
          this.close();
        }
      });
    });
  }
}

export default Calculator;