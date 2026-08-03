import type { View } from '../navigation'

interface HomeCard {
  target: View
  icon: string
  title: string
  description: string
  detail: string
}

const CARDS: HomeCard[] = [
  {
    target: 'import',
    icon: '📥',
    title: 'Import New Song',
    description: 'Bring in a MIDI file to practice.',
    detail:
      'Parses a MIDI file into a note sequence you can review, correct, and preview on the keyboard.'
  },
  {
    target: 'practice',
    icon: '🎹',
    title: 'Continue Practicing',
    description: 'Drill random notes with your microphone.',
    detail:
      'Listens through your microphone and gives you a target note to play, advancing as soon as you get it right.'
  },
  {
    target: 'test',
    icon: '🎯',
    title: 'Test Practice',
    description: 'Check what you’ve learned.',
    detail: 'A scored run-through of what you’ve practiced so far — coming soon.'
  }
]

interface HomePageProps {
  onNavigate: (view: View) => void
}

function HomePage({ onNavigate }: HomePageProps): React.JSX.Element {
  return (
    <div className="home-page">
      <h1 className="home-page__title">Piano Tutor</h1>
      <div className="home-page__cards">
        {CARDS.map((card) => (
          <button
            key={card.target}
            type="button"
            className="home-card"
            onClick={() => onNavigate(card.target)}
          >
            <span className="home-card__icon" aria-hidden="true">
              {card.icon}
            </span>
            <span className="home-card__title">{card.title}</span>
            <span className="home-card__description">{card.description}</span>
            <span className="home-card__detail">{card.detail}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default HomePage
