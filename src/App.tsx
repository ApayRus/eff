import './App.css'

import { useEffect, useMemo, useRef, useState } from 'react'

type TimerMode = 'idle' | 'pomodoro' | 'potata'

type WorkMode = Extract<TimerMode, 'pomodoro' | 'potata'>

type LogEntry = {
  id: string
  mode: WorkMode
  start: string
  end: string
  durationMinutes: number
  amount: number
}

const LOG_STORAGE_KEY = 'eff-timer-log-v1'
const SETTINGS_STORAGE_KEY = 'eff-timer-settings-v1'

type StoredSettings = {
  hourlyRate: number
  workdayMinutes: number
  pomodoroMinutes: number
}

const defaultSettings: StoredSettings = {
  hourlyRate: 1000,
  workdayMinutes: 480,
  pomodoroMinutes: 40,
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')
  return `${mm}:${ss}`
}

function getDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 10)
}

function App() {
  const [settings, setSettings] = useState<StoredSettings>(defaultSettings)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const [mode, setMode] = useState<TimerMode>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentStart, setCurrentStart] = useState<Date | null>(null)
  const [pomodoroTargetReached, setPomodoroTargetReached] = useState(false)

  const pomodoroAudio = useRef<HTMLAudioElement | null>(null)
  const potataAudio = useRef<HTMLAudioElement | null>(null)
  const stopAudio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const storedLog = window.localStorage.getItem(LOG_STORAGE_KEY)
    if (storedLog) {
      try {
        const parsed: LogEntry[] = JSON.parse(storedLog)
        setLogs(parsed)
      } catch {
        // ignore parsing error
      }
    }

    const storedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (storedSettings) {
      try {
        const parsed: StoredSettings = JSON.parse(storedSettings)
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }))
        setElapsedSeconds(0)
      } catch {
        // ignore parsing error
      }
    }

    pomodoroAudio.current = new Audio('/sounds/pomodoro.mp3')
    potataAudio.current = new Audio('/sounds/patata.mp3')
    stopAudio.current = new Audio('/sounds/stop.mp3')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (!isRunning || mode === 'idle') return

    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1

        if (mode === 'pomodoro') {
          const targetSeconds = settings.pomodoroMinutes * 60
          if (!pomodoroTargetReached && targetSeconds > 0 && next >= targetSeconds) {
            handlePomodoroTargetReached()
          }
        }

        return next
      })
    }, 1000)

    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, mode, settings.pomodoroMinutes, pomodoroTargetReached])

  const perMinuteRate = useMemo(() => settings.hourlyRate / 60, [settings.hourlyRate])

  const todayKey = getDateKey(new Date())

  const totals = useMemo(() => {
    let earned = 0
    let lost = 0
    let workedMinutesToday = 0

    for (const entry of logs) {
      if (entry.mode === 'pomodoro') {
        earned += entry.amount
      } else {
        lost += Math.abs(entry.amount)
      }

      if (getDateKey(entry.start) === todayKey && entry.mode === 'pomodoro') {
        workedMinutesToday += entry.durationMinutes
      }
    }

    if (isRunning && mode !== 'idle') {
      const currentMinutes = elapsedSeconds / 60
      const amount = currentMinutes * perMinuteRate

      if (mode === 'pomodoro') {
        earned += amount
        workedMinutesToday += currentMinutes
      } else if (mode === 'potata') {
        lost += Math.abs(amount)
      }
    }

    return {
      earned,
      lost,
      workedMinutesToday,
    }
  }, [logs, todayKey, isRunning, elapsedSeconds, perMinuteRate, mode])

  const dayProgress = Math.min(
    100,
    settings.workdayMinutes > 0 ? (totals.workedMinutesToday / settings.workdayMinutes) * 100 : 0,
  )

  function stopAllSounds() {
    const audios = [pomodoroAudio.current, potataAudio.current]
    audios.forEach((audio) => {
      if (!audio) return
      audio.pause()
      audio.currentTime = 0
    })
  }

  function playModeSound(nextMode: TimerMode) {
    stopAllSounds()
    if (nextMode === 'pomodoro' && pomodoroAudio.current) {
      pomodoroAudio.current.loop = true
      void pomodoroAudio.current.play()
    } else if (nextMode === 'potata' && potataAudio.current) {
      potataAudio.current.loop = true
      void potataAudio.current.play()
    }
  }

  function logInterval(completedMode: WorkMode, start: Date, end: Date) {
    const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60
    if (durationMinutes <= 0) return

    const sign = completedMode === 'pomodoro' ? 1 : -1
    const amount = sign * durationMinutes * perMinuteRate

    const entry: LogEntry = {
      id: `${completedMode}-${start.getTime()}-${end.getTime()}`,
      mode: completedMode,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMinutes,
      amount,
    }

    setLogs((prev) => {
      const next = [...prev, entry]
      window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function startPomodoro() {
    const now = new Date()
    setMode('pomodoro')
    setIsRunning(true)
    setElapsedSeconds(0)
    setCurrentStart(now)
    setPomodoroTargetReached(false)
    playModeSound('pomodoro')
  }

  function startPotata() {
    const now = new Date()
    setMode('potata')
    setIsRunning(true)
    setElapsedSeconds(0)
    setCurrentStart(now)
    setPomodoroTargetReached(false)
    playModeSound('potata')
  }

  function stopCurrentTimer(manual: boolean) {
    if (!currentStart || mode === 'idle') {
      setIsRunning(false)
      setMode('idle')
      stopAllSounds()
      return
    }

    const end = new Date()
    if (mode === 'pomodoro' || mode === 'potata') {
      logInterval(mode, currentStart, end)
    }

    setIsRunning(false)
    setCurrentStart(null)
    setElapsedSeconds(0)
    setPomodoroTargetReached(false)
    stopAllSounds()

    if (manual && mode === 'pomodoro') {
      startPotata()
    } else {
      setMode('idle')
    }
  }

  function handlePomodoroTargetReached() {
    if (!currentStart || mode === 'idle') return
    if (pomodoroTargetReached) return

    const end = new Date()
    if (mode === 'pomodoro' && stopAudio.current) {
      void stopAudio.current.play()
    }

    if (mode === 'pomodoro') {
      logInterval(mode, currentStart, end)
      setCurrentStart(null)
      setPomodoroTargetReached(true)
      startPotata()
    }
  }

  function handlePomodoroButtonClick() {
    if (mode === 'pomodoro' && isRunning) {
      stopCurrentTimer(true)
      return
    }

    if (mode === 'potata' && isRunning) {
      stopCurrentTimer(false)
    }

    startPomodoro()
  }

  function handleResetDay() {
    if (!window.confirm('Очистить журнал и сбросить выработку за все дни?')) return
    setLogs(() => {
      const next: LogEntry[] = []
      window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    setMode('idle')
    setIsRunning(false)
    setCurrentStart(null)
    stopAllSounds()
  }

  const groupedByDate = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {}
    for (const entry of logs) {
      const key = getDateKey(entry.start)
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    }

    return Object.entries(groups)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => (a.start < b.start ? -1 : 1)),
      }))
  }, [logs])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Pomodoro / Potata</h1>
        <p className="app-subtitle">
          Счётчик заработанного и потерянного времени
        </p>
      </header>

      <section className="app-grid">
        <div className="panel panel-settings">
          <h2>Настройки</h2>
          <div className="form-grid">
            <label className="field">
              <span>Почасовая оплата (₽/час)</span>
              <input
                type="number"
                min={0}
                value={settings.hourlyRate}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hourlyRate: Number(e.target.value) || 0,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Продолжительность дня (часов)</span>
              <input
                type="number"
                min={1}
                value={settings.workdayMinutes / 60}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    workdayMinutes: (Number(e.target.value) || 0) * 60,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Помодоро (минут)</span>
              <input
                type="number"
                min={1}
                value={settings.pomodoroMinutes}
                onChange={(e) => {
                  const value = Number(e.target.value) || 1
                  setSettings((prev) => ({
                    ...prev,
                    pomodoroMinutes: value,
                  }))
                  if (!isRunning && mode === 'pomodoro') {
                    setElapsedSeconds(0)
                  }
                }}
              />
            </label>
          </div>

          <button className="danger-button" onClick={handleResetDay}>
            Очистить журнал
          </button>
        </div>

        <div className="panel panel-timers">
          <h2>Таймеры</h2>

          <div className="timers-row">
            <div
              className={`timer-card timer-card-pomodoro ${
                mode === 'pomodoro' ? 'timer-card-active' : ''
              }`}
            >
              <h3>Pomodoro</h3>
              <div className="timer-display">
                <div className="timer-time">
                  {mode === 'pomodoro' ? formatTime(elapsedSeconds) : '00:00'}
                </div>
                <div className="timer-mode-label">
                  {mode === 'pomodoro' && isRunning
                    ? 'Работаем'
                    : mode === 'pomodoro'
                      ? 'На паузе'
                      : 'Готов к старту'}
                </div>
              </div>
              <div className="timer-progress">
                <div className="timer-progress-bar">
                  <div
                    className="timer-progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        (mode === 'pomodoro'
                          ? (elapsedSeconds / (settings.pomodoroMinutes * 60 || 1)) * 100
                          : 0),
                      ).toFixed(1)}%`,
                    }}
                  />
                </div>
                <span className="timer-progress-label">
                  {mode === 'pomodoro'
                    ? Math.min(
                        100,
                        (elapsedSeconds / (settings.pomodoroMinutes * 60 || 1)) * 100,
                      ).toFixed(1)
                    : '0.0'}
                  %
                </span>
              </div>
              <button
                className="primary-button"
                onClick={handlePomodoroButtonClick}
              >
                {mode === 'pomodoro' && isRunning
                  ? 'Стоп и Potata'
                  : 'Старт Pomodoro'}
              </button>
            </div>

            <div
              className={`timer-card timer-card-potata ${
                mode === 'potata' ? 'timer-card-active timer-card-break' : ''
              }`}
            >
              <h3>Potata</h3>
              <div className="timer-display">
                <div className="timer-time">
                  {mode === 'potata' ? formatTime(elapsedSeconds) : '--:--'}
                </div>
                <div className="timer-mode-label">
                  {mode === 'potata' && isRunning
                    ? 'Отдыхаем (деньги тают)'
                    : 'Ждём окончания Pomodoro'}
                </div>
              </div>
            </div>
          </div>

          <div className="money-row">
            <div className="money-card money-earned">
              <span>Заработано</span>
              <strong>{totals.earned.toFixed(2)} ₽</strong>
            </div>
            <div className="money-card money-lost">
              <span>Потеряно</span>
              <strong>{totals.lost.toFixed(2)} ₽</strong>
            </div>
          </div>
        </div>

        <div className="panel panel-progress">
          <h2>Дневная выработка</h2>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${dayProgress}%` }}
            />
          </div>
          <div className="progress-labels">
            <span>
              {(totals.workedMinutesToday / 60).toFixed(2)} ч из{' '}
              {(settings.workdayMinutes / 60).toFixed(2)} ч
            </span>
            <span>{dayProgress.toFixed(1)}%</span>
          </div>
        </div>

        <div className="panel panel-log">
          <h2>Журнал</h2>
          {groupedByDate.length === 0 ? (
            <p className="empty-log">Записей пока нет.</p>
          ) : (
            <div className="log-list">
              {groupedByDate.map(({ date, entries }) => (
                <div key={date} className="log-day">
                  <h3>
                    {new Date(date).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <ul>
                    {entries.map((entry) => {
                      const start = new Date(entry.start)
                      const end = new Date(entry.end)
                      const typeLabel =
                        entry.mode === 'pomodoro' ? 'Pomodoro' : 'Potata'
                      const sign = entry.mode === 'pomodoro' ? '+' : '-'

                      return (
                        <li key={entry.id} className={`log-item ${entry.mode}`}>
                          <div className="log-main">
                            <span className="log-type">{typeLabel}</span>
                            <span className="log-time">
                              {start.toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              —{' '}
                              {end.toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="log-meta">
                            <span className="log-duration">
                              {entry.durationMinutes.toFixed(1)} мин
                            </span>
                            <span
                              className={`log-amount ${
                                entry.mode === 'pomodoro'
                                  ? 'log-amount-positive'
                                  : 'log-amount-negative'
                              }`}
                            >
                              {sign}
                              {Math.abs(entry.amount).toFixed(2)} ₽
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default App
