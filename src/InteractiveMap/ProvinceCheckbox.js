import React, {Component} from 'react';
import {Form} from 'semantic-ui-react';

class ProvinceCheckbox extends Component {

  constructor() {
    super();
    this.state = {};
  }

  static handleChange(self, province, nmbs) {
    const b = !self.state[province];
    self.state[province] = b; // FIXME bad practice
    if (nmbs) {
      self.props.nmbs.shown = b;
    } else {
      self.props.provinces[province].shown = b;
    }
  }

  render() {
    const self = this;
    for (const p of Object.keys(this.props.provinces)) {
      this.state[p] = false;
    }
    return (
      <Form loading={this.props.fetching} onChange={this.props.func}>
        {Object.keys(this.props.provinces).map(function (province) {
          return (
            <Form.Field key={province}>
              <div className="ui toggle checkbox" onChange={() => ProvinceCheckbox.handleChange(self, province, false)}>
                <input type="checkbox" value={self.props.provinces[province].shown} name={province} />
                <label>{province}</label>
              </div>
            </Form.Field>
          )
        })}

        {/* Handle NMBS separately */}
        <Form.Field>
          <div className="ui toggle checkbox" onClick={() => ProvinceCheckbox.handleChange(self, "nmbs", true)}>
            <input type="checkbox" value={self.props.nmbs.shown} name="nmbs" />
            <label>NMBS</label>
          </div>
        </Form.Field>
      </Form>
    )
  }

}

export default ProvinceCheckbox;