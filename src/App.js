import React, {Component} from 'react';
import logo from './logo.svg';
import './App.css';
import TravelForm from './TravelForm';

class App extends Component {

  render() {
    const leafletJS = document.createElement("script");
    leafletJS.setAttribute("href", "../node_modules/leaflet/dist/leaflet.js");
    document.getElementsByTagName("head")[0].appendChild(leafletJS);

    // const mymap = L.map('mapid').setView([51.505, -0.09], 13);
    // L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    //   attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    //   maxZoom: 18,
    //   id: 'mapbox.streets',
    //   accessToken: 'your.mapbox.access.token'
    // }).addTo(mymap);

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo"/>
          <h1 className="App-title">Welcome to Route Planner</h1>
        </header>
        <TravelForm/>
        <div>
          That map should show up here:
          <div id="mapid"/>
        </div>
      </div>
    );
  }
}

export default App;
