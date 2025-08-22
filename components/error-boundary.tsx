"use client"

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, Send, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo?: React.ErrorInfo
  errorId: string
  retryCount: number
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
  isolate?: boolean
  level?: 'page' | 'section' | 'component'
}

interface ErrorFallbackProps {
  error: Error
  errorInfo?: React.ErrorInfo
  errorId: string
  resetError: () => void
  goHome: () => void
  reportError: () => void
  retryCount: number
  maxRetries: number
}

// Error categorization
enum ErrorCategory {
  NETWORK = 'network',
  RENDER = 'render',
  CHUNK = 'chunk',
  API = 'api',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface ErrorReport {
  id: string
  message: string
  stack?: string
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: number
  url: string
  userAgent: string
  userId?: string
  componentStack?: string
  additionalInfo?: Record<string, any>
}

// Error classification utility
const classifyError = (error: Error): { category: ErrorCategory; severity: ErrorSeverity } => {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''

  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM }
  }

  if (message.includes('chunk') || message.includes('loading') || stack.includes('dynamicimport')) {
    return { category: ErrorCategory.CHUNK, severity: ErrorSeverity.HIGH }
  }

  if (message.includes('api') || message.includes('supabase') || message.includes('unauthorized')) {
    return { category: ErrorCategory.API, severity: ErrorSeverity.MEDIUM }
  }

  if (message.includes('permission') || message.includes('access denied')) {
    return { category: ErrorCategory.PERMISSION, severity: ErrorSeverity.HIGH }
  }

  if (stack.includes('render') || stack.includes('react')) {
    return { category: ErrorCategory.RENDER, severity: ErrorSeverity.HIGH }
  }

  return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.MEDIUM }
}

// Enhanced error reporting service
class ErrorReportingService {
  private static instance: ErrorReportingService
  private reports: ErrorReport[] = []
  private maxReports = 100

  static getInstance() {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService()
    }
    return ErrorReportingService.instance
  }

  async reportError(error: Error, errorInfo?: React.ErrorInfo, additionalInfo?: Record<string, any>): Promise<string> {
    const { category, severity } = classifyError(error)
    const errorId = this.generateErrorId()

    const report: ErrorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      category,
      severity,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      componentStack: errorInfo?.componentStack,
      additionalInfo: {
        ...additionalInfo,
        memoryUsage: this.getMemoryUsage(),
        viewport: this.getViewportInfo(),
        performance: this.getPerformanceInfo(),
      }
    }

    this.reports.push(report)
    if (this.reports.length > this.maxReports) {
      this.reports.shift()
    }

    logger.error('Error reported:', report)

    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        })
      } catch (e) {
        logger.error('Failed to send error report:', e)
      }
    }

    return errorId
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    }
    return null
  }

  private getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    }
  }

  private getPerformanceInfo() {
    const navigation = performance.getEntriesByType('navigation')[0] as any
    return {
      loadTime: navigation?.loadEventEnd - navigation?.loadEventStart,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
    }
  }

  getReports(): ErrorReport[] {
    return [...this.reports]
  }

  clearReports() {
    this.reports = []
  }
}

const errorReporter = ErrorReportingService.getInstance()

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = await errorReporter.reportError(error, errorInfo, {
      level: this.props.level || 'component',
      isolate: this.props.isolate
    })

    this.setState({ errorInfo, errorId })
    
    logger.error('Error Boundary caught an error:', {
      error: error.message,
      errorId,
      componentStack: errorInfo.componentStack
    })
    
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    const { maxRetries = 3 } = this.props
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount <= maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: undefined,
        retryCount: newRetryCount
      })
    }
  }

  goHome = () => {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    window.location.href = '/'
  }

  reportError = async () => {
    if (this.state.error) {
      await errorReporter.reportError(this.state.error, this.state.errorInfo)
    }
  }

  componentWillUnmount() {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      const maxRetries = this.props.maxRetries || 3
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetError={this.resetError}
          goHome={this.goHome}
          reportError={this.reportError}
          retryCount={this.state.retryCount}
          maxRetries={maxRetries}
        />
      )
    }

    return this.props.children
  }
}

