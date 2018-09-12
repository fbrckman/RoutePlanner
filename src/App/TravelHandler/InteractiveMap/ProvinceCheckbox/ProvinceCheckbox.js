import React, {Component} from 'react';
import {Form, Divider} from 'semantic-ui-react';
import './ProvinceCheckbox.css';

class ProvinceCheckbox extends Component {

  render() {
    const {provinces, nmbs, loading, func} = this.props;
    return (
      <Form loading={loading} onChange={func} className="content">
        {Object.keys(provinces).map(function (province) {
          return (
            <Form.Field key={province}>
              <div className="ui toggle checkbox">
                <input type="checkbox" name={province} checked={provinces[province].shown}
                       onChange={() => provinces[province].shown = !provinces[province].shown}/>
                <label>{province}</label>
              </div>
            </Form.Field>
          )
        })}
        <Divider />

        {/* Handle NMBS separately */}
        <Form.Field>
          <div className="ui toggle checkbox">
            <input type="checkbox" name="nmbs" checked={nmbs.shown} onChange={() => nmbs.shown = !nmbs.shown}
                   disabled={!nmbs.shown}/>
            <label>NMBS</label>
          </div>
        </Form.Field>
      </Form>
    )
  }

}

export default ProvinceCheckbox;