import React, {Component} from 'react';
import {Segment, Icon, Header, Grid} from 'semantic-ui-react';
import moment from 'moment';
import './RouteView.css';

class RouteView extends Component {

  render() {
    const {routes, selected, selectRouteCallback} = this.props;
    if (routes && routes.length > 0) {
      return routes.map(function (route) {
        const start = route.trips[0], end = route.trips[route.trips.length - 1];
        const diff = moment.duration(moment(end).diff(moment(start)));
        return (
          <Segment key={'route' + routes.indexOf(route)} onClick={() => selectRouteCallback(route.routeId)}
                   secondary={selected !== route.routeId}>
            <Header as='h3'>Route Found</Header>
            <Grid columns={3}>
              <Grid.Row>
                <Grid.Column>
                  <strong>Departure:</strong> {moment(start.departureTime).format('ddd MMM Do, HH:mm')} <br/>at {start.departureStopName}
                </Grid.Column>
                <Grid.Column>
                  <strong>Arrival:</strong> {moment(end.arrivalTime).format('ddd MMM Do, HH:mm')} <br/>at {end.arrivalStopName}
                </Grid.Column>
                <Grid.Column>
                  <strong>Travel time:</strong> {diff.humanize()} <br/>
                  {route.trips.length - 1} switches
                </Grid.Column>
              </Grid.Row>
            </Grid>
            {route.trips.map(function (section) {
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
                        <Grid.Row>{moment(section.departureTime).format('ddd MMM Do, HH:mm')}</Grid.Row>
                      </Grid.Column>
                      <Grid.Column width={4}>
                        <Grid.Row><strong>to</strong> {section.arrivalStopName}</Grid.Row>
                        <Grid.Row>{moment(section.arrivalTime).format('ddd MMM Do, HH:mm')}</Grid.Row>
                      </Grid.Column>
                    </Grid.Row>
                  </Grid>
                </Segment>
              )
            })}
          </Segment>
        );
      });
    } else {
      return <div/>;
    }
  }

}

export default RouteView;