// Enhanced error fallback component
function DefaultErrorFallback({ 
  error, 
  errorInfo, 
  errorId, 
  resetError, 
  goHome, 
  reportError,
  retryCount,
  maxRetries
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const [reportSent, setReportSent] = React.useState(false)

  const handleReportError = async () => {
    await reportError()
    setReportSent(true)
  }

  const copyErrorDetails = () => {
    const details = `Error ID: ${errorId}\nMessage: ${error.message}\nStack: ${error.stack}`
    navigator.clipboard.writeText(details)
  }

  const { category, severity } = classifyError(error)

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW: return 'text-yellow-600'
      case ErrorSeverity.MEDIUM: return 'text-orange-600'
      case ErrorSeverity.HIGH: return 'text-red-600'
      case ErrorSeverity.CRITICAL: return 'text-red-800'
      default: return 'text-gray-600'
    }
  }

  const getRecoveryMessage = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'ปัญหาการเชื่อมต่อเครือข่าย กรุณาตรวจสอบอินเทอร์เน็ต'
      case ErrorCategory.CHUNK:
        return 'ไฟล์ระบบไม่สมบูรณ์ กรุณารีเฟรชหน้าเว็บ'
      case ErrorCategory.API:
        return 'ปัญหาการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่'
      case ErrorCategory.PERMISSION:
        return 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่'
      default:
        return 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-red-500">
            <AlertTriangle className="h-full w-full" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            เกิดข้อผิดพลาด
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className={`font-medium ${getSeverityColor(severity)}`}>
              {severity.toUpperCase()}
            </span>
            <span>•</span>
            <span>{category.toUpperCase()}</span>
            {errorId && (
              <>
                <span>•</span>
                <span className="font-mono text-xs">{errorId}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700 font-medium mb-2">
              {getRecoveryMessage(category)}
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500">
                ลองแล้ว {retryCount} ครั้ง (สูงสุด {maxRetries} ครั้ง)
              </p>
            )}
          </div>

          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                <Bug className="mr-2 h-4 w-4" />
                {showDetails ? 'ซ่อน' : 'แสดง'}รายละเอียดข้อผิดพลาด
              </Button>
              
              {showDetails && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Message</AlertTitle>
                    <AlertDescription>
                      <code className="text-xs">{error.message}</code>
                    </AlertDescription>
                  </Alert>
                  
                  {error.stack && (
                    <details className="rounded border bg-gray-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-red-600 max-h-40 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <details className="rounded border bg-gray-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Component Stack
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-blue-600 max-h-40 overflow-y-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyErrorDetails}
                    className="w-full"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    คัดลอกรายละเอียดข้อผิดพลาด
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error reporting */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              {!reportSent ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReportError}
                  className="flex-1"
                >
                  <Send className="mr-2 h-4 w-4" />
                  รายงานข้อผิดพลาด
                </Button>
              ) : (
                <div className="flex-1 text-center text-sm text-green-600 py-2">
                  ✓ รายงานข้อผิดพลาดแล้ว
                </div>
              )}
            </div>
          </div>

          {/* Recovery actions */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <Button 
                onClick={resetError} 
                className="flex-1"
                variant="outline"
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryCount >= maxRetries ? 'ลองครบแล้ว' : 'ลองใหม่'}
              </Button>
              <Button 
                onClick={goHome} 
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                กลับหน้าหลัก
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Specialized error boundaries
export const DashboardErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    logger.error('Dashboard Error:', error, errorInfo)
  }

  return (
    <ErrorBoundary 
      onError={handleError}
      level="section"
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  )
}

export const ComponentErrorBoundary: React.FC<{ children: React.ReactNode; name: string }> = ({ children, name }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    logger.error(`Component Error (${name}):`, error, errorInfo)
  }

  return (
    <ErrorBoundary 
      onError={handleError}
      level="component"
      isolate={true}
      maxRetries={1}
    >
      {children}
    </ErrorBoundary>
  )
}

export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError, retryCount, maxRetries }) => (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription>
            There was a problem with the form. Please try again.
            <Button 
              onClick={resetError} 
              variant="outline" 
              size="sm" 
              className="ml-2"
              disabled={retryCount >= maxRetries}
            >
              {retryCount >= maxRetries ? 'Max retries reached' : 'Retry'}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      level="component"
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  )
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    name?: string
    fallback?: React.ComponentType<ErrorFallbackProps>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  }
) {
  const displayName = options?.name || WrappedComponent.displayName || WrappedComponent.name

  const ComponentWithErrorBoundary = React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary
      fallback={options?.fallback}
      onError={options?.onError}
      level="component"
      isolate={true}
    >
      <WrappedComponent {...props} ref={ref} />
    </ErrorBoundary>
  ))

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`
  return ComponentWithErrorBoundary
}

// Error reporting service instance
export { errorReporter as ErrorReportingService }