import React, {Component} from 'react';
import {Segment, Icon, Header, Grid} from 'semantic-ui-react';
import './RouteView.css';

class RouteView extends Component {

  render() {
    const {route} = this.props;
    if (route) {
      const start = route[0], end = route[route.length - 1];
      return (
        <div>
          <Header as='h3'>Found Route</Header>
          <Grid columns={2}>
            <Grid.Row>
              <Grid.Column>
                <strong>Departure:</strong> {start.departureTime.toLocaleString()} at {start.departureStopName}
              </Grid.Column>
              <Grid.Column>
                <strong>Arrival:</strong> {end.arrivalTime.toLocaleString()} at {end.arrivalStopName}
              </Grid.Column>
            </Grid.Row>
          </Grid>

          {route.map(function (section) {
            let color = section.color === 'cyan' ? 'teal'
              : section.color === 'magenta' ? 'pink' : section.color;
            return (
              <Segment key={section["@id"]}>
                <Grid columns={3} verticalAlign='middle'>
                  <Grid.Row stretched>
                    <Grid.Column width={8}>
                      <Grid.Row><Icon name="bus" color={color}/> {section.name}</Grid.Row>
                    </Grid.Column>
                    <Grid.Column width={4}>
                      <Grid.Row><strong>From</strong> {section.departureStopName}</Grid.Row>
                      <Grid.Row>{section.departureTime.toLocaleString()}</Grid.Row>
                    </Grid.Column>
                    <Grid.Column width={4}>
                      <Grid.Row><strong>to</strong> {section.arrivalStopName}</Grid.Row>
                      <Grid.Row>{section.arrivalTime.toLocaleString()}</Grid.Row>
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Segment>
            )
          })}
        </div>
      );
    } else {
      return <div/>
    }
  }

}

export default RouteView;