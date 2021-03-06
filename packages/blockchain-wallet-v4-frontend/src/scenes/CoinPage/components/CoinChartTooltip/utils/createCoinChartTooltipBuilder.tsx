import React from 'react'
import { format } from 'date-fns'

import { CoinData, TooltipBuilder } from '../../CoinChart'
import { CoinChartTooltip } from '../CoinChartTooltip'

export const createCoinChartTooltipBuilder =
  <DATA extends CoinData = CoinData>(): TooltipBuilder<DATA> =>
  ({ cursorTop, getX, getY, tooltipData, tooltipLeft }) =>
    (
      <CoinChartTooltip
        top={cursorTop}
        left={tooltipLeft}
        offsetLeft={22}
        offsetTop={-28}
        title={format(new Date(getX(tooltipData)), 'MMM d, hh:mm aaa')}
        subtitle={getY(tooltipData).toString()}
      />
    )
