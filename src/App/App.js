import React, {Component} from 'react';
import './App.css';
import TravelForm from '../TravelForm';
import InteractiveMap from "../InteractiveMap/InteractiveMap";

class App extends Component {

  render() {
    return (
      <div className="App">
        <TravelForm/>
        <InteractiveMap/>
      </div>
    );
  }
}

export default App;
