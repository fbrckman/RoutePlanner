import React, {Component} from 'react';
import {Segment} from 'semantic-ui-react';
import TravelForm from './TravelForm';
import InteractiveMap from './InteractiveMap/InteractiveMap';
import Calculator from './Calculator';

class TravelHandler extends Component {



  constructor() {
    super();
    this.state = {
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
      datetime: new Date(),
      latest: new Date(),
      departure: false,
      calculator: new Calculator(),
    }
  }

  static setStop(self, newStop, departure) {
    self.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});
  }

  static setData(self, datetime, latest, departure) {
    console.log("Setting data...");
    self.setState({
      datetime: datetime,
      latest: latest,
      departure: departure,
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