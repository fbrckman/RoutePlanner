import React, {Component} from 'react';
import {Segment, Icon, Header} from 'semantic-ui-react';
import './RouteView.css';

class RouteView extends Component {

  render() {
    const {route} = this.props;
    if (route) {
      return (
        <Segment vertical>
          <Header as='h3'>Found Route</Header>
          {route.map(function (section) {
            let color = section.color === 'cyan' ? 'teal' : section.color;
            return (
              <div key={section["@id"]}>
                <Segment>
                  <Icon name="bus" color={color}/>
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