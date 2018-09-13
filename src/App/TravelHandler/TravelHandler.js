import React, {Component} from 'react';
import {Segment, Loader, Grid, Button, Icon} from 'semantic-ui-react';
import TravelForm from './TravelForm';
import Calculator from './Calculator';
import InteractiveMap from './InteractiveMap/InteractiveMap';
import RouteView from './RouteView/RouteView';

class TravelHandler extends Component {

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
      calculating: false,
      route: undefined,
      minutes: 0,
      seconds: 0,
      stations: {},
      calculator: new Calculator(
        this,
        this.provinces,
        TravelHandler.handleConnection,
        TravelHandler.handleResult,
        TravelHandler.finishCalculating),
    };

    this.setStop = this.setStop.bind(this);
    this.setData = this.setData.bind(this);
    this.second = this.second.bind(this);
    this.resetTimer = this.resetTimer.bind(this);
    TravelHandler.finishCalculating = TravelHandler.finishCalculating.bind(this);

    window.addEventListener("cancel", () => this.setState({calculating: false}));
  }

  componentDidMount() {
    window.setInterval(() => {
      if (this.state.calculating) this.second();
    }, 1000);
  }

  /* Events ----------------------------------------------------------------------------------------------------------*/

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
   */
  static handleResult(result) {
    window.dispatchEvent(new CustomEvent("result", {
      detail: {result: result}
    }));
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
   *
   * @param datetime:Date
   * @param latest:Date
   * @param departure:boolean
   */
  setData(datetime, latest, departure) {
    const {arrivalStop, departureStop, calculator} = this.state;
    const province = departureStop.province;
    if (province === arrivalStop.province) { // TODO remove this if the calculator can handle cross-province-requests
      this.resetTimer();
      this.setState({
        datetime: datetime, latest: latest, departure: departure, calculating: true, route: undefined,
      }, () => {
        calculator.query(province, arrivalStop.id, departureStop.id, datetime, latest);
      })
    } else {
      console.error("These stops are from different provinces.");
    }
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
   * Callback funtion.
   * Assign a color to every route in the result. Assign a name to every stop.
   * Parse the result to contain the start and end of every trip of the route.
   *    -> Used to fill in the RouteView and make it more readable.
   * @param self
   * @param result:array of connection objects, one connection object for each trip of the route
   */
  static finishCalculating(self, result) {
    console.log("Finish calculating...");
    self.setState({calculating: false});
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

    const routeUrl = "http://vocab.gtfs.org/terms#route", signUrl = "http://vocab.gtfs.org/terms#headsign";

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

    self.setState({route: parsedResult});

    TravelHandler.handleResult(result);
  }

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
    const {departureStop, arrivalStop, calculating, route, minutes, seconds, stations} = this.state;
    return (
      <div>
        <Segment>
          <TravelForm departureStop={departureStop}
                      arrivalStop={arrivalStop}
                      calculating={calculating}
                      setDataCallback={this.setData}
          />
        </Segment>
        {calculating &&
        <Segment>
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
                {minutes > 0 ? minutes === 1 ? '1 minute, ' : minutes + 'minutes, ' : ''}
                {seconds} seconds
              </span>
            </Grid.Column>
          </Grid>
        </Segment>}
        <Segment>
          <InteractiveMap provinces={this.provinces}
                          departureStop={departureStop}
                          arrivalStop={arrivalStop}
                          stations={stations}
                          calculating={calculating}
                          setStopCallback={this.setStop}
          />
        </Segment>
        <Segment hidden={route === undefined}>
          <RouteView route={route}/>
        </Segment>
      </div>
    );
  }
}

export default TravelHandler;