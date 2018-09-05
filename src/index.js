import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App/App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();

const leafletJS = document.createElement("script");
leafletJS.setAttribute("href", "../node_modules/leaflet/dist/leaflet.js");
document.getElementsByTagName("head")[0].appendChild(leafletJS);