/** Catches render/runtime errors in a subtree and shows the message instead of
 *  a blank white screen. */
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Shown above the error text. */
  label?: string
  /** Optional reset handler (e.g. close the failing panel). */
  onReset?: () => void
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', this.props.label || '', error, info)
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div className="errbox">
          <strong>{this.props.label || 'Something went wrong'}</strong>
          <pre>{error.message}</pre>
          {this.props.onReset && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                this.setState({ error: null })
                this.props.onReset?.()
              }}
            >
              Go back
            </button>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
