import React, {Component} from 'react';
import DateTime from 'react-datetime';
import {Form, Select, Input, Icon} from 'semantic-ui-react';

const options = [
  {key: "a", text: "Arrival", value: "arrival"},
  {key: "d", text: "Departure", value: "departure"}
];

class TravelForm extends Component {

  state = {
    datetime: new Date(),
    type: "departure",
    submit: false,
  };

  static setFullDate(currentDT, newDT) {
    newDT.setDate(currentDT.getDate());
    newDT.setMonth(currentDT.getMonth());
    newDT.setFullYear(currentDT.getFullYear());
    return newDT;
  }

  static setTime(currentDT, newDT) {
    newDT.setHours(currentDT.getHours());
    newDT.setMinutes(currentDT.getMinutes());
    newDT.setSeconds(0);
    newDT.setMilliseconds(0);
    return newDT;
  }

  handleChange = (e, {name, value}) => {
    this.setState({submit: false});
    this.setState({[name]: value});
    console.log(this.state);
  };

  handleDateChange = (e) => {
    this.setState({submit: false});
    const dt = e["_d"];
    const current = this.state.datetime;
    let newDT = TravelForm.setTime(current, TravelForm.setFullDate(dt, new Date()));
    this.setState({datetime: newDT});
  };
  handleTimeChange = (e) => {
    this.setState({submit: false});
    const dt = e["_d"];
    const current = this.state.datetime;
    let newDT = TravelForm.setTime(dt, TravelForm.setFullDate(current, new Date()));
    this.setState({datetime: newDT});
  };

  handleSubmit = () => {
    this.setState({submit: true});
  };

  render() {
    const {type, submit} = this.state;
    const {departureStop, arrivalStop} = this.props;
    const dt = this.state.datetime, m = dt.getMinutes();
    // TODO internationalization
    const dateString = dt.getDate() + '-' + (dt.getMonth() + 1) + '-' + dt.getFullYear(),
          timeString = dt.getHours() + ':' + (m < 10 ? '0' + m : m);

    return (
      <div className="ui segment">
        <Form onSubmit={this.handleSubmit}>
          <Form.Group widths="equal">
            <Form.Field control={Select} options={options} placeholder='Choose an option...'
                        name='type' value={type} onChange={this.handleChange}/>
            <Form.Field control={DateTime} dateFormat="DD-MM-YYYY" timeFormat={false}
                        inputProps={{placeholder: dateString, format: 'DD-MM-YYYY'}}
                        name='date' onChange={this.handleDateChange}/>
            <Form.Field control={DateTime} dateFormat={false} timeFormat="HH:mm"
                        inputProps={{placeholder: timeString, format: 'HH:mm'}}
                        name='time' onChange={this.handleTimeChange}/>
            <Form.Button content='Submit'/>
          </Form.Group>

          <Form.Group className="inline">
            <Form.Field className="inline">
              <Input icon={<Icon name='map marker alternate' color='green'/>}
                     label="Starting point" id="departure-field" name="departure-stop"
                     placeholder="No station selected." type="text"/>
            </Form.Field>
            <Form.Field className="inline">
              <Input icon={<Icon name='map marker alternate' color='red'/>} label="Destination"
                     id="arrival-field" name="arrival-stop" placeholder="No station selected" type="text"/>
            </Form.Field>
            <Form.Field>
              <Form.Button content="Submit" disabled={departureStop.id === "" || arrivalStop.id === ""}/>
            </Form.Field>
          </Form.Group>
        </Form>
        <p hidden={!submit}>
          You chose {this.state.type} at {dt.toDateString()} {this.state.datetime.getHours()}:
          {dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes()}
        </p>
      </div>
    );
  }
}

export default TravelForm;