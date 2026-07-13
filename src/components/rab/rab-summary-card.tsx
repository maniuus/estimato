import React from 'react'
import { formatCurrency } from '../../lib/format'
import type { RabCalculation } from '../../stores/rab-store'

interface RabSummaryCardProps {
  calculation: RabCalculation | null
  ppn: number
  overhead: number
}

export function RabSummaryCard({
  calculation,
  ppn,
  overhead
}: RabSummaryCardProps): React.ReactElement | null {
  if (!calculation || calculation.lineItems.length === 0) return null

  return (
    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
      <div className="w-80 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal Pekerjaan:</span>
          <span className="font-mono font-medium">{formatCurrency(calculation.totalPrice)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>PPN ({ppn}%):</span>
          <span className="font-mono">{formatCurrency(calculation.ppnAmount)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Overhead & Profit ({overhead}%):</span>
          <span className="font-mono">{formatCurrency(calculation.overheadAmount)}</span>
        </div>
        <hr className="border-gray-200 my-1" />
        <div className="flex justify-between font-extrabold text-primary-800 text-base">
          <span>Grand Total RAB:</span>
          <span className="font-mono">{formatCurrency(calculation.grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}
