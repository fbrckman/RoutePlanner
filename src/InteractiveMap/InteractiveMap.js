import React, {Component} from 'react';
import 'whatwg-fetch';
import L from 'leaflet';
import 'leaflet.markercluster';
import './InteractiveMap.css';
import {Form, Dimmer, Loader} from 'semantic-ui-react';
import ProvinceCheckbox from './ProvinceCheckbox';

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

  constructor() {
    super();
    this.state = {
      fetching: true,
      rendering: false,
      stations: {},
      markers: {},
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
      markerLayer: L.markerClusterGroup(),
      map: undefined,
      provinces: {
        "Oost-Vlaanderen": {
          url: "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops",
          markers: undefined,
          stops: new Set(),
          shown: false
        },
        "Limburg": {
          url: "https://belgium.linkedconnections.org/delijn/Limburg/stops",
          markers: undefined,
          stops: new Set(),
          shown: false
        },
        "West-Vlaanderen": {
          url: "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/stops",
          markers: undefined,
          stops: new Set(),
          shown: false
        },
        "Vlaams-Brabant": {
          url: "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/stops",
          markers: undefined,
          stops: new Set(),
          shown: false
        },
        "Antwerpen": {
          url: "https://belgium.linkedconnections.org/delijn/Antwerpen/stops",
          markers: undefined,
          stops: new Set(),
          shown: false
        },
      },
      nmbs: {
        markers: undefined,
        stops: new Set(),
        shown: false,
      }
    };
  }

  componentDidMount() {
    const self = this;
    const {markerLayer, provinces, nmbs, stations} = this.state;

    const map = L.map('mapid').setView([50.90, 5.2], 9);
    map.options.loadingControl = true;
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
        const key = station["@id"];
        nmbs.stops.add(key);
        station.point = new L.LatLng(station.latitude, station.longitude);
        stations[key] = station;
      });

      // Keeping track of the number of fetched provinces
      let fetched = 0;

      // De Lijn
      for (let province of Object.keys(provinces)) {
        window.fetch(provinces[province].url).then(function (response) {
          return response.json();
        }).then(function (stopsDeLijn) { // FIXME no-loop-func
          stopsDeLijn["@graph"].forEach(function (stop) {
            const key = stop["@id"];
            provinces[province].stops.add(key);
            stop.point = new L.LatLng(stop.latitude, stop.longitude);
            stations[key] = stop;
          });

          // Keep the checkboxes in a fetching state while the data is fetching
          fetched += 1;
          if (fetched === Object.keys(provinces).length) {
            self.setState({fetching: false});
          }
        });
      }

    }).catch(function (ex) {
      console.error(ex);
    });

    map.addLayer(markerLayer);
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

    const fieldID = departure ? "departure-field" : "arrival-field";
    document.getElementById(fieldID).setAttribute("value", station.name);
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

    if ((departure && arrivalStop.id !== "") || !departure) {
      map.addLayer(markerLayer);
    }

    const fieldID = departure ? "departure-field" : "arrival-field";
    document.getElementById(fieldID).setAttribute("value", "");
  }

  /**
   * Create a marker for the given station with the given label.
   * @param station
   * @param label:string, shown as a popup when hovering over the marker
   */
  createMarker(station, label) {
    const {markers} = this.state;
    const key = station["@id"];

    station.label = label;
    markers[key] = L.marker([station.latitude, station.longitude]).setIcon(this.blueIcon);
    markers[key].bindPopup(label);
    markers[key].on("click", () => this.select(key));
    markers[key].on("mouseover", () => markers[key].openPopup());
  }

  renderMarkers(province) {
    const {markers, stations, nmbs} = this.state;
    const p = province !== undefined;
    const group = L.layerGroup();

    const type = p ? province : nmbs;
    const subLabel = p ? 'De Lijn' : 'NMBS';

    for (const sID of type.stops) {
      const stop = stations[sID];
      this.createMarker(stop, '<strong>' + stop.name + '</strong><br> ' + subLabel);
      group.addLayer(markers[sID]);
    }
    type.markers = group;
  }

  showProvinces(state, callback) {
    const {nmbs, provinces, markerLayer} = state;

    // Handle each province
    for (const key of Object.keys(provinces)) {
      const p = provinces[key];
      if (p.shown) {
        // Render the markers if needed
        if (p.markers === undefined) {
          this.renderMarkers(p);
        }
        // Show the markers on the map
        markerLayer.addLayer(p.markers);
      } else if (p.markers !== undefined) {
        // Remove the markers if needed
        markerLayer.removeLayer(p.markers);
      }
    }

    // Handle the NMBS markers seperately
    if (nmbs.shown) {
      if (nmbs.markers === undefined) {
        this.renderMarkers(undefined);
      }
      markerLayer.addLayer(nmbs.markers);
    } else if (nmbs.markers !== undefined) {
      markerLayer.removeLayer(nmbs.markers);
    }
    callback();
  }

  render() {
    const self = this;
    return (
      <div>
        <Form>
          <Form.Group className="inline">
            <Form.Field className="inline">
              <label>Starting point</label>
              <input id="departure-field" name="departure-stop" placeholder="No station selected." type="text"/>
            </Form.Field>
            <Form.Field className="inline">
              <label>Destination</label>
              <input id="arrival-field" name="arrival-stop" placeholder="No station selected" type="text"/>
            </Form.Field>
          </Form.Group>
        </Form>
        <ProvinceCheckbox
          provinces={self.state.provinces}
          nmbs={self.state.nmbs}
          loading={self.state.fetching}
          func={() => {
            self.setState({rendering: true}, () => self.showProvinces(self.state, () => self.setState({rendering: false})));
          }}/>
        <div id="mapid">
          <Dimmer active={this.state.rendering}>
            <Loader />
          </Dimmer>
        </div>
      </div>
    );
  }
}

//<div className="ui checkbox toggle">
//  <input type="checkbox" name={province} id={province} value={self.state.provinces[province].shown}/>
//  <label>{province}</label>
//</div>

export default InteractiveMap;