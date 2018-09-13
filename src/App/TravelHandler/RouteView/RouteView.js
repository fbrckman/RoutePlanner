import React, {Component} from 'react';
import {Segment, Icon} from 'semantic-ui-react';
import './RouteView.css';

class RouteView extends Component {

  render() {
    const {route} = this.props;
    if (route) {
      return (
        <Segment vertical>
          {route.map(function (section) {
            return (
              <div key={section["@id"]}>
                <Segment>
                  <Icon name="bus" color={section.color}/>
                  {section["http://vocab.gtfs.org/terms#headsign"].replace(/"/g, "")}
                </Segment>
              </div>
            )
          })}
        </Segment>
      );
    } else {
      return <div/>
    }
  }

}

export default RouteView;