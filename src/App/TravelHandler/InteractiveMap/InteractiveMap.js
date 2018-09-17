import React, {Component} from 'react';
import 'whatwg-fetch';
import L from 'leaflet';
import 'leaflet.markercluster';
import './InteractiveMap.css';
import {Dimmer, Loader, Grid, Button} from 'semantic-ui-react';
import ProvinceCheckbox from './ProvinceCheckbox/ProvinceCheckbox';

class InteractiveMap extends Component {

  DEFAULT_ID = "";
  CUSTOM_ID = "CUSTOM";
  CONNECTION_COLOR = "rgba(3, 112, 170, 0.6)";
  GREY = "rgba(100, 100, 100, 1)";
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
      markers: {},
      markerLayer: L.markerClusterGroup(),
      selectedStops: L.featureGroup(),
      lines: L.layerGroup(),
      routeLines: [],
      visibleLines: false,
      map: undefined,
      nmbs: {
        markers: undefined, stops: new Set(), shown: false,
      }
    };

    this.createMarker = this.createMarker.bind(this);
    this.renderMarkers = this.renderMarkers.bind(this);
    this.showProvinces = this.showProvinces.bind(this);

    this.drawPolyline = this.drawPolyline.bind(this);
    this.drawConnection = this.drawConnection.bind(this);
    this.drawResult = this.drawResult.bind(this);

    this.select = this.select.bind(this);
    this.selectStop = this.selectStop.bind(this);
    this.deselectStop = this.deselectStop.bind(this);

    this.clearLayers = this.clearLayers.bind(this);
    this.clearCalculationLines = this.clearCalculationLines.bind(this);
    this.clearAllLines = this.clearAllLines.bind(this);
    this.clearSelectedMarkers = this.clearSelectedMarkers.bind(this);

    this.update = this.update.bind(this);
    this.onMapClick = this.onMapClick.bind(this);
  }

  componentDidMount() {
    const self = this;
    const {markerLayer, nmbs, selectedStops} = this.state;
    const {provinces, stations} = this.props;

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
          // console.log(province, "fetched");
          stopsDeLijn["@graph"].forEach(function (stop) {
            const key = stop["@id"];
            provinces[province].stops.add(key);
            stop.point = new L.LatLng(stop.latitude, stop.longitude);
            stop.province = province;
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
      this.drawConnection(event.detail.connection);
    });
    window.addEventListener("result", (event) => {
      this.drawResult(event.detail.result, event.detail.id, !event.detail.keepCalculating);
    });
    window.addEventListener("submit", () => {
      this.clearAllLines();
      if (Object.keys(selectedStops["_layers"]).length > 0) map.fitBounds(selectedStops.getBounds());
    });
    window.addEventListener("cancel", this.clearCalculationLines);
    window.addEventListener("select", (event) => this.selectRoute(event.detail.routeId));
    window.addEventListener("clear", this.clearSelectedMarkers);
  }

  /* Markers -------------------------------------------------------------------------------------------------------- */

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
    const {markers, nmbs} = this.state;
    const {stations} = this.props;
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

  /* Polylines  ----------------------------------------------------------------------------------------------------- */

  static bringToFront(layers) {
    layers = layers["_layers"];
    if (layers && Object.keys(layers).length > 0) {
      for (const l in layers) {
        if (layers.hasOwnProperty(l)) {
          const layer = layers[l];
          layer.bringToFront();
        }
      }
    }
  }

  setColor(layers, color=true) {
    layers = layers["_layers"];
    if (layers && Object.keys(layers).length > 0) {
      for (const l in layers) {
        if (layers.hasOwnProperty(l)) {
          const layer = layers[l];
          layer.setStyle(color ? {color: layer.color} : {color: this.GREY});
        }
      }
    }
  }

  /**
   * Draw a line on the given connection, from departureStop to arrivalStop.
   * @param connection:object with departureStop and arrivalStop
   * @param color:string
   * @param weight:number
   * @returns L.Polyline
   */
  drawPolyline(connection, color, weight) {
    let polyline = undefined;
    const {stations} = this.props;
    const start = stations[connection.departureStop], end = stations[connection.arrivalStop];
    if (start === undefined) {
      console.error("Station (departure) is undefined:", connection.departureStop);
    } else if (end === undefined) {
      console.error("Station (arrival) is undefined:", connection.arrivalStop);
    } else {
      this.setState({visibleLines: true});
      const startPosition = start.point, endPosition = end.point;
      polyline = L.polyline([startPosition, endPosition], {color: color, weight: weight});
    }
    return polyline
  }

  /**
   * Draw a line on the given connection, from departureStop to arrivalStop.
   * These are rendered while calculating.
   * @param connection:object with departureStop and arrivalStop
   */
  drawConnection(connection) {
    const polyline = this.drawPolyline(connection, this.CONNECTION_COLOR, 2);
    if (polyline) {
      const {lines, map} = this.state;
      lines.addLayer(polyline);
      map.addLayer(polyline);
    }
  }

  /**
   * Draw the result on the given connections.
   * Used when drawing the resulting routeLines.
   * This line is thicker and more colorful than the "calculating"-connections.
   * For each routeLines, the line gets another color.
   * A popup with the name of the routeLines will open on mousover.
   *
   * @param connections: array with connection objects
   * @param routeId:number, id of the route
   * @param lastResult:boolean, true if this is the last calculated resulted
   */
  drawResult(connections, routeId, lastResult) {
    const {routeLines, map} = this.state;
    if (lastResult) this.clearCalculationLines();
    const group = L.featureGroup();

    for (const c of connections) {
      const polyline = this.drawPolyline(c, c.color, 4);
      if (polyline) {
        const name = c["http://vocab.gtfs.org/terms#headsign"].replace(/"/g, "");
        polyline.color = c.color;
        polyline.bindPopup(name);
        polyline.on("mouseover", () => polyline.openPopup());
        group.addLayer(polyline);
        map.addLayer(polyline);
      }
    }
    group.routeId = routeId;
    routeLines.push(group);
    map.fitBounds(group.getBounds());
    this.selectRoute(group.routeId);
  }

  selectRoute(routeId) {
    for (const route of this.state.routeLines) {
      this.setColor(route, route.routeId === routeId);
      if (route.routeId === routeId) InteractiveMap.bringToFront(route);
    }
  }

  /* (De)Selecting -------------------------------------------------------------------------------------------------- */

  /**
   * Triggers the selection of the stop with the given key.
   * Clear all drawn lines in the process.
   * @param key:string
   */
  select(key) {
    this.clearAllLines();
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
    const {map, markers, markerLayer, selectedStops} = this.state;
    const {arrivalStop, stations} = this.props;
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
      province: stations[key].province,
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
   * Clear all drawn lines in the process.
   * Remove the selected marker from the map and add the original marker back to the markerLayer.
   * Reset the stop in the state.
   * Show the markerLayer if needed.
   * @param departure:boolean, true if the departureStop has to be deselected
   * @param customLocation:boolean, true if the stop has a custom location and is not a predefined stop
   */
  deselectStop(departure, customLocation = false) {
    this.clearAllLines();
    window.dispatchEvent(new CustomEvent("cancel"));

    const {map, markerLayer, selectedStops} = this.state;
    const {departureStop, arrivalStop} = this.props;
    const stop = departure ? departureStop : arrivalStop;
    const emptyStop = {id: this.DEFAULT_ID, province: "", newMarker: undefined, originalMarker: undefined};

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

  /* Clear --------------------------------------------------------------------------------------------------------- */

  /**
   * Clear the given layers from the map.
   * @param layers:LayerGroup
   */
  clearLayers(layers) {
    const {map} = this.state;
    layers = layers["_layers"];
    if (layers && Object.keys(layers).length > 0) {
      for (const l in layers) {
        if (layers.hasOwnProperty(l)) {
          const layer = layers[l];
          map.removeLayer(layer);
        }
      }
    }
  }

  /**
   * Clear the calculation lines from the map.
   */
  clearCalculationLines() {
    this.clearLayers(this.state.lines);
    this.setState({lines: L.layerGroup()});
  }

  /**
   * Clear the calculation lines and the routeLines from the map.
   */
  clearAllLines() {
    this.clearCalculationLines();
    for (const l of this.state.routeLines) this.clearLayers(l);
    this.setState({routeLines: [], visibleLines: false});
  }

  /**
   * Deselect both the departure and arrival stops.
   */
  clearSelectedMarkers() {
    this.deselectStop(true);
    this.deselectStop(false);
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
    const {nmbs, rendering, fetching, visibleLines} = this.state;
    const {provinces, calculating} = this.props;
    return (
      <div>
        <Grid divided columns='equal'>
          <Grid.Column width={3}>
            <Grid.Row>
              <ProvinceCheckbox
                provinces={provinces} nmbs={nmbs} loading={fetching} disabled={calculating}
                func={(e) => this.update(e.target.name)}
              />
            </Grid.Row>
            <Grid.Row hidden={!visibleLines} align='center'>
              <Button onClick={this.clearCalculationLines} content="Clear lines"/>
            </Grid.Row>
          </Grid.Column>
          <Grid.Column>
            <Grid.Row className='mapColumn'>
              <div id="mapid">
                <Dimmer active={rendering}>
                  <Loader/>
                </Dimmer>
              </div>
            </Grid.Row>
          </Grid.Column>
        </Grid>
      </div>
    );
  }
}

export default InteractiveMap;