import React, {Component} from 'react';
import DateTime from 'react-datetime';
import {Form, Select, Input, Icon, Message, Button} from 'semantic-ui-react';

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

    this.handleSubmit = this.handleSubmit.bind(this);
    this.clear = this.clear.bind(this);
  }

  /**
   * Set the full date of "to" to the full date of "from".
   *
   * @param from:Date, source of the full date (date, month, year)
   * @param to:Date, date which has to be set
   */
  static setFullDate(from, to) {
    to.setDate(from.getDate());
    to.setMonth(from.getMonth());
    to.setFullYear(from.getFullYear());
    return to;
  }

  /**
   * Set the time of "to" to the time of "from".
   * Set the seconds and milliseconds to 0.
   *
   * @param from:Date, source of the time (hours, minutes)
   * @param to:Date, time which has to be set
   */
  static setTime(from, to) {
    to.setHours(from.getHours());
    to.setMinutes(from.getMinutes());
    to.setSeconds(0);
    to.setMilliseconds(0);
    return to;
  }

  /**
   * Add a number of hours to the given object.
   *
   * @param datetime:Date, the object used as a reference
   * @param hours:number, the number of hours that has to be added
   * @return Date
   */
  static addHours(datetime, hours) {
    const difference = 3600000 * hours;
    return new Date(datetime.getTime() + difference);
  }

  /**
   * Check if the input is conform with the expected values.
   * @return boolean: indicates if there are errors
   */
  checkInput() {
    const {departure, datetime, latest} = this.state;
    const error = departure
      ? datetime.getTime() > latest.getTime()
      : datetime.getTime() < latest.getTime();
    this.setState({error: error});
    return error;
  }

  /**
   * Set the state accordingly to the given values.
   * Used to set the "departure" to the given value.
   * Update the latestDepartureTime if needed.
   *
   * @param e:event, triggered the function
   * @param name:string
   * @param value:boolean
   */
  handleChange = (e, {name, value}) => {
    this.setState({submit: false, [name]: value});
    if (!this.state.customLatest)
      this.updateLatest(this.state.datetime, value);
  };

  /**
   * Update the latestDepartureTime according the given values.
   * If the current travel time is departure, the new latestDepartureTime will be 2 hours after the current datetime.
   * Otherwise, the new latestDepartureTime will be 2 hours before the current datetime.
   *
   * @param newDateTime: the new datetime object, used as a reference to create the new latestDepartureTime
   * @param departure:boolean, true if the current travel type is departure
   */
  updateLatest(newDateTime, departure) {
    const newLatest = TravelForm.addHours(newDateTime, departure ? 2 : -2);
    this.setState({latest: newLatest});
  }

  /**
   * Set the date and time of the wanted object to the given values.
   * Update the state accordingly.
   * Update the latestDepartureTime if needed.
   *
   * @param e:event, triggered the function
   * @param setLatest:boolean, true if the latestDepartureTime should be set instead of the datetime
   * @param time:boolean, true if the time should be set instead of the full date
   */
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

  /**
   * Check if the input is conform with the expected values.
   * If there are no errors, use the callback to set the state of the parent component.
   * Otherwise, "error" in state will be set, causing the form to become invalid.
   */
  handleSubmit() {
    const error = this.checkInput();
    const {setDataCallback} = this.props;
    const {datetime, latest, departure} = this.state;

    if (!error) {
      this.setState({submit: true});
      setDataCallback(datetime, latest, departure);
      window.dispatchEvent(new CustomEvent("submit"));
    } else {
      console.log("[ERROR] See form.");
    }
  };

  clear() {
    const now = new Date();
    this.setState({
      datetime: now,
      latest: TravelForm.addHours(now, 2),
      customLatest: false,
      departure: true,
      submit: false,
      error: false,
    });
  }

  render() {
    const self = this;
    const {departure, datetime, latest, customLatest, error} = this.state;
    const {departureStop, arrivalStop, calculating} = this.props;
    const valid = departureStop.id !== "" && arrivalStop.id !== "";
    const message = 'Please make sure that the latest moment of departure is ';

    // TODO internationalization
    return (
      <div>
        <Form>
          <Form.Group className="inline" widths="equal">
            <Form.Field control={Select} options={Object.values(options)} placeholder='Choose an option...'
                        name='departure' value={departure} onChange={this.handleChange} disabled={true}/>
            <Form.Field control={DateTime} dateFormat="DD-MM-YYYY" timeFormat={false} value={datetime}
                        inputProps={{format: 'DD-MM-YYYY'}} name='date'
                        onChange={(e) => this.handleDateTimeChange(e)}/>
            <Form.Field control={DateTime} dateFormat={false} timeFormat="HH:mm" value={datetime}
                        inputProps={{format: 'HH:mm'}} name='time'
                        onChange={(e) => this.handleDateTimeChange(e, false, true)}/>
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
                        onChange={(e) => this.handleDateTimeChange(e, true, false)}/>
            <Form.Field control={DateTime} dateFormat={false} timeFormat="HH:mm" value={latest} error={error}
                        disabled={!customLatest} inputProps={{format: 'HH:mm'}} name='latestTime'
                        onChange={(e) => this.handleDateTimeChange(e, true, true)}/>
          </Form.Group>

          <Message error visible={error}
                   header='Invalid date/time'
                   content={message +
                   (departure ? 'later than the moment of departure.' : 'earlier than the moment of arrival.')}
          />

          <Form.Group className="inline">
            <Form.Field className="inline" width={8}>
              <label>From</label>
              <Input icon={<Icon name='map marker alternate' color='green'/>}
                     id="departure-field" name="departure-stop"
                     placeholder="No station selected." type="text"/>
            </Form.Field>
            <Form.Field className="inline" width={8}>
              <label>to</label>
              <Input icon={<Icon name='map marker alternate' color='red'/>}
                     id="arrival-field" name="arrival-stop" placeholder="No station selected" type="text"/>
            </Form.Field>
          </Form.Group>
          <Form.Group>
            <Form.Field width={13}/>
            <Form.Field width={3}>
              <Button.Group>
                <Button className="icon" onClick={this.clear} disabled={true || calculating}>
                  <Icon name="undo alternate"/>
                </Button>
                <Button content="Submit" className="green" onClick={this.handleSubmit} disabled={!valid || calculating}/>
              </Button.Group>
            </Form.Field>
          </Form.Group>
        </Form>
      </div>
    );
  }
}

export default TravelForm;