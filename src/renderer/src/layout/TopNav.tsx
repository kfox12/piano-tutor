import { NAV_ITEMS, type View } from '../navigation'
import ThemeToggle from './ThemeToggle'

interface TopNavProps {
  current: View
  onNavigate: (view: View) => void
}

function TopNav({ current, onNavigate }: TopNavProps): React.JSX.Element {
  return (
    <nav className="top-nav">
      <button type="button" className="top-nav__brand" onClick={() => onNavigate('home')}>
        Piano Tutor
      </button>
      <div className="top-nav__items">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.id === current ? 'top-nav__item top-nav__item--active' : 'top-nav__item'
            }
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ThemeToggle />
    </nav>
  )
}

export default TopNav
