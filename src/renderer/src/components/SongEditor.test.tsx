import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Song } from '../song/song'
import SongEditor from './SongEditor'

afterEach(cleanup)

function testSong(): Song {
  return {
    title: 'Test Song',
    events: [
      { id: 'e1', notes: [{ midi: 60, name: 'C', octave: 4 }] },
      {
        id: 'e2',
        notes: [
          { midi: 64, name: 'E', octave: 4 },
          { midi: 67, name: 'G', octave: 4 }
        ]
      }
    ]
  }
}

describe('SongEditor', () => {
  it('renders the title and each event in order', () => {
    render(<SongEditor song={testSong()} onChange={vi.fn()} />)

    screen.getByText('Test Song')
    screen.getByText('1.')
    screen.getByText('2.')
  })

  it('adds a new default note event at the end', () => {
    const onChange = vi.fn()
    render(<SongEditor song={testSong()} onChange={onChange} />)

    fireEvent.click(screen.getByText('+ Add Note'))

    const updated = onChange.mock.calls[0][0] as Song
    expect(updated.events).toHaveLength(3)
    expect(updated.events[2].notes).toEqual([{ midi: 60, name: 'C', octave: 4 }])
  })

  it('deletes a whole event', () => {
    const onChange = vi.fn()
    render(<SongEditor song={testSong()} onChange={onChange} />)

    fireEvent.click(screen.getAllByText('Delete')[0])

    const updated = onChange.mock.calls[0][0] as Song
    expect(updated.events.map((event) => event.id)).toEqual(['e2'])
  })

  it('deletes one note from a chord, keeping the rest of the event', () => {
    const onChange = vi.fn()
    render(<SongEditor song={testSong()} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Delete note G4 from event 2'))

    const updated = onChange.mock.calls[0][0] as Song
    expect(updated.events[1].notes).toEqual([{ midi: 64, name: 'E', octave: 4 }])
  })

  it('deletes the whole event when its last note is deleted', () => {
    const onChange = vi.fn()
    render(<SongEditor song={testSong()} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Delete note C4 from event 1'))

    const updated = onChange.mock.calls[0][0] as Song
    expect(updated.events.map((event) => event.id)).toEqual(['e2'])
  })

  it('adds a note to an existing chord', () => {
    const onChange = vi.fn()
    render(<SongEditor song={testSong()} onChange={onChange} />)

    fireEvent.click(screen.getAllByText('+ Note')[0])

    const updated = onChange.mock.calls[0][0] as Song
    expect(updated.events[0].notes).toEqual([
      { midi: 60, name: 'C', octave: 4 },
      { midi: 60, name: 'C', octave: 4 }
    ])
  })

  it('changes a note name via the select', () => {
    const onChange = vi.fn()
    render(<SongEditor song={testSong()} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Event 1 note 1 name'), { target: { value: 'D' } })

    const updated = onChange.mock.calls[0][0] as Song
    expect(updated.events[0].notes[0]).toEqual({ midi: 62, name: 'D', octave: 4 })
  })

  it('changes a note octave via the select', () => {
    const onChange = vi.fn()
    render(<SongEditor song={testSong()} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Event 1 note 1 octave'), { target: { value: '5' } })

    const updated = onChange.mock.calls[0][0] as Song
    expect(updated.events[0].notes[0]).toEqual({ midi: 72, name: 'C', octave: 5 })
  })
})
