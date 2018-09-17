import React, {Component} from 'react';
import {Segment, Loader, Grid, Button, Icon, Modal, Header} from 'semantic-ui-react';
import L from 'leaflet';
import TravelForm from './TravelForm';
import Calculator from './Calculator';
import InteractiveMap from './InteractiveMap/InteractiveMap';
import RouteView from './RouteView/RouteView';

class TravelHandler extends Component {

  id;
  provinces = {
    "Antwerpen": {
      stopsUrl: "https://belgium.linkedconnections.org/delijn/Antwerpen/stops",
      connectionsUrl: "https://belgium.linkedconnections.org/delijn/Antwerpen/connections",
      markers: undefined, stops: new Set(), shown: false
    },
    "Limburg": {
      stopsUrl: "https://belgium.linkedconnections.org/delijn/Limburg/stops",
      connectionsUrl: "https://belgium.linkedconnections.org/delijn/Limburg/connections",
      markers: undefined, stops: new Set(), shown: false
    },
    "Oost-Vlaanderen": {
      stopsUrl: "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops",
      connectionsUrl: "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/connections",
      markers: undefined, stops: new Set(), shown: false
    },
    "West-Vlaanderen": {
      stopsUrl: "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/stops",
      connectionsUrl: "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/connections",
      markers: undefined, stops: new Set(), shown: false
    },
    "Vlaams-Brabant": {
      stopsUrl: "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/stops",
      connectionsUrl: "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/connections",
      markers: undefined, stops: new Set(), shown: false
    },
  };
  colors = ['red', 'cyan', 'yellow', 'magenta', 'green', 'purple', 'orange', 'blue'];

  constructor() {
    super();
    this.state = {
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
      datetime: new Date(),
      latest: new Date(),
      departure: false,
      fetching: true,
      calculating: false,
      timeoutModal: false,
      routes: [],
      selectedRoute: undefined,
      minutes: 0,
      seconds: 0,
      stations: {},
      nmbs: {markers: undefined, stops: new Set(), shown: false,},
      calculator: new Calculator(
        this,
        this.provinces,
        TravelHandler.handleConnection,
        TravelHandler.handleResult,
        TravelHandler.timeout,
        TravelHandler.finishCalculating,
        TravelHandler.streamEndCallback),
    };

    this.id = 0;
    this.setStop = this.setStop.bind(this);
    this.setData = this.setData.bind(this);
    TravelHandler.clearData = TravelHandler.clearData.bind(this);
    this.second = this.second.bind(this);
    this.resetTimer = this.resetTimer.bind(this);

    TravelHandler.handleConnection = TravelHandler.handleConnection.bind(this);
    TravelHandler.handleResult = TravelHandler.handleResult.bind(this);
    TravelHandler.timeout = TravelHandler.timeout.bind(this);
    TravelHandler.finishCalculating = TravelHandler.finishCalculating.bind(this);
    this.selectRoute = this.selectRoute.bind(this);

    window.addEventListener("cancel", () => this.setState({calculating: false}));
  }

  componentDidMount() {
    const self = this;
    const provinces = this.provinces;
    const {stations, nmbs} = this.state;

    // NMBS
    window.fetch("https://irail.be/stations/NMBS", {headers: {'accept': 'application/ld+json'}}).then(function (response) {
      return response.json();
    }).then(function (stationsNMBS) {
      stationsNMBS["@graph"].forEach(function (station) {
        const key = station["@id"];
        nmbs.stops.add(key);
        station.point = new L.LatLng(station.latitude, station.longitude);
        stations[key] = station;
      });

      // Keeping track of the number of fetched provinces
      let fetched = 0;

      // De Lijn
      for (let province of Object.keys(provinces)) {
        window.fetch(provinces[province].stopsUrl).then(function (response) {
          return response.json();
        }).then(function (stopsDeLijn) {
          // console.log(province, "fetched");
          stopsDeLijn["@graph"].forEach(function (stop) {
            const key = stop["@id"];
            provinces[province].stops.add(key);
            stop.province = province;
            stop.point = new L.LatLng(stop.latitude, stop.longitude);
            stations[key] = stop;
          });

          // FIXME this part causes the no-loop-func warning
          // Keep the checkboxes in a fetching state while the data is fetching
          fetched += 1;
          if (fetched === Object.keys(provinces).length) {
            self.setState({fetching: false});
            window.dispatchEvent(new CustomEvent("update", {
              detail: {province: province}
            }));
          }
        });
      }
    }).catch(function (ex) {
      console.error(ex);
    });

    window.setInterval(() => {
      if (this.state.calculating) this.second();
    }, 1000);
  }

