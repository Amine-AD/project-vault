import { useEffect, useState } from 'react'
import { getTOTPInfo } from '#/lib/crypto'

const PERIOD_SECONDS = 30

/** Live TOTP code for a secret, refreshed every second. */
export function useTotp(secret: string | undefined) {
  const [state, setState] = useState<{ code: string | null; seconds: number }>({
    code: null,
    seconds: PERIOD_SECONDS,
  })

  useEffect(() => {
    if (!secret) {
      setState({ code: null, seconds: PERIOD_SECONDS })
      return
    }
    const tick = () => {
      const info = getTOTPInfo(secret)
      setState({ code: info.code, seconds: info.secondsRemaining })
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [secret])

  return { ...state, period: PERIOD_SECONDS }
}

export function formatTotp(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`
}
