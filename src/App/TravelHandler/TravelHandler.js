import React, {Component} from 'react';
import {Segment} from 'semantic-ui-react';
import TravelForm from './TravelForm';
import InteractiveMap from './InteractiveMap/InteractiveMap';

class TravelHandler extends Component {

  constructor() {
    super();
    this.state = {
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
    }
  }

  static setStop(self, newStop, departure) {
    self.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});
  }

  render() {
    return (
      <div>
        <Segment>
          <TravelForm departureStop={this.state.departureStop} arrivalStop={this.state.arrivalStop}/>
        </Segment>
        <Segment>
          <InteractiveMap handler={this}
                          departureStop={this.state.departureStop}
                          arrivalStop={this.state.arrivalStop}
                          setStopCallback={TravelHandler.setStop}/>
        </Segment>
      </div>
    );
  }
}

export default TravelHandler;