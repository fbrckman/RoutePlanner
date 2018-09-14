import React, {Component} from 'react';
import {Segment, Icon, Header, Grid} from 'semantic-ui-react';
import './RouteView.css';

class RouteView extends Component {

  render() {
    const {routes} = this.props;
    if (routes && routes.length > 0) {
      return routes.map(function (route) {
        const start = route[0], end = route[route.length - 1];
        const diff = new Date(end.arrivalTime - start.departureTime);
        return (
          <div key={'route' + routes.indexOf(route)}>
            <Header as='h3'>Route Found</Header>
            <Grid columns={3}>
              <Grid.Row>
                <Grid.Column>
                  <strong>Departure:</strong> {start.departureTime.toLocaleString()} <br/>at {start.departureStopName}
                </Grid.Column>
                <Grid.Column>
                  <strong>Arrival:</strong> {end.arrivalTime.toLocaleString()} <br/>at {end.arrivalStopName}
                </Grid.Column>
                <Grid.Column>
                  <strong>Travel time:</strong> {diff.getHours()} hours, {diff.getMinutes()} minutes <br/>
                  {route.length - 1} switches
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
      });
    } else {
      return <div/>;
    }
  }

}

export default RouteView;