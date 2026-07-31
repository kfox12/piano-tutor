import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import KeyboardDisplay from './KeyboardDisplay'

// This project doesn't enable Vitest's `globals: true`, so
// @testing-library/react's automatic afterEach(cleanup) never registers
// (it only activates when it detects a global `afterEach`) - without this,
// each test's rendered DOM stays mounted into the next test.
afterEach(cleanup)

describe('KeyboardDisplay', () => {
  it("calls onKeyClick with the clicked key's note when a white key is clicked", () => {
    const onKeyClick = vi.fn()
    render(<KeyboardDisplay currentReading={null} targetNotes={[]} onKeyClick={onKeyClick} />)

    fireEvent.click(screen.getByTestId('piano-key-A4'))

    expect(onKeyClick).toHaveBeenCalledWith({ name: 'A', octave: 4 })
  })

  it("calls onKeyClick with the clicked key's note when a black key is clicked", () => {
    const onKeyClick = vi.fn()
    render(<KeyboardDisplay currentReading={null} targetNotes={[]} onKeyClick={onKeyClick} />)

    fireEvent.click(screen.getByTestId('piano-key-C#4'))

    expect(onKeyClick).toHaveBeenCalledWith({ name: 'C#', octave: 4 })
  })
})
