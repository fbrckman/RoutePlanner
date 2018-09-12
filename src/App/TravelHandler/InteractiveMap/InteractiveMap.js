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
  CONNECTION_COLOR = "rgba(1, 1, 160, 0.75)";
  RESULT_COLOR = "rgb(183, 0, 33)";
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
      selectedStops: L.featureGroup(),
      lines: L.layerGroup(),
      route: L.layerGroup(),
      map: undefined,
      nmbs: {
        markers: undefined, stops: new Set(), shown: false,
      }
    };

    this.createMarker = this.createMarker.bind(this);
    this.renderMarkers = this.renderMarkers.bind(this);
    this.showProvinces = this.showProvinces.bind(this);

    this.select = this.select.bind(this);
    this.selectStop = this.selectStop.bind(this);
    this.deselectStop = this.deselectStop.bind(this);

    this.drawConnection = this.drawConnection.bind(this);
    this.drawResult = this.drawResult.bind(this);
    this.clearLines = this.clearLines.bind(this);

    this.update = this.update.bind(this);
    this.onMapClick = this.onMapClick.bind(this);
  }

  componentDidMount() {
    const self = this;
    const {markerLayer, nmbs, stations, selectedStops} = this.state;
    const {provinces} = this.props;

    // Setup the map
    const map = L.map('mapid').setView([50.85, 4.35, 5.2], 8);
    map.options.loadingControl = true;
    map.closePopupOnClick = true;
    this.popup = L.popup();
    map.on("click", (e) => this.onMapClick(e));
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
        window.fetch(provinces[province].stopsUrl).then(function (response) {
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
            self.update(province);
          }
        });
      }
    }).catch(function (ex) {
      console.error(ex);
    });

    map.addLayer(markerLayer);

    window.addEventListener("connection", (event) => {
      console.log("connection");
      this.drawConnection(event.detail.connection);
    });
    window.addEventListener("result", (event) => {
      console.log("result");
      this.drawResult(event.detail.result);
    });
    window.addEventListener("submit", () => {
      this.clearLines();
      map.fitBounds(selectedStops.getBounds());
    });
    window.addEventListener("cancel", () => this.clearLines());
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
   * @param props
   * @param provinceName
   * @param callback
   */
  showProvinces(props, provinceName, callback) {
    const {nmbs, markerLayer} = this.state;
    const {provinces} = props;
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
      this.selectStop(key, true);
    } else if (arrivalStop.id === this.DEFAULT_ID && key !== departureStop.id) {
      // Select the clicked station as the new arrivalStop
      this.selectStop(key, false);
    }
  }

  /**
   * Select the stop with the given key.
   * Add the stop to the state, remove the old marker from the markerLayer and add a new colored marker to the map.
   * Remove the markerLayer if needed.
   * @param key:string
   * @param departure:boolean, true if the stop is a departureStop
   * @param customLocation:boolean, true if the stop has a custom location and is not a predefined stop
   * @param lat:number, Latitude of the stop if it's a custom location
   * @param lng:number, Longitude of the stop if it's a custom location
   */
  selectStop(key, departure, customLocation = false, lat = 0, lng = 0) {
    // const self = this;
    const {map, stations, markers, markerLayer, selectedStops} = this.state;
    const {arrivalStop} = this.props;
    const station = stations[key], original = markers[key];
    const icon = departure ? this.greenIcon : this.redIcon;

    if (!departure && arrivalStop.id !== this.DEFAULT_ID) {
      if (arrivalStop.id !== this.CUSTOM_ID) { // arrivalStop is a predefined stop
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
    newStop.newMarker.on("click", () => this.deselectStop(departure, customLocation));
    newStop.newMarker.on("mouseover", () => newStop.newMarker.openPopup());
    selectedStops.addLayer(newStop.newMarker);

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
    this.props.setStopCallback(newStop, departure);

    // Hide the marker layer if both departure and arrival are selected
    if ((departure && arrivalStop.id !== this.DEFAULT_ID) || !departure)
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
    const {map, markerLayer, selectedStops} = this.state;
    const {departureStop, arrivalStop} = this.props;
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
    selectedStops.removeLayer(stop.newMarker);

    // Show the marker layer
    map.addLayer(markerLayer);

    // Update the state
    this.props.setStopCallback(emptyStop, departure);

    InteractiveMap.setFieldVal(departure, "");
  }

  /* Polylines  ----------------------------------------------------------------------------------------------------- */

  drawConnection(connection) {
    const {stations, lines, map} = this.state;
    const start = stations[connection.departureStop], end = stations[connection.arrivalStop];
    if (start === undefined) {
      console.error("Station (departure) is undefined:", connection.departureStop);
    } else if (end === undefined) {
      console.error("Station (arrival) is undefined:", connection.arrivalStop);
    } else {
      const startPosition = start.point,
        endPosition = end.point;
      const polyline = L.polyline([startPosition, endPosition], {color: this.CONNECTION_COLOR});
      lines.addLayer(polyline);
      map.addLayer(polyline);
    }
  }

  drawResult(connections) {
    for (const c of connections) {
      console.log(c);
    }
  }

  clearLines() {
    console.log("clearLines");
    const {map, lines} = this.state;
    console.log(lines);
    map.removeLayer(lines);
    this.setState({lines: L.layerGroup()});
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
   * @param province: the province to show/hide
   */
  update(province) {
    this.setState({rendering: true});
    this.showProvinces(this.props, province, () => this.setState({rendering: false}));
  }

  /**
   * Function executed when the map is clicked.
   * Creates a marker on the clicked location.
   * @param e: the click event
   */
  onMapClick(e) {
    // TODO enable custom locations
    // const departure = this.props.departureStop.id === this.DEFAULT_ID;
    // this.selectStop(this, this.CUSTOM_ID, departure, true, e.latlng.lat, e.latlng.lng);
  }

  /* Render --------------------------------------------------------------------------------------------------------- */

  render() {
    const {nmbs, rendering, fetching} = this.state;
    const {provinces} = this.props;
    return (
      <div>
        <Grid divided columns='equal'>
          <Grid.Column width={3}>
            <ProvinceCheckbox
              provinces={provinces} nmbs={nmbs} loading={fetching} func={(e) => this.update(e.target.name)}
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