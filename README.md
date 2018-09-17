# Linked Connections Route Planner

A proof of concept route planner using Linked Connections.

## Usage
First, install the application and its dependencies:
```
git clone https://gitlab.ilabt.imec.be/lodi/lc-route-planner.git
cd /path/to/lc-route-planner
npm install
```
Start the application:
```
npm start
```

## Classes
###  `TravelHandler`
* Parent class. Contains a `Calculator`, `TravelForm`, `InteractiveMap` and `RouteView`. 
* Handles the data exchange between its child components. 
* In charge of additional parsing, events and callbacks.

### `Calculator`
* Instance of the [Linked Connections Client](https://github.com/linkedconnections/client.js). 
* Queries the province planner to calculate routes between two stations given a given departure time.

### `TravelForm`
* Form for entering departure time and optional latest departure time. 
* Contains buttons to clear and submit the form.

### `InteractiveMap`
* Component in charge of the graphical portion of the application. 
* Contains a [Leaflet](https://leafletjs.com/) map to visualize the selecting of departure and arrival stops (green and red markers, respectively), the calculation of the route and multiple results. 
* Contains a button to clear the current calculation lines from the map.
* Contains a `ProvinceCheckbox` component.

#### `ProvinceCheckbox`
* List of checkboxes to toggle the visible provinces. 
* Will be disabled when fetching the data and when calculating the routes.

### `RouteView`
* Component used to list the calculated results. 
* Each result is visualized using the different routes, summarized by the departure and arrival (stops and time). 
* Clicking on a result will select the result and show it on the map. The other result will be shown in grey.


