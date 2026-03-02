import './App.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { defaultSettings, getDateKey } from './types'
import type { LogEntry, StoredSettings, TimerMode, WorkMode } from './types'
import SettingsBar from './components/SettingsBar'
import PomodoroTimer from './components/PomodoroTimer'
import PotataTimer from './components/PotataTimer'
import MoneyRow from './components/MoneyRow'
import DayProgress from './components/DayProgress'
import ActivityLog from './components/ActivityLog'

const LOG_KEY = 'eff-timer-log-v1'
const SETTINGS_KEY = 'eff-timer-settings-v1'

export default function App() {
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

	// ── Init: load from localStorage & create audio ──
	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(LOG_KEY)
			if (raw) setLogs(JSON.parse(raw) as LogEntry[])
		} catch { /* ignore */ }
		try {
			const raw = window.localStorage.getItem(SETTINGS_KEY)
			if (raw) setSettings(prev => ({ ...prev, ...(JSON.parse(raw) as StoredSettings) }))
		} catch { /* ignore */ }
		pomodoroAudio.current = new Audio('/sounds/pomodoro.mp3')
		potataAudio.current = new Audio('/sounds/patata.mp3')
		stopAudio.current = new Audio('/sounds/stop.mp3')
	}, [])

	useEffect(() => {
		window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
	}, [settings])

	// ── Tick ──
	useEffect(() => {
		if (!isRunning || mode === 'idle') return
		const interval = window.setInterval(() => {
			setElapsedSeconds(prev => {
				const next = prev + 1
				if (mode === 'pomodoro') {
					const target = settings.pomodoroMinutes * 60
					if (!pomodoroTargetReached && target > 0 && next >= target) {
						handlePomodoroTargetReached()
					}
				}
				return next
			})
		}, 1000)
		return () => window.clearInterval(interval)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isRunning, mode, settings.pomodoroMinutes, pomodoroTargetReached])

	// ── Derived values ──
	const perMinuteRate = useMemo(() => settings.hourlyRate / 60, [settings.hourlyRate])
	const todayKey = getDateKey(new Date())

	const totals = useMemo(() => {
		let earned = 0, lost = 0, workedMinutesToday = 0
		for (const e of logs) {
			if (e.mode === 'pomodoro') earned += e.amount
			else lost += Math.abs(e.amount)
			if (getDateKey(e.start) === todayKey && e.mode === 'pomodoro')
				workedMinutesToday += e.durationMinutes
		}
		if (isRunning && mode !== 'idle') {
			const mins = elapsedSeconds / 60
			const amt = mins * perMinuteRate
			if (mode === 'pomodoro') { earned += amt; workedMinutesToday += mins }
			else { lost += Math.abs(amt) }
		}
		return { earned, lost, workedMinutesToday }
	}, [logs, todayKey, isRunning, elapsedSeconds, perMinuteRate, mode])

	const dayProgress = Math.min(
		100,
		settings.workdayMinutes > 0 ? (totals.workedMinutesToday / settings.workdayMinutes) * 100 : 0,
	)

	const pomodoroProgress = Math.min(
		100,
		mode === 'pomodoro' ? (elapsedSeconds / (settings.pomodoroMinutes * 60 || 1)) * 100 : 0,
	)

	// ── Audio helpers ──
	function stopAllSounds() {
		;[pomodoroAudio.current, potataAudio.current].forEach(a => {
			if (!a) return; a.pause(); a.currentTime = 0
		})
	}

	function playModeSound(m: TimerMode) {
		stopAllSounds()
		if (m === 'pomodoro' && pomodoroAudio.current) {
			pomodoroAudio.current.loop = true; void pomodoroAudio.current.play()
		} else if (m === 'potata' && potataAudio.current) {
			potataAudio.current.loop = true; void potataAudio.current.play()
		}
	}

	// ── Log helper ──
	function persistLog(completedMode: WorkMode, start: Date, end: Date) {
		const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60
		if (durationMinutes <= 0) return
		const sign = completedMode === 'pomodoro' ? 1 : -1
		const entry: LogEntry = {
			id: `${completedMode}-${start.getTime()}-${end.getTime()}`,
			mode: completedMode,
			start: start.toISOString(),
			end: end.toISOString(),
			durationMinutes,
			amount: sign * durationMinutes * perMinuteRate,
		}
		setLogs(prev => {
			const next = [...prev, entry]
			window.localStorage.setItem(LOG_KEY, JSON.stringify(next))
			return next
		})
	}

	// ── Timer actions ──
	function startPomodoro() {
		setMode('pomodoro'); setIsRunning(true)
		setElapsedSeconds(0); setCurrentStart(new Date())
		setPomodoroTargetReached(false); playModeSound('pomodoro')
	}

	function startPotata() {
		setMode('potata'); setIsRunning(true)
		setElapsedSeconds(0); setCurrentStart(new Date())
		setPomodoroTargetReached(false); playModeSound('potata')
	}

	function stopCurrentTimer(thenPotata: boolean) {
		if (!currentStart || mode === 'idle') {
			setIsRunning(false); setMode('idle'); stopAllSounds(); return
		}
		persistLog(mode as WorkMode, currentStart, new Date())
		setIsRunning(false); setCurrentStart(null)
		setElapsedSeconds(0); setPomodoroTargetReached(false); stopAllSounds()
		if (thenPotata) startPotata()
		else setMode('idle')
	}

	function handlePomodoroTargetReached() {
		if (!currentStart || mode === 'idle' || pomodoroTargetReached) return
		const end = new Date()
		if (stopAudio.current) void stopAudio.current.play()
		persistLog('pomodoro', currentStart, end)
		setCurrentStart(null); setPomodoroTargetReached(true)
		startPotata()
	}

	function handlePomodoroButton() {
		if (mode === 'pomodoro' && isRunning) { stopCurrentTimer(true); return }
		if (mode === 'potata' && isRunning) stopCurrentTimer(false)
		startPomodoro()
	}

	function handleClearLog() {
		if (!window.confirm('Очистить журнал и сбросить выработку?')) return
		setLogs(() => {
			window.localStorage.setItem(LOG_KEY, JSON.stringify([]))
			return []
		})
		setMode('idle'); setIsRunning(false); setCurrentStart(null); stopAllSounds()
	}

	// ── Render ──
	return (
		<div className='app'>
			{/* ── Верхняя строка: заголовок + настройки ── */}
			<header className='app-topbar'>
				<h1 className='app-title'>Pomodoro / Potata</h1>
				<SettingsBar
					settings={settings}
					onChange={patch => setSettings(prev => ({ ...prev, ...patch }))}
				/>
			</header>

			{/* ── Таймеры ── */}
			<div className='timers-section'>
				<div className='timers-row'>
					<PomodoroTimer
						elapsedSeconds={elapsedSeconds}
						isActive={mode === 'pomodoro'}
						isRunning={isRunning}
						progress={pomodoroProgress}
						onStart={handlePomodoroButton}
					/>
					<PotataTimer
						elapsedSeconds={elapsedSeconds}
						isActive={mode === 'potata'}
						isRunning={isRunning}
					/>
				</div>
				<MoneyRow earned={totals.earned} lost={totals.lost} />
			</div>

			{/* ── Дневная выработка ── */}
			<DayProgress
				workedMinutes={totals.workedMinutesToday}
				totalMinutes={settings.workdayMinutes}
				progress={dayProgress}
			/>

			{/* ── Журнал ── */}
			<ActivityLog logs={logs} onClear={handleClearLog} />
		</div>
	)
}
