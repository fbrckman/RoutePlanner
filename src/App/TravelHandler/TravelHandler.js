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
  colors = ['red', 'teal', 'yellow', 'pink', 'green', 'purple', 'orange', 'blue'];

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
      calculator: new Calculator(
        this,
        this.provinces,
        TravelHandler.handleConnection,
        TravelHandler.handleResult,
        TravelHandler.finishCalculating),
    };

    this.setStop = this.setStop.bind(this);
    this.setData = this.setData.bind(this);
    TravelHandler.finishCalculating = TravelHandler.finishCalculating.bind(this);
  }

  static handleConnection(connection) {
    console.log(connection);
    window.dispatchEvent(new CustomEvent("connection", {
      detail: {connection: connection}
    }));
  }

  static handleResult(result) {
    window.dispatchEvent(new CustomEvent("result", {
      detail: {result: result}
    }));
  }

  static finishCalculating(self, result) {
    console.log("Finish calculating...");
    self.setState({calculating: false});
    const colorSet = {};
    let c = 0;

    for (const connection of result) {
      const route = connection["http://vocab.gtfs.org/terms#route"];
      if (colorSet[route] === undefined) {
        colorSet[route] = self.colors[c];
        c = (c + 1) % self.colors.length;
      }
      connection.color = colorSet[route];
    }

    const parsedResult = [TravelHandler.cloneConnection(result[0])];
    let lastConnection = parsedResult[0];

    for (const connection of result.slice(0, -1)) {
      if (connection["http://vocab.gtfs.org/terms#route"] === lastConnection["http://vocab.gtfs.org/terms#route"]) {
        lastConnection.arrivalStop = connection.arrivalStop;
        lastConnection.arrivalTime = connection.arrivalTime;
      } else {
        lastConnection = TravelHandler.cloneConnection(connection);
        parsedResult.push(lastConnection);
      }
    }

    self.setState({route: parsedResult});

    TravelHandler.handleResult(result);
  }

  static cloneConnection(connection) {
    const output = {};
    for (const key of Object.keys(connection)) {
      output[key] = connection[key];
    }
    return output;
  }

  setStop(newStop, departure) {
    this.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});
  }

  setData(datetime, latest, departure) {
    const {arrivalStop, departureStop, calculator} = this.state;
    const province = departureStop.province;
    if (province === arrivalStop.province) {
      this.setState({
        datetime: datetime, latest: latest, departure: departure, calculating: true,
      }, () => {
        calculator.query(province, arrivalStop.id, departureStop.id, datetime, latest);
      })
    } else {
      console.error("These stops are from different provinces.");
    }
  }

  render() {
    const {departureStop, arrivalStop, calculating, route} = this.state;
    return (
      <div>
        <Segment>
          <TravelForm departureStop={departureStop}
                      arrivalStop={arrivalStop}
                      setDataCallback={this.setData}
          />
        </Segment>
        {calculating &&
        <Segment>
          <Grid className="middle aligned">
            <Grid.Column width={1}>
              <Button className='icon red' onClick={() => {
                window.dispatchEvent(new CustomEvent("cancel"));
                this.setState({calculating: false});
              }}>
                <Icon name='times'/>
              </Button>
            </Grid.Column>
            <Grid.Column width={1}>
              <Loader active inline/>
            </Grid.Column>
            <Grid.Column>Calculating...</Grid.Column>
          </Grid>
        </Segment>}
        <Segment>
          <InteractiveMap provinces={this.provinces}
                          departureStop={departureStop}
                          arrivalStop={arrivalStop}
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