  /* Events & Callbacks ----------------------------------------------------------------------------------------------*/

  /**
   * Dispatch an event with the given connection.
   * @param connection
   */
  static handleConnection(connection) {
    window.dispatchEvent(new CustomEvent("connection", {
      detail: {connection: connection}
    }));
  }

  /**
   * Dispatch an event with the given result
   * @param result:array of connections
   * @param routeId:number, id of the given route
   * @param keepCalculating:boolean, true if the calculator should continue after the first result
   */
  static handleResult(result, routeId, keepCalculating) {
    window.dispatchEvent(new CustomEvent("result", {
      detail: {
        result: result,
        id: routeId,
        keepCalculating: keepCalculating
      }
    }));
  }

  static timeout(self) {
    if (self.state.calculating) {
      self.setState({timeoutModal: true});
      window.dispatchEvent(new CustomEvent("cancel"));
    }
  }

  static streamEndCallback() {
    window.dispatchEvent(new CustomEvent("cancel"));
  }

  /**
   * Callback funtion.
   * Assign a color to every routeLines in the result. Assign a name to every stop.
   * Parse the result to contain the start and end of every trip of the routeLines.
   *    -> Used to fill in the RouteView and make it more readable.
   * @param self
   * @param result:array of connection objects, one connection object for each trip of the routeLines
   * @param keepCalculating:boolean, true if the Calculator will keep calculating routes
   */
  static finishCalculating(self, result, keepCalculating) {
    if (!keepCalculating) {
      console.log("Finish calculating...");
      self.setState({calculating: false});
    }
    const {stations} = self.state;
    const colorSet = {};
    let c = 0;

    for (const connection of result) {
      const route = connection["http://vocab.gtfs.org/terms#route"];
      if (colorSet[route] === undefined) {
        colorSet[route] = self.colors[c];
        c = (c + 1) % self.colors.length;
      }
      connection.color = colorSet[route];

      connection.arrivalStopName = stations[connection.arrivalStop].name;
      connection.departureStopName = stations[connection.departureStop].name;
    }

    const routeUrl = "http://vocab.gtfs.org/terms#routeLines", signUrl = "http://vocab.gtfs.org/terms#headsign";
    const parsedResult = [TravelHandler.cloneConnection(result[0])];
    let lastConnection = parsedResult[0];
    lastConnection.name = lastConnection[signUrl].replace(/"/g, "");

    for (const connection of result.slice(1, result.length)) {
      connection.name = connection[signUrl].replace(/"/g, "");
      if (connection[routeUrl] === lastConnection[routeUrl] && connection.name === lastConnection.name) {
        lastConnection.arrivalStop = connection.arrivalStop;
        lastConnection.arrivalTime = connection.arrivalTime;
        lastConnection.arrivalStopName = connection.arrivalStopName;
      } else {
        lastConnection = TravelHandler.cloneConnection(connection);
        parsedResult.push(lastConnection);
      }
    }

    const routeId = self.id;
    self.id += 1;
    const parsedRoute = {
      routeId: routeId,
      trips: parsedResult,
    };

    self.setState({routes: [...self.state.routes, parsedRoute]});
    TravelHandler.handleResult(result, routeId, keepCalculating);
    self.selectRoute(routeId);
  }

  selectRoute(routeId) {
    this.setState({selectedRoute: routeId});
    window.dispatchEvent(new CustomEvent("select", {
      detail: {routeId: routeId}
    }));
    document.getElementById("mapid").scrollIntoView();
  }

  /* Update state ----------------------------------------------------------------------------------------------------*/

  /**
   * Set the given stop as either departureStop or arrivalStop.
   * @param newStop
   * @param departure:boolean, true if the new stop should replace the current departureStop
   */
  setStop(newStop, departure) {
    this.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});
  }

