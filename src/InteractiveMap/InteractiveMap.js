import React, {Component} from 'react';
import 'whatwg-fetch';
import L from 'leaflet';
import 'leaflet.markercluster';
import './InteractiveMap.css';
import {Form, Dimmer, Loader, Input, Icon} from 'semantic-ui-react';
import ProvinceCheckbox from './ProvinceCheckbox/ProvinceCheckbox';

class InteractiveMap extends Component {

  /* Icons & icon constants */
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
      markerLayer: L.markerClusterGroup(),
      map: undefined,
      departureStop: {id: "", newMarker: undefined, originalMarker: undefined},
      arrivalStop: {id: "", newMarker: undefined, originalMarker: undefined},
      provinces: {
        "Antwerpen": {
          url: "https://belgium.linkedconnections.org/delijn/Antwerpen/stops",
          markers: undefined, stops: new Set(), shown: false
        },
        "Limburg": {
          url: "https://belgium.linkedconnections.org/delijn/Limburg/stops",
          markers: undefined, stops: new Set(), shown: false
        },
        "Oost-Vlaanderen": {
          url: "https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops",
          markers: undefined, stops: new Set(), shown: false
        },
        "West-Vlaanderen": {
          url: "https://belgium.linkedconnections.org/delijn/West-Vlaanderen/stops",
          markers: undefined, stops: new Set(), shown: false
        },
        "Vlaams-Brabant": {
          url: "https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/stops",
          markers: undefined, stops: new Set(), shown: false
        },
      },
      nmbs: {
        markers: undefined, stops: new Set(), shown: true,
      }
    };
  }

  componentDidMount() {
    const self = this;
    const {markerLayer, provinces, nmbs, stations} = this.state;

    // Setup the map
    const map = L.map('mapid').setView([50.90, 5.2], 9);
    map.options.loadingControl = true;
    map.closePopupOnClick = true;
    this.setState({map: map});
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
        }).then(function (stopsDeLijn) {
          console.log(province, "fetched");
          stopsDeLijn["@graph"].forEach(function (stop) {
            const key = stop["@id"];
            provinces[province].stops.add(key);
            stop.point = new L.LatLng(stop.latitude, stop.longitude);
            stations[key] = stop;
          });

          // FIXME this part causes the no-loop-func warning
          // Keep the checkboxes in a fetching state while the data is fetching
          fetched += 1;
          if (fetched === Object.keys(provinces).length) {
            self.setState({fetching: false});
            self.update(self);
          }
        });
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
    const {markers} = this.state;
    const key = station["@id"];

    station.label = label;
    markers[key] = L.marker([station.latitude, station.longitude]).setIcon(this.blueIcon);
    markers[key].bindPopup(label);
    markers[key].on("click", () => this.select(key));
    markers[key].on("mouseover", () => markers[key].openPopup());
  }

  /**
   * Render the markers for the given provence
   * @param province
   */
  renderMarkers(province) {
    const {markers, stations, nmbs} = this.state;
    const p = province !== undefined;
    const group = L.layerGroup();

    // Other values for NMBS
    const type = p ? province : nmbs;
    const subLabel = p ? 'De Lijn' : 'NMBS';

    // Create a marker for every stop of the province.
    for (const sID of type.stops) {
      const stop = stations[sID];
      let id = sID.split('/');
      id = id[id.length - 1];
      this.createMarker(stop, '<strong>' + stop.name + '</strong><br> ' + subLabel + '<br>ID: ' + id);

      // Add the created marker to the group.
      markers[sID].markerGroup = group;
      group.addLayer(markers[sID]);
    }
    // Set the province's/NMBS markers to the created group
    type.markers = group;

    if (province) {
      let name = province.url.split('/');
      console.log(name[name.length - 2], group);
    }
  }

  /**
   * Show or hide the province.
   *   Render the markers if needed and add them to the markerLayer.
   *   Remove the markers from the markerLayer if needed.
   * Run the callback function.
   * @param state
   * @param provinceName
   * @param callback
   */
  showProvinces(state, provinceName, callback) {
    const {nmbs, provinces, markerLayer} = state;
    let p = provinces[provinceName], source = p;
    if (p === undefined) { // NMBS
      source = undefined;
      p = nmbs;
    }

    if (p.shown) {
      // Render the markers if needed
      if (p.markers === undefined)
        this.renderMarkers(source);

      // Show the markers on the map
      markerLayer.addLayer(p.markers);
    } else if (p.markers !== undefined) {
      // Remove the markers if needed
      markerLayer.removeLayer(p.markers);
    }
    callback();
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
    const station = stations[key], original = markers[key];
    const icon = departure ? this.greenIcon : this.redIcon;

    const newStop = {
      id: key,
      newMarker: L.marker([station.latitude, station.longitude]).setIcon(icon).addTo(map),
      originalMarker: original
    };

    // Add popup and functions to new marker
    newStop.newMarker.bindPopup(stations[key].label);
    newStop.newMarker.on("click", () => this.deselect(key));
    newStop.newMarker.on("mouseover", () => newStop.newMarker.openPopup());

    // Remove the original marker from the province layer and from the markerLayer
    markerLayer.removeLayer(original);
    original.markerGroup.removeLayer(original);

    // Update the state
    this.setState(departure ? {departureStop: newStop} : {arrivalStop: newStop});

    // Hide the marker layer if both departure and arrival are selected
    if ((departure && arrivalStop.id !== "") || !departure)
      map.removeLayer(markerLayer);

    // Set the contents of the text fields
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
    const emptyStop = {id: "", newMarker: undefined, originalMarker: undefined};
    const original = stop.originalMarker;

    // Remove the marker from the map
    map.removeLayer(stop.newMarker);

    // Add the original marker back to the province layer and the markerLayer
    markerLayer.addLayer(original);
    original.markerGroup.addLayer(original);

    // Update the state
    this.setState(departure ? {departureStop: emptyStop} : {arrivalStop: emptyStop});

    // Show the marker layer
    map.addLayer(markerLayer);

    // Remove the contents of the text fields
    const fieldID = departure ? "departure-field" : "arrival-field";
    document.getElementById(fieldID).setAttribute("value", "");
  }

  /**
   * Update the given province.
   * Set the rendering icon and show/hide the province if needed.
   * @param self: used to call the right functions
   * @param province: the province to show/hide
   */
  update(self, province) {
    self.setState({rendering: true});
    self.showProvinces(self.state, province, () => self.setState({rendering: false}));
  }

  render() {
    const self = this;
    return (
      <div>
        <Form>
          <div className="ui segment">
            <Form.Group className="inline">
              <Form.Field className="inline">
                {/*<label>Starting point</label>*/}
                <Input icon={<Icon name='map marker alternate' color='green'/>}
                       label="Starting point" id="departure-field" name="departure-stop"
                       placeholder="No station selected." type="text"/>
              </Form.Field>
              <Form.Field className="inline">
                {/*<label>Destination</label>*/}
                <Input icon={<Icon name='map marker alternate' color='red'/>} label="Destination"
                       id="arrival-field" name="arrival-stop" placeholder="No station selected" type="text"/>
              </Form.Field>
            </Form.Group>
          </div>
        </Form>
        <ProvinceCheckbox
          provinces={self.state.provinces}
          nmbs={self.state.nmbs}
          loading={self.state.fetching}
          func={(e) => self.update(self, e.target.name)}/>
        <div id="mapid">
          <Dimmer active={this.state.rendering}>
            <Loader/>
          </Dimmer>
        </div>
      </div>
    );
  }
}

export default InteractiveMap;