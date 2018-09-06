import React, {Component} from 'react';
import 'whatwg-fetch';
import L from 'leaflet';
import 'leaflet.markercluster';
import './InteractiveMap.css';

class InteractiveMap extends Component {

  iconAnchor = [12, 41];
  popupAnchor = [0, -40]; // Popup above the marker icon

  // departureStop = {id: "", newMarker: undefined, originalMarker: undefined};
  // arrivalStop = {id: "", newMarker: undefined, originalMarker: undefined};

  markerLayer;
  map;

  constructor() {
    super();
    this.state = {
      stations: {},
      markers: {},
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
    };
  }

  componentDidMount() {
    const self = this;
    const {stations, markers} = this.state;

    const provinces = [
      "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops",
      // "https://belgium.linkedconnections.org/delijn/Limburg/stops",
      // "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/stops",
      // "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/stops",
      // "https://belgium.linkedconnections.org/delijn/Antwerpen/stops",
    ];

    self.map = L.map('mapid').setView([50.90, 5.2], 9);
    const map = self.map;
    map.closePopupOnClick = true;
    L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f2488a35b11044e4844692095875c9ce', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    self.markerLayer = L.markerClusterGroup();
    const blueIcon = L.icon({
      iconUrl: 'https://linkedconnections.org/images/marker-icon.png',
      iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x.png',
      iconAnchor: self.iconAnchor,
      popupAnchor: self.popupAnchor
    });

    // NMBS
    window.fetch("https://irail.be/stations/NMBS", {headers: {'accept': 'application/ld+json'}}).then(function (response) {
      return response.json();
    }).then(function (stationsNMBS) {
      stationsNMBS["@graph"].forEach(function (station) {
        const key = station["@id"];
        station.point = new L.LatLng(station.latitude, station.longitude);
        stations[key] = station;

        markers[key] = L.marker([station.latitude, station.longitude]).setIcon(blueIcon);
        markers[key].bindPopup('<strong>' + station.name + '</strong><br> NMBS');
        markers[key].on("mouseover", () => markers[key].openPopup());
        markers[key].on("click", () => self.handleClick(key));
        self.markerLayer.addLayer(markers[key]);
      });

      // De Lijn
      for (let province of provinces) {
        window.fetch(province).then(function (response) {
          return response.json();
        }).then(function (stopsDeLijn) {
          stopsDeLijn["@graph"].forEach(function (stop) {
            const key = stop["@id"];
            stop.point = new L.LatLng(stop.latitude, stop.longitude);
            stations[key] = stop;

            markers[key] = L.marker([stop.latitude, stop.longitude]).setIcon(blueIcon);
            markers[key].bindPopup('<strong>' + stop.name + '</strong><br> De Lijn');
            markers[key].on("mouseover", () => markers[key].openPopup());
            markers[key].on("click", () => self.handleClick(key));
            self.markerLayer.addLayer(markers[key]);
          });
        })
      }

    }).catch(function (ex) {
      console.error(ex);
    });

    map.addLayer(self.markerLayer);
  }

  handleClick(key) {
    const map = this.map;
    const {stations, markers, departureStop, arrivalStop} = this.state;
    const redIcon = L.icon({
      iconUrl: 'https://linkedconnections.org/images/marker-icon-end.png',
      iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x-end.png',
      iconAnchor: this.iconAnchor,
      popupAnchor: this.popupAnchor
    });
    const greenIcon = L.icon({
      iconUrl: 'https://linkedconnections.org/images/marker-icon-start.png',
      iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x-start.png',
      iconAnchor: this.iconAnchor,
      popupAnchor: this.popupAnchor
    });

    if (departureStop.id === "") {
      // Select the clicked station as the new departureStop
      const station = stations[key];
      const newDS = {
        id: key,
        newMarker: L.marker([station.latitude, station.longitude]).setIcon(greenIcon).addTo(map),
        originalMarker: markers[key]
      };
      this.setState({departureStop: newDS});
      newDS.newMarker.on("click", () => this.deselect(key));

      this.markerLayer.removeLayer(newDS.originalMarker);
      if (arrivalStop.id !== "") {
        this.map.removeLayer(this.markerLayer);
      }

    } else if (arrivalStop.id === "" && key !== departureStop.id) {
      // Select the clicked station as the new arrivalStop
      const station = stations[key];
      const newAS = {
        id: key,
        newMarker: L.marker([station.latitude, station.longitude]).setIcon(redIcon).addTo(map),
        originalMarker: markers[key]
      };
      this.setState({arrivalStop: newAS});
      newAS.newMarker.on("click", () => this.deselect(key));

      this.markerLayer.removeLayer(newAS.originalMarker);
      this.map.removeLayer(this.markerLayer);
    }
  }

  deselect(key) {
    const {departureStop, arrivalStop} = this.state;
    if (departureStop.id === key) {
      // Deselect the current departureStop
      this.map.removeLayer(departureStop.newMarker);
      this.markerLayer.addLayer(departureStop.originalMarker);

      this.setState({departureStop: {id: "", newMarker: undefined, originalMarker: undefined}});
      if (arrivalStop.id !== "") {
        this.map.addLayer(this.markerLayer);
      }
    } else if (arrivalStop.id === key) {
      // Deselect the current arrivalStop
      this.map.removeLayer(arrivalStop.newMarker);
      this.markerLayer.addLayer(arrivalStop.originalMarker);
      // Add the other markers back
      this.map.addLayer(this.markerLayer);

      this.setState({arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined}});
    }
  }

  render() {
    return <div id="mapid"/>;
  }
}

export default InteractiveMap;