  /**
   * Check if the departure and arrival province are the same. // TODO remove this
   * Reset the timer. Set the current state with the given arguments.
   * Query the calculator with the current state.
   * // TODO keepCalculatins is false, since the used library stops calculating after the first result anyway
   *
   * @param datetime:Date
   * @param latest:Date
   * @param departure:boolean
   * @param keepCalculating:boolean, true if the calculator should keep calculating after the first result
   */
  setData(datetime, latest, departure, keepCalculating=true) {
    const {arrivalStop, departureStop, calculator} = this.state;
    const province = departureStop.province;
    if (province === arrivalStop.province) { // TODO remove this if the calculator can handle cross-province-requests
      this.resetTimer();
      this.setState({
        datetime: datetime,
        latest: latest,
        departure: departure,
        calculating: true,
        routes: [],
        selectedRoute: undefined
      }, () => {
        document.getElementById("calculating").scrollIntoView(false);
        calculator.queryPlanner(province, arrivalStop.id, departureStop.id, datetime, latest, keepCalculating);
      })
    } else {
      console.error("These stops are from different provinces.");
    }
  }

  static clearData() {
    window.dispatchEvent(new CustomEvent("clear"));
  }

  /**
   * Add a second to the timer.
   */
  second() {
    const {minutes, seconds} = this.state;
    let newM = minutes, newS = seconds + 1;
    if (newS === 60) {
      newM += 1;
      newS = 0;
    }
    this.setState({minutes: newM, seconds: newS});
  }

  /**
   * Reset the timer to zero.
   */
  resetTimer() {
    this.setState({minutes: 0, seconds: 0});
  }

  /* Misc. -----------------------------------------------------------------------------------------------------------*/

  /**
   * Make a copy of the given connection.
   * @param connection: connection object to be cloned
   * @returns {{}}: connection object that has the same properties and values as the given object
   */
  static cloneConnection(connection) {
    const output = {};
    for (const key of Object.keys(connection)) {
      output[key] = connection[key];
    }
    return output;
  }

  /* Render ----------------------------------------------------------------------------------------------------------*/

  render() {
    const {
      departureStop, arrivalStop,
      fetching, calculating,
      routes, selectedRoute,
      minutes, seconds,
      stations, nmbs,
      timeoutModal
    } = this.state;
    return (
      <div>
        <Modal basic size="small" open={timeoutModal} onClose={() => this.setState({timeoutModal: false})}>
          <Header content="Timeout"/>
          <Modal.Content>
            <p>The route calculation has reached a timeout. No routes were found. Please try again.</p>
          </Modal.Content>
        </Modal>

        <Segment>
          <TravelForm departureStop={departureStop}
                      arrivalStop={arrivalStop}
                      calculating={calculating}
                      setDataCallback={this.setData}
                      clearDataCallback={TravelHandler.clearData}
          />
        </Segment>
        <Segment>
          <InteractiveMap provinces={this.provinces}
                          stations={stations}
                          nmbs={nmbs}
                          departureStop={departureStop}
                          arrivalStop={arrivalStop}
                          calculating={calculating}
                          fetching={fetching}
                          setStopCallback={this.setStop}
          />
        </Segment>

        {calculating &&
        <Segment id="calculating">
          <Grid className="middle aligned">
            <Grid.Column width={1}>
              <Button className='icon red' onClick={() => window.dispatchEvent(new CustomEvent("cancel"))}>
                <Icon name='times'/>
              </Button>
            </Grid.Column>
            <Grid.Column width={1}>
              <Loader active inline/>
            </Grid.Column>
            <Grid.Column width={8}>
              <span>Calculating... </span>
              <span style={{color: 'lightgrey'}}>
                {minutes > 0 ? minutes === 1 ? '1 minute, ' : minutes + ' minutes, ' : ''}
                {seconds === 1 ? '1 second' : seconds + ' seconds'}
              </span>
            </Grid.Column>
          </Grid>
        </Segment>}

        {routes.length > 0 ?
          <Segment>
            <RouteView routes={routes} selected={selectedRoute} selectRouteCallback={this.selectRoute}/>
          </Segment>
          : <div/>}
      </div>
    );
  }
}

export default TravelHandler;