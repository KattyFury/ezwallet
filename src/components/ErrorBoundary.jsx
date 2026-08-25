import { Component } from 'react'

// Catches EVERY render error (a throw inside a component) → instead of a white screen ("the app
// blew up"), show a recovery screen with a Reload button. An error boundary MUST be a class
// component (React still has no hook version).
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info) }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ height: '100dvh', maxWidth: 430, margin: '0 auto', background: 'var(--color-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>Something went wrong</div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', maxWidth: 300 }}>
          The app hit an unexpected error. Your wallet and funds are safe. Please reload.
        </div>
        {/* A button standing alone → 3/4 of the screen like .row10-single (user decision 07-29). This
            screen does NOT use .screen (no --screen-max via padding), so the formula is written out. */}
        <button className="btn btn-primary" style={{ width: 'min(75vw, calc(var(--screen-max) * 0.75))' }} onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }
}
