import React from 'react'
import { connect } from 'react-redux'
import BalancesTable from './template'
import { getData } from './selectors'

class BalancesTableContainer extends React.PureComponent {
  render () {
    const { currentTab, isSilverOrAbove } = this.props
    return (
      <BalancesTable
        currentTab={currentTab}
        isSilverOrAbove={isSilverOrAbove}
      />
    )
  }
}

const mapStateToProps = state => getData(state)

export default connect(mapStateToProps)(BalancesTableContainer)
