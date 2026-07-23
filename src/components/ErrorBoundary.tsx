// W6: 全局 ErrorBoundary 错误兜底
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获错误:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card max-w-md text-center">
            <div className="text-5xl mb-3">😵</div>
            <h2 className="text-lg font-semibold mb-2">页面出错了</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              {this.state.error?.message || '未知错误'}
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={this.handleReset} className="btn-ghost text-sm">
                🔄 重试
              </button>
              <button onClick={this.handleReload} className="btn-primary text-sm">
                🔃 刷新页面
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
