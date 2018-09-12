import React, {Component} from 'react';
import {Segment} from 'semantic-ui-react';
import TravelForm from './TravelForm';
import InteractiveMap from './InteractiveMap/InteractiveMap';
import Calculator from './Calculator';

class TravelHandler extends Component {

  provinces = {
    // "Antwerpen": {
    //   stopsUrl: "https://belgium.linkedconnections.org/delijn/Antwerpen/stops",
    //   connectionsUrl: "https://belgium.linkedconnections.org/delijn/Antwerpen/connections",
    //   markers: undefined, stops: new Set(), shown: false
    // },
    // "Limburg": {
    //   stopsUrl: "https://belgium.linkedconnections.org/delijn/Limburg/stops",
    //   connectionsUrl: "https://belgium.linkedconnections.org/delijn/Limburg/connections",
    //   markers: undefined, stops: new Set(), shown: false
    // },
    "Oost-Vlaanderen": {
      stopsUrl: "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops",
      connectionsUrl: "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/connections",
      markers: undefined, stops: new Set(), shown: false
    },
    // "West-Vlaanderen": {
    //   stopsUrl: "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/stops",
    //   connectionsUrl: "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/connections",
    //   markers: undefined, stops: new Set(), shown: false
    // },
    // "Vlaams-Brabant": {
    //   stopsUrl: "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/stops",
    //   connectionsUrl: "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/connections",
    //   markers: undefined, stops: new Set(), shown: false
    // },
  };

  constructor() {
    super();
    this.state = {
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
      datetime: new Date(),
      latest: new Date(),
      departure: false,
      calculator: new Calculator(this.getConnectionsUrls(), this.handleConnection, this.handleResult),
    };

    this.setStop = this.setStop.bind(this);
    this.setData = this.setData.bind(this);
  }

  handleConnection(connection) {
    console.log("handleConnection");
    window.dispatchEvent(new CustomEvent("connection", {
      detail: {connection: connection}
    }));
  }

  handleResult(result) {
    console.log("handleResult");
    window.dispatchEvent(new CustomEvent("result", {
      detail: {result: result}
    }));
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

  setStop(newStop, departure) {
    this.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});
  }

  setData(datetime, latest, departure) {
    const {arrivalStop, departureStop, calculator} = this.state;
    console.log("Setting data...");
    console.log("Datetime:", datetime);
    this.setState({
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
    const {departureStop, arrivalStop} = this.state;
    return (
      <div>
        <Segment>
          <TravelForm handler={this}
                      departureStop={departureStop}
                      arrivalStop={arrivalStop}
                      setDataCallback={this.setData}
          />
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