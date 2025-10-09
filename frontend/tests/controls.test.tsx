import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import Controls from '../src/components/Controls'

vi.mock('../src/lib/api', () => ({
  useTickers: () => ({ data: ['AAPL', 'MSFT'] }),
}))

const queryClient = new QueryClient()

describe('Controls', () => {
  it('disables run without tickers', () => {
    const onRun = vi.fn()
    render(
      <QueryClientProvider client={queryClient}>
        <Controls onRun={onRun} />
      </QueryClientProvider>,
    )
    const button = screen.getByText('Run Optimization')
    expect(button).toBeDisabled()
  })
})
