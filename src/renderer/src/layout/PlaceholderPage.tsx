interface PlaceholderPageProps {
  icon: string
  title: string
  description: string
}

function PlaceholderPage({ icon, title, description }: PlaceholderPageProps): React.JSX.Element {
  return (
    <div className="placeholder-page">
      <span className="placeholder-page__icon" aria-hidden="true">
        {icon}
      </span>
      <h1 className="page-title">{title}</h1>
      <p className="placeholder-page__description">{description}</p>
      <p className="tip">Coming soon</p>
    </div>
  )
}

export default PlaceholderPage
