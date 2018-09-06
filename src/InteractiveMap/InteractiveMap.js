import React, {Component} from 'react';
import 'whatwg-fetch';
import L from 'leaflet';
import 'leaflet.markercluster';
import './InteractiveMap.css';

class InteractiveMap extends Component {

  iconAnchor = [12, 41];
  popupAnchor = [0, -40]; // Popup above the marker icon

  blueIcon = L.icon({
    iconUrl: 'https://linkedconnections.org/images/marker-icon.png',
    iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x.png',
    iconAnchor: this.iconAnchor,
    popupAnchor: this.popupAnchor
  });
  redIcon = L.icon({
    iconUrl: 'https://linkedconnections.org/images/marker-icon-end.png',
    iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x-end.png',
    iconAnchor: this.iconAnchor,
    popupAnchor: this.popupAnchor
  });
  greenIcon = L.icon({
    iconUrl: 'https://linkedconnections.org/images/marker-icon-start.png',
    iconRetinaUrl: 'https://linkedconnections.org/images/marker-icon-2x-start.png',
    iconAnchor: this.iconAnchor,
    popupAnchor: this.popupAnchor
  });

  provinces = [
    // "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops",
    // "https://belgium.linkedconnections.org/delijn/Limburg/stops",
    // "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/stops",
    // "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/stops",
    // "https://belgium.linkedconnections.org/delijn/Antwerpen/stops",
  ];

  constructor() {
    super();
    this.state = {
      stations: {},
      markers: {},
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
      markerLayer: L.markerClusterGroup(),
      map: undefined
    };
  }

  componentDidMount() {
    console.log("Map mounted");
    const self = this;
    const {markerLayer} = this.state;

    const map = L.map('mapid').setView([50.90, 5.2], 9);
    this.setState({map: map});

    map.closePopupOnClick = true;
    L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f2488a35b11044e4844692095875c9ce', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // NMBS
    window.fetch("https://irail.be/stations/NMBS", {headers: {'accept': 'application/ld+json'}}).then(function (response) {
      return response.json();
    }).then(function (stationsNMBS) {
      stationsNMBS["@graph"].forEach(function (station) {
        self.createMarker(station, '<strong>' + station.name + '</strong><br> NMBS');
      });

      // De Lijn
      for (let province of self.provinces) {
        window.fetch(province).then(function (response) {
          return response.json();
        }).then(function (stopsDeLijn) {
          stopsDeLijn["@graph"].forEach(function (stop) {
            self.createMarker(stop, '<strong>' + stop.name + '</strong><br> De Lijn');
          });
        })
      }

    }).catch(function (ex) {
      console.error(ex);
    });

    map.addLayer(markerLayer);
  }

  /**
   * Create a marker for the given station with the given label.
   * @param station
   * @param label:string, shown as a popup when hovering over the marker
   */
  createMarker(station, label) {
    const {stations, markers, markerLayer} = this.state;
    const key = station["@id"];

    station.point = new L.LatLng(station.latitude, station.longitude);
    station.label = label;
    stations[key] = station;

    markers[key] = L.marker([station.latitude, station.longitude]).setIcon(this.blueIcon);
    markers[key].bindPopup(label);
    markers[key].on("click", () => this.select(key));
    markers[key].on("mouseover", () => markers[key].openPopup());
    markerLayer.addLayer(markers[key]);
  }

  /**
   * Triggers the selection of the stop with the given key.
   * @param key:string
   */
  select(key) {
    const {departureStop, arrivalStop} = this.state;

    if (departureStop.id === "") {
      // Select the clicked station as the new departureStop
      this.selectStop(key, true);
    } else if (arrivalStop.id === "" && key !== departureStop.id) {
      // Select the clicked station as the new arrivalStop
      this.selectStop(key, false);
    }
  }

  /**
   * Select the stop with the given key.
   * Add the stop to the state, remove the old marker from the markerLayer and add a new colored marker to the map.
   * Remove the markerLayer if needed.
   * @param key:string
   * @param departure:boolean , true if the stop is a departureStop
   */
  selectStop(key, departure) {
    const {map, stations, markers, arrivalStop, markerLayer} = this.state;
    const station = stations[key];
    const icon = departure ? this.greenIcon : this.redIcon;

    const newStop = {
      id: key,
      newMarker: L.marker([station.latitude, station.longitude]).setIcon(icon).addTo(map),
      originalMarker: markers[key]
    };

    this.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});
    newStop.newMarker.bindPopup(stations[key].label);
    newStop.newMarker.on("click", () => this.deselect(key));
    newStop.newMarker.on("mouseover", () => newStop.newMarker.openPopup());
    markerLayer.removeLayer(newStop.originalMarker);

    if ((departure && arrivalStop.id !== "") || !departure) {
      map.removeLayer(markerLayer);
    }
  }

  /**
   * Triggers the deselection of the stop with the given key.
   * @param key:string
   */
  deselect(key) {
    const {departureStop, arrivalStop} = this.state;
    if (departureStop.id === key) {
      this.deselectStop(true);
    } else if (arrivalStop.id === key) {
      this.deselectStop(false);
    }
  }

  /**
   * Deselect either the departureStop or the arrivalStop.
   * Remove the selected marker from the map and add the original marker back to the markerLayer.
   * Reset the stop in the state.
   * Show the markerLayer if needed.
   * @param departure:boolean, true if the departureStop has to be deselected
   */
  deselectStop(departure) {
    const {map, departureStop, arrivalStop, markerLayer} = this.state;
    const stop = departure ? departureStop : arrivalStop;
    const newStop = {id: "", newMarker: undefined, originalMarker: undefined};

    map.removeLayer(stop.newMarker);
    markerLayer.addLayer(stop.originalMarker);
    this.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});

    if (departure) {
      if (arrivalStop.id !== "") {
        map.addLayer(markerLayer);
      }
    } else {
      map.addLayer(markerLayer);
    }
  }

  render() {
    return <div id="mapid"/>;
  }
}

export default InteractiveMap;