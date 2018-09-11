import React, {Component} from 'react';
import DateTime from 'react-datetime';
import {Form, Select, Input, Icon, Message} from 'semantic-ui-react';

const options = {
  false: {key: "a", text: "Arrival", value: false},
  true: {key: "d", text: "Departure", value: true}
};

class TravelForm extends Component {

  constructor() {
    super();
    const now = new Date();
    this.state = {
      datetime: now,
      latest: TravelForm.addHours(now, 2),
      customLatest: false,
      departure: true,
      submit: false,
      error: false,
    };
  }

  static setFullDate(from, to) {
    to.setDate(from.getDate());
    to.setMonth(from.getMonth());
    to.setFullYear(from.getFullYear());
    return to;
  }

  static setTime(from, to) {
    to.setHours(from.getHours());
    to.setMinutes(from.getMinutes());
    to.setSeconds(0);
    to.setMilliseconds(0);
    return to;
  }

  static addHours(datetime, hours) {
    const difference = 3600000 * hours;
    return new Date(datetime.getTime() + difference);
  }

  checkInput() {
    const {departure, datetime, latest} = this.state;
    const error = departure
      ? datetime.getTime() > latest.getTime()
      : datetime.getTime() < latest.getTime();
    this.setState({error: error});
    return error;
  }

  handleChange = (e, {name, value}) => {
    this.setState({submit: false, [name]: value});
    if (!this.state.customLatest)
      this.updateLatest(this.state.datetime, value);
  };

  updateLatest(newDateTime, departure) {
    const newLatest = TravelForm.addHours(newDateTime, departure ? 2 : -2);
    this.setState({latest: newLatest});
  }

  handleDateTimeChange(e, setLatest = false, time = false) {
    const {departure, customLatest, latest, datetime} = this.state;
    this.setState({submit: false});
    const dt = e["_d"];
    const currentDT = setLatest ? latest : datetime;
    const newDT = time
      ? TravelForm.setTime(dt, TravelForm.setFullDate(currentDT, new Date()))
      : TravelForm.setTime(currentDT, TravelForm.setFullDate(dt, new Date()));
    this.setState(setLatest ? {latest: newDT} : {datetime: newDT});

    if (!customLatest && !setLatest)
      this.updateLatest(newDT, departure);
  }

  static handleSubmit(self) {
    const error = self.checkInput();
    if (!error) {
      console.log("Datetime: ", self.state.datetime);
      self.setState({submit: true});
    } else {
      console.log("[ERROR] See form.");
    }
  };

  render() {
    const self = this;
    const {departure, submit, datetime, latest, customLatest, error} = this.state;
    const {departureStop, arrivalStop} = this.props;
    const valid = departureStop.id !== "" && arrivalStop.id !== "";
    const message = 'Please make sure that the latest moment of departure is ';

    // TODO internationalization
    return (
      <div>
        <Form onSubmit={() => TravelForm.handleSubmit(self)}>
          <Form.Group className="inline" widths="equal">
            <Form.Field control={Select} options={Object.values(options)} placeholder='Choose an option...'
                        name='departure' value={departure} onChange={this.handleChange}/>
            <Form.Field control={DateTime} dateFormat="DD-MM-YYYY" timeFormat={false} value={datetime}
                        inputProps={{format: 'DD-MM-YYYY'}} name='date'
                        onChange={(e) => self.handleDateTimeChange(e)}/>
            <Form.Field control={DateTime} dateFormat={false} timeFormat="HH:mm" value={datetime}
                        inputProps={{format: 'HH:mm'}} name='time'
                        onChange={(e) => self.handleDateTimeChange(e, false, true)}/>
          </Form.Group>

          <Form.Group className="inline" widths="equal">
            <Form.Field>
              <div className="ui checkbox">
                <input type="checkbox" name="customLatest" checked={customLatest}
                       onChange={() => self.setState({customLatest: !customLatest})}/>
                <label>Latest time of departure</label>
              </div>
            </Form.Field>
            <Form.Field control={DateTime} dateFormat="DD-MM-YYYY" timeFormat={false} value={latest} error={error}
                        disabled={!customLatest} inputProps={{format: 'DD-MM-YYYY'}} name='latestDate'
                        onChange={(e) => self.handleDateTimeChange(e, true, false)}/>
            <Form.Field control={DateTime} dateFormat={false} timeFormat="HH:mm" value={latest} error={error}
                        disabled={!customLatest} inputProps={{format: 'HH:mm'}} name='latestTime'
                        onChange={(e) => self.handleDateTimeChange(e, true, true)}/>
          </Form.Group>

          <Message error visible={error}
                   header='Invalid date/time'
                   content={message +
                   (departure ? 'later than the moment of departure.' : 'earlier than the moment of arrival.')}
          />

          <Form.Group className="inline" widths="equal">
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
              <Form.Button content="Submit" disabled={!valid}/>
            </Form.Field>
          </Form.Group>
        </Form>

        {/* TODO Temp; remove this */}
        <p hidden={!submit}>
          You chose {options[this.state.departure].text.toLowerCase()}
          &nbsp;at {datetime.toDateString()} {this.state.datetime.getHours()}:
          {datetime.getMinutes() < 10 ? '0' + datetime.getMinutes() : datetime.getMinutes()}
        </p>
      </div>
    );
  }
}

export default TravelForm;