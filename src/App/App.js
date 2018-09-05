import React, {Component} from 'react';
import logo from '../logo.svg';
import './App.css';
import TravelForm from '../TravelForm';
import InteractiveMap from "../InteractiveMap/InteractiveMap";

class App extends Component {

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo"/>
          <h1 className="App-title">Welcome to Route Planner</h1>
        </header>

        <TravelForm/>
        <InteractiveMap/>
      </div>
    );
  }
}

export default App;
