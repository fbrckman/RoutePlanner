import React, {Component} from 'react';
import 'whatwg-fetch';
import L from 'leaflet';
import './InteractiveMap.css';

class InteractiveMap extends Component {

  httpGetAsync(theUrl, callback) {
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState === 4 && xmlHttp.status === 200)
        callback(xmlHttp.responseText);
    };
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
  }

  componentDidMount() {
    const map = L.map('mapid').setView([50.90, 5.2], 9);
    L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f2488a35b11044e4844692095875c9ce', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const stations = {};
    const markers = {};
    // const blueIcon = L.icon({
    //   iconUrl : 'https://linkedconnections.org/images/marker-icon.png',
    //   iconAnchor: [12, 41]
    // });
    // const startIcon = L.icon({
    //   iconUrl : 'https://linkedconnections.org/images/marker-icon-start.png',
    //   iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x-start.png'
    // });
    // const endIcon = L.icon({
    //   iconUrl : 'https://linkedconnections.org/images/marker-icon-end.png',
    //   iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x-end.png'
    // });
    // L.Icon.Default.iconUrl = 'https://linkedconnections.org/images/marker-icon.png';
    // L.Icon.Default.iconRetinaUrl = 'https://linkedconnections.org/images/marker-icon-2x.png';

    window.fetch("https://irail.be/stations/NMBS", {headers: {'accept': 'application/ld+json'}}).then(function(response) {
      return response.json();
    }).then(function (stationsNMBS) {
      stationsNMBS["@graph"].forEach(function (station) {
        const key = station["@id"];
        station.point = new L.LatLng(station.latitude, station.longitude);
        stations[key] = station;
        markers[key] = L.marker([station.latitude, station.longitude]).addTo(map);
        markers[key].bindPopup(station.name);
      });
      window.fetch("https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops").then(function(response) {
        return response.json();
      }).then(function (stopsDeLijn) {
        console.log(stopsDeLijn["@graph"]);
      })
    }).catch(function(ex) {
      console.error(ex);
    });
  }

  render() {
    return <div id="mapid"/>;
  }
}

export default InteractiveMap;