import React, {Component} from 'react';
import 'whatwg-fetch';
import L from 'leaflet';
import 'leaflet.markercluster';
import './InteractiveMap.css';
import {Dimmer, Loader, Grid} from 'semantic-ui-react';
import ProvinceCheckbox from './ProvinceCheckbox/ProvinceCheckbox';

class InteractiveMap extends Component {

  DEFAULT_ID = "";
  CUSTOM_ID = "CUSTOM";
  popup;

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
    this.popup = L.popup();
    map.on("click", (e) => self.onMapClick(e, self));
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

  /* Markers & Rendering -------------------------------------------------------------------------------------------- */

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

  /* (De)Selecting -------------------------------------------------------------------------------------------------- */

  /**
   * Triggers the selection of the stop with the given key.
   * @param key:string
   */
  select(key) {
    const {departureStop, arrivalStop} = this.props;

    if (departureStop.id === this.DEFAULT_ID) {
      // Select the clicked station as the new departureStop
      this.selectStop(this, key, true);
    } else if (arrivalStop.id === this.DEFAULT_ID && key !== departureStop.id) {
      // Select the clicked station as the new arrivalStop
      this.selectStop(this, key, false);
    }
  }

  /**
   * Select the stop with the given key.
   * Add the stop to the state, remove the old marker from the markerLayer and add a new colored marker to the map.
   * Remove the markerLayer if needed.
   * @param self = this
   * @param key:string
   * @param departure:boolean, true if the stop is a departureStop
   * @param customLocation:boolean, true if the stop has a custom location and is not a predefined stop
   * @param lat:number, Latitude of the stop if it's a custom location
   * @param lng:number, Longitude of the stop if it's a custom location
   */
  selectStop(self, key, departure, customLocation = false, lat = 0, lng = 0) {
    const {map, stations, markers, markerLayer} = self.state;
    const {arrivalStop, handler} = self.props;
    const station = stations[key], original = markers[key];
    const icon = departure ? self.greenIcon : self.redIcon;

    if (!departure && arrivalStop.id !== self.DEFAULT_ID) {
      if (arrivalStop.id !== self.CUSTOM_ID) { // arrivalStop is a predefined stop
        // Add the original marker back to its group and to the markerLayer
        arrivalStop.originalMarker.markerGroup.addLayer(arrivalStop.originalMarker);
        markerLayer.addLayer(arrivalStop.originalMarker);
      }
      map.removeLayer(arrivalStop.newMarker);
    }

    // Set the label and position according to customLocation
    const label = customLocation
      ? "<strong>Lat:</strong> " + lat + "<br><strong>Lng:</strong> " + lng
      : stations[key].label;
    const position = customLocation ? [lat, lng] : [station.latitude, station.longitude];

    // Create the new stop
    const newStop = {
      id: key,
      newMarker: L.marker(position, {draggable: customLocation}).setIcon(icon).addTo(map),
      originalMarker: original
    };

    // Add popup and functions to new marker
    newStop.newMarker.bindPopup(label);
    newStop.newMarker.on("click", () => self.deselectStop(departure, customLocation));
    newStop.newMarker.on("mouseover", () => newStop.newMarker.openPopup());

    if (customLocation) {
      // Update position when dragging
      newStop.newMarker.on("dragend", (e) => {
        const marker = e.target;
        const pos = marker.getLatLng();
        marker.setLatLng(pos, {draggable: true})
          .bindPopup("<strong>Lat:</strong> " + pos.lat + "<br><strong>Lng:</strong> " + pos.lng)
          .update();
      });

      InteractiveMap.setFieldVal(departure, '± ' + lat.toFixed(3) + ', ± ' + lng.toFixed(3));
    } else {
      // Remove the original marker from the province layer and from the markerLayer
      markerLayer.removeLayer(original);
      original.markerGroup.removeLayer(original);

      InteractiveMap.setFieldVal(departure, station.name);
    }

    // Update the state
    self.props.setStopCallback(handler, newStop, departure);

    // Hide the marker layer if both departure and arrival are selected
    if ((departure && arrivalStop.id !== self.DEFAULT_ID) || !departure)
      map.removeLayer(markerLayer);
  }

  /**
   * Deselect either the departureStop or the arrivalStop.
   * Remove the selected marker from the map and add the original marker back to the markerLayer.
   * Reset the stop in the state.
   * Show the markerLayer if needed.
   * @param departure:boolean, true if the departureStop has to be deselected
   * @param customLocation:boolean, true if the stop has a custom location and is not a predefined stop
   */
  deselectStop(departure, customLocation = false) {
    const {map, markerLayer} = this.state;
    const {departureStop, arrivalStop, handler} = this.props;
    const stop = departure ? departureStop : arrivalStop;
    const emptyStop = {id: this.DEFAULT_ID, newMarker: undefined, originalMarker: undefined};

    if (!customLocation) {
      const original = stop.originalMarker;
      // Add the original marker back to the province layer and the markerLayer
      markerLayer.addLayer(original);
      original.markerGroup.addLayer(original);
    }

    // Remove the marker from the map
    map.removeLayer(stop.newMarker);

    // Show the marker layer
    map.addLayer(markerLayer);

    // Update the state
    this.props.setStopCallback(handler, emptyStop, departure);

    InteractiveMap.setFieldVal(departure, "");
  }

  /* Misc. ---------------------------------------------------------------------------------------------------------- */

  /**
   * Set the content of the text field.
   * @param departure:boolean, indicates if the departure field should be addressed
   * @param content:string, the new value of the text field
   */
  static setFieldVal(departure, content) {
    const fieldID = departure ? "departure-field" : "arrival-field";
    document.getElementById(fieldID).setAttribute("value", content);
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

  onMapClick(e, self) {
    const departure = self.props.departureStop.id === self.DEFAULT_ID;
    self.selectStop(self, self.CUSTOM_ID, departure, true, e.latlng.lat, e.latlng.lng);
  }

  /* Render --------------------------------------------------------------------------------------------------------- */

  render() {
    const self = this;
    const {provinces, nmbs, rendering, fetching} = this.state;
    return (
      <div>
        <Grid divided columns='equal'>
          <Grid.Column width={3}>
            <ProvinceCheckbox
              provinces={provinces} nmbs={nmbs} loading={fetching} func={(e) => self.update(self, e.target.name)}
            />
          </Grid.Column>
          <Grid.Column>
            <div id="mapid">
              <Dimmer active={rendering}>
                <Loader/>
              </Dimmer>
            </div>
          </Grid.Column>
        </Grid>
      </div>
    );
  }
}

export default InteractiveMap;