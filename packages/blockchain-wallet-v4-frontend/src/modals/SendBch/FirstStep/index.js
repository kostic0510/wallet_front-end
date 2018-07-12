import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

import { getData } from "./selectors";
import { actions } from "data";
import Error from "./template.error";
import Loading from "./template.loading";
import Success from "./template.success";

class FirstStep extends React.Component {
  constructor(props) {
    super(props);
    this.handleToToggle = this.handleToToggle.bind(this);
  }

  handleToToggle(val) {
    this.props.formActions.touch("sendBch", "to");
    this.props.actions.sendBchFirstStepToToggled(val);
  }

  render() {
    const { data, actions } = this.props;

    return data.cata({
      Success: value => (
        <Success
          from={value.from}
          toToggled={value.toToggled}
          destination={value.destination}
          enableToggle={value.enableToggle}
          effectiveBalance={value.effectiveBalance}
          totalFee={value.totalFee}
          onSubmit={() => actions.sendBchFirstStepSubmitClicked()}
          handleToToggle={this.handleToToggle}
        />
      ),
      Failure: message => <Error>{message}</Error>,
      Loading: () => <Loading />,
      NotAsked: () => <Loading />
    });
  }
}

const mapStateToProps = state => ({
  data: getData(state)
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(actions.components.sendBch, dispatch),
  formActions: bindActionCreators(actions.form, dispatch)
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FirstStep);
