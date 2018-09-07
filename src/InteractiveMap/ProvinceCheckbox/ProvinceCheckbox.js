import React, {Component} from 'react';
import {Form} from 'semantic-ui-react';
import './ProvinceCheckbox.css';

class ProvinceCheckbox extends Component {

  render() {
    const self = this;
    return (
      <Form loading={this.props.loading} onChange={this.props.func} className="content">
        <div className="ui segment">
          {Object.keys(this.props.provinces).map(function (province) {
            return (
              <Form.Field key={province}>
                <div className="ui toggle checkbox">
                  <input type="checkbox" name={province} checked={self.props.provinces[province].shown}
                         onChange={() => self.props.provinces[province].shown = !self.props.provinces[province].shown} />
                  <label>{province}</label>
                </div>
              </Form.Field>
            )
          })}
        </div>

        {/* Handle NMBS separately */}
        <div className="ui segment">
          <Form.Field>
            <div className="ui toggle checkbox" >
              <input type="checkbox" name="nmbs" checked={self.props.nmbs.shown}
                     onChange={() => self.props.nmbs.shown = !self.props.nmbs.shown} />
              <label>NMBS</label>
            </div>
          </Form.Field>
        </div>
      </Form>
    )
  }

}

export default ProvinceCheckbox;