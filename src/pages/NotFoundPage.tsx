import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <>
      <header className="page-header">
        <h1>Page not found</h1>
        <p>That address is not part of BrightPath CRM.</p>
      </header>
      <Link className="text-link" to="/">
        Back to dashboard
      </Link>
    </>
  )
}
