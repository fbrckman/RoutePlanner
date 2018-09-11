import React, {Component} from 'react';
import {Segment} from 'semantic-ui-react';
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
      calculator: new Calculator(this.getConnectionsUrls()),
    }
  }

  getStopUrls() {
    const output = [];
    for (const p of Object.values(this.provinces)) {
      output.push(p.stopsUrl);
    }
    return output;
  }
  getConnectionsUrls() {
    const output = [];
    for (const p of Object.values(this.provinces)) {
      output.push(p.connectionsUrl);
    }
    return output;
  }

  static setStop(self, newStop, departure) {
    self.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});
  }

  static setData(self, datetime, latest, departure) {
    const {arrivalStop, departureStop, calculator} = self.state;
    console.log("Setting data...");
    self.setState({
      datetime: datetime,
      latest: latest,
      departure: departure,
    }, () => {
      calculator.query(
        arrivalStop.id,
        departureStop.id,
        datetime,
        latest
      );
    })
  }

  render() {
    return (
      <div>
        <Segment>
          <TravelForm handler={this}
                      departureStop={this.state.departureStop}
                      arrivalStop={this.state.arrivalStop}
                      setDataCallback={TravelHandler.setData}
          />
        </Segment>
        <Segment>
          <InteractiveMap handler={this}
                          provinces={this.provinces}
                          departureStop={this.state.departureStop}
                          arrivalStop={this.state.arrivalStop}
                          setStopCallback={TravelHandler.setStop}
          />
        </Segment>
      </div>
    );
  }
}

export default TravelHandler;