import React, {Component} from 'react';
import {Segment, Icon, Header, Grid} from 'semantic-ui-react';
import './RouteView.css';

class RouteView extends Component {

  render() {
    const {route} = this.props;
    if (route) {
      return (
        <Segment>
          <Header as='h3'>Found Route</Header>
          <p><strong>Departure:</strong> {route[0].departureTime.toLocaleString()}</p>
          <p><strong>Arrival:</strong> {route[route.length - 1].arrivalTime.toLocaleString()}</p>
          <Grid columns={3}>
            {route.map(function (section) {
              let color = section.color === 'cyan' ? 'teal'
                : section.color === 'magenta' ? 'pink' : section.color;
              return (
                <Grid.Row stretched key={section["@id"]}>
                  <Grid.Column width={8}><Icon name="bus" color={color}/> {section.name}</Grid.Column>
                  <Grid.Column width={4}>
                    <span>{section.departureTime.toLocaleString()}</span>
                    <span>{section.departureStop}</span>
                  </Grid.Column>
                  <Grid.Column width={4}>
                    <span>{section.arrivalTime.toLocaleString()}</span>
                    <span>{section.arrivalStop}</span>
                  </Grid.Column>
                </Grid.Row>
              )
            })}
          </Grid>
        </Segment>
      );
    } else {
      return <div/>
    }
  }

}

export default RouteView;