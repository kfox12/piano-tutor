import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PracticeSession from './PracticeSession'

afterEach(cleanup)

const IDLE = { status: 'idle' as const, lastSessionStats: null }
const AWAITING = {
  status: 'awaiting-note' as const,
  target: { name: 'A', octave: 4 },
  stats: { correctCount: 3 }
}

describe('PracticeSession', () => {
  it('disables Start Practice when the mic is not active', () => {
    render(<PracticeSession state={IDLE} start={vi.fn()} stop={vi.fn()} micActive={false} />)

    const button = screen.getByText('Start Practice') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    screen.getByText('Start the microphone first.')
  })

  it('calls start() when Start Practice is clicked with the mic active', () => {
    const start = vi.fn()
    render(<PracticeSession state={IDLE} start={start} stop={vi.fn()} micActive={true} />)

    const button = screen.getByText('Start Practice') as HTMLButtonElement
    expect(button.disabled).toBe(false)
    fireEvent.click(button)

    expect(start).toHaveBeenCalledOnce()
  })

  it('shows the last session summary when present', () => {
    const idleWithStats = { status: 'idle' as const, lastSessionStats: { correctCount: 5 } }
    render(
      <PracticeSession state={idleWithStats} start={vi.fn()} stop={vi.fn()} micActive={true} />
    )

    screen.getByText('Last session: 5 correct')
  })

  it('shows the running score and calls stop() when Stop Practice is clicked', () => {
    const stop = vi.fn()
    render(<PracticeSession state={AWAITING} start={vi.fn()} stop={stop} micActive={true} />)

    screen.getByText('Correct: 3')
    fireEvent.click(screen.getByText('Stop Practice'))

    expect(stop).toHaveBeenCalledOnce()
  })
})
