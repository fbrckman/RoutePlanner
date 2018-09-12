import React, {Component} from 'react';
import {Segment, Loader, Grid, Button} from 'semantic-ui-react';
import TravelForm from './TravelForm';
import InteractiveMap from './InteractiveMap/InteractiveMap';
import Calculator from './Calculator';

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

  constructor() {
    super();
    this.state = {
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
      datetime: new Date(),
      latest: new Date(),
      departure: false,
      calculator: new Calculator(
        this,
        this.provinces,
        TravelHandler.handleConnection,
        TravelHandler.handleResult,
        TravelHandler.finishCalculating),
      calculating: false,
    };

    this.getConnectionsUrls = this.getConnectionsUrls.bind(this);
    this.setStop = this.setStop.bind(this);
    this.setData = this.setData.bind(this);
    TravelHandler.finishCalculating = TravelHandler.finishCalculating.bind(this);
  }

  static handleConnection(connection) {
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
    console.log("Finishing calculation...");
    self.setState({calculating: false});
  }

  getConnectionsUrls() {
    const output = [];
    for (const p of Object.values(this.provinces)) {
      output.push(p.connectionsUrl);
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
      console.log("Setting data...");
      console.log("Datetime:", datetime);
      this.setState({
        datetime: datetime,
        latest: latest,
        departure: departure,
        calculating: true,
      }, () => {
        calculator.query(
          province,
          arrivalStop.id,
          departureStop.id,
          datetime,
          latest
        );
      })
    } else {
      console.error("These stops are from different provinces.");
    }
  }

  render() {
    const {departureStop, arrivalStop, calculating} = this.state;
    return (
      <div>
        <Segment>
          <TravelForm departureStop={departureStop}
                      arrivalStop={arrivalStop}
                      setDataCallback={this.setData}
          />
        </Segment>
        <Segment hidden={!calculating}>
          <Grid className="middle aligned">
            <Grid.Column>
              <Loader active inline/>
            </Grid.Column>
            <Grid.Column>Calculating...</Grid.Column>
            <Grid.Column floated='right'>
              <Button onClick={() => {
                window.dispatchEvent(new CustomEvent("cancel"));
                this.setState({calculating: false});
              }}>Cancel</Button>
            </Grid.Column>
          </Grid>
        </Segment>
        <Segment>
          <InteractiveMap provinces={this.provinces}
                          departureStop={departureStop}
                          arrivalStop={arrivalStop}
                          setStopCallback={this.setStop}
          />
        </Segment>
      </div>
    );
  }
}

export default TravelHandler;