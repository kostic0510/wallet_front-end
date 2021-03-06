import React from 'react'
import { connect } from 'react-redux'

import { getData } from './selectors'
import Error from './template.error'
import Loading from './template.loading'
import Success from './template.success'

class MobileNumberContainer extends React.PureComponent {
  render() {
    const { data } = this.props

    return data.cata({
      Failure: (message) => <Error message={message} />,
      Loading: () => <Loading />,
      NotAsked: () => <Loading />,
      Success: (value) => <Success data={value} />
    })
  }
}

const mapStateToProps = (state) => ({
  data: getData(state)
})

export default connect(mapStateToProps)(MobileNumberContainer)
