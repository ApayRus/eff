import './App.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { defaultSettings, getDateKey } from './types'
import type { LogEntry, StoredSettings, TimerMode, WorkMode } from './types'
import SettingsBar from './components/SettingsBar'
import PomodoroTimer from './components/PomodoroTimer'
import PatataTimer from './components/PatataTimer.tsx'
import MoneyRow from './components/MoneyRow'
import DayProgress from './components/DayProgress'
import ActivityLog from './components/ActivityLog'

const LOG_KEY = 'eff-timer-log-v1'
const SETTINGS_KEY = 'eff-timer-settings-v1'

type AudioContextCtor = new () => AudioContext

function getAudioContextCtor(): AudioContextCtor | null {
	const win = window as Window & { webkitAudioContext?: AudioContextCtor }
	return window.AudioContext ?? win.webkitAudioContext ?? null
}

export default function App() {
	const [settings, setSettings] = useState<StoredSettings>(defaultSettings)
	const [logs, setLogs] = useState<LogEntry[]>([])
	const [mode, setMode] = useState<TimerMode>('idle')
	const [isRunning, setIsRunning] = useState(false)
	const [elapsedSeconds, setElapsedSeconds] = useState(0)
	const [currentStart, setCurrentStart] = useState<Date | null>(null)
	const [pomodoroTargetReached, setPomodoroTargetReached] = useState(false)
	const [updateReady, setUpdateReady] = useState(false)

	const pomodoroAudio = useRef<HTMLAudioElement | null>(null)
	const patataAudio = useRef<HTMLAudioElement | null>(null)
	const stopAudio = useRef<HTMLAudioElement | null>(null)
	const audioContext = useRef<AudioContext | null>(null)
	const pomodoroGain = useRef<GainNode | null>(null)
	const patataGain = useRef<GainNode | null>(null)

	function applyTickVolume(vol: number) {
		if (pomodoroAudio.current) pomodoroAudio.current.volume = vol
		if (patataAudio.current) patataAudio.current.volume = vol
		if (stopAudio.current) stopAudio.current.volume = vol
		if (pomodoroGain.current) pomodoroGain.current.gain.value = vol
		if (patataGain.current) patataGain.current.gain.value = vol
	}

	function ensureAudioGraph() {
		if (audioContext.current || !pomodoroAudio.current || !patataAudio.current) return
		const Ctor = getAudioContextCtor()
		if (!Ctor) return
		try {
			const ctx = new Ctor()
			const pomodoroSource = ctx.createMediaElementSource(pomodoroAudio.current)
			const patataSource = ctx.createMediaElementSource(patataAudio.current)
			const pomodoroGainNode = ctx.createGain()
			const patataGainNode = ctx.createGain()
			pomodoroSource.connect(pomodoroGainNode)
			pomodoroGainNode.connect(ctx.destination)
			patataSource.connect(patataGainNode)
			patataGainNode.connect(ctx.destination)
			audioContext.current = ctx
			pomodoroGain.current = pomodoroGainNode
			patataGain.current = patataGainNode
			applyTickVolume(settings.tickVolume ?? 0.6)
		} catch {
			/* fallback to element.volume */
		}
	}

	// ── Init: load from localStorage & create audio ──
	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(LOG_KEY)
			if (raw) setLogs(JSON.parse(raw) as LogEntry[])
		} catch {
			/* ignore */
		}
		try {
			const raw = window.localStorage.getItem(SETTINGS_KEY)
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<StoredSettings>
				setSettings(prev => ({
					...prev,
					...parsed
				}))
				}
		} catch {
			/* ignore */
		}
		const base = import.meta.env.BASE_URL
		pomodoroAudio.current = new Audio(`${base}sounds/pomodoro.mp3`)
		patataAudio.current = new Audio(`${base}sounds/patata.mp3`)
		stopAudio.current = new Audio(`${base}sounds/stop.mp3`)

		applyTickVolume(settings.tickVolume ?? 0.6)

		return () => {
			stopAllSounds()
			if (stopAudio.current) {
				stopAudio.current.pause()
				stopAudio.current.currentTime = 0
			}
			if (audioContext.current) void audioContext.current.close()
		}
	}, [])

	useEffect(() => {
		window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
	}, [settings])

	useEffect(() => {
		const onUpdateReady = () => setUpdateReady(true)
		const onControllerChange = () => {
			window.location.reload()
		}
		window.addEventListener('eff-sw-update-ready', onUpdateReady)
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
		}
		return () => {
			window.removeEventListener('eff-sw-update-ready', onUpdateReady)
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.removeEventListener(
					'controllerchange',
					onControllerChange
				)
			}
		}
	}, [])

	// ── Apply tick volume ──
	useEffect(() => {
		applyTickVolume(settings.tickVolume ?? 0.6)
	}, [settings.tickVolume])

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
	const perMinuteRate = useMemo(
		() => settings.hourlyRate / 60,
		[settings.hourlyRate]
	)
	const todayKey = getDateKey(new Date())

	const totals = useMemo(() => {
		let earned = 0,
			lost = 0,
			workedMinutesToday = 0
		for (const e of logs) {
			if (e.mode === 'pomodoro') earned += e.amount
			else lost += Math.abs(e.amount)
			if (getDateKey(e.start) === todayKey && e.mode === 'pomodoro')
				workedMinutesToday += e.durationMinutes
		}
		if (isRunning && mode !== 'idle') {
			const mins = elapsedSeconds / 60
			const amt = mins * perMinuteRate
			if (mode === 'pomodoro') {
				earned += amt
				workedMinutesToday += mins
			} else {
				lost += Math.abs(amt)
			}
		}
		return { earned, lost, workedMinutesToday }
	}, [logs, todayKey, isRunning, elapsedSeconds, perMinuteRate, mode])

	const dayProgress = Math.min(
		100,
		settings.workdayMinutes > 0
			? (totals.workedMinutesToday / settings.workdayMinutes) * 100
			: 0
	)

	const pomodoroProgress = Math.min(
		100,
		mode === 'pomodoro'
			? (elapsedSeconds / (settings.pomodoroMinutes * 60 || 1)) * 100
			: 0
	)

	// ── Audio helpers ──
	function stopAllSounds() {
		;[pomodoroAudio.current, patataAudio.current].forEach(a => {
			if (!a) return
			a.pause()
			a.currentTime = 0
		})
	}

	function playModeSound(m: TimerMode) {
		stopAllSounds()
		ensureAudioGraph()
		if (audioContext.current?.state === 'suspended') {
			void audioContext.current.resume()
		}
		if (m === 'pomodoro' && pomodoroAudio.current) {
			pomodoroAudio.current.loop = true
			void pomodoroAudio.current.play()
		} else if (m === 'patata' && patataAudio.current) {
			patataAudio.current.loop = true
			void patataAudio.current.play()
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
			amount: sign * durationMinutes * perMinuteRate
		}
		setLogs(prev => {
			const next = [...prev, entry]
			window.localStorage.setItem(LOG_KEY, JSON.stringify(next))
			return next
		})
	}

	// ── Timer actions ──
	function startPomodoro() {
		setMode('pomodoro')
		setIsRunning(true)
		setElapsedSeconds(0)
		setCurrentStart(new Date())
		setPomodoroTargetReached(false)
		playModeSound('pomodoro')
	}

	function startPatata() {
		setMode('patata')
		setIsRunning(true)
		setElapsedSeconds(0)
		setCurrentStart(new Date())
		setPomodoroTargetReached(false)
		playModeSound('patata')
	}

	function stopCurrentTimer(thenPatata: boolean) {
		if (!currentStart || mode === 'idle') {
			setIsRunning(false)
			setMode('idle')
			stopAllSounds()
			return
		}
		persistLog(mode as WorkMode, currentStart, new Date())
		setIsRunning(false)
		setCurrentStart(null)
		setElapsedSeconds(0)
		setPomodoroTargetReached(false)
		stopAllSounds()
		if (thenPatata) startPatata()
		else setMode('idle')
	}

	function handlePomodoroTargetReached() {
		if (!currentStart || mode === 'idle' || pomodoroTargetReached) return
		const end = new Date()
		if (stopAudio.current) void stopAudio.current.play()
		persistLog('pomodoro', currentStart, end)
		setCurrentStart(null)
		setPomodoroTargetReached(true)
		startPatata()
	}

	function handlePomodoroButton() {
		if (mode === 'pomodoro' && isRunning) {
			stopCurrentTimer(true)
			return
		}
		if (mode === 'patata' && isRunning) stopCurrentTimer(false)
		startPomodoro()
	}

	function handlePatataWorkButton() {
		if (mode === 'patata' && isRunning) {
			stopCurrentTimer(false)
			startPomodoro()
			return
		}
		if (mode === 'idle') {
			startPatata()
		}
	}

	function handleClearLog() {
		if (!window.confirm('Очистить журнал и сбросить выработку?')) return
		setLogs(() => {
			window.localStorage.setItem(LOG_KEY, JSON.stringify([]))
			return []
		})
		setMode('idle')
		setIsRunning(false)
		setCurrentStart(null)
		stopAllSounds()
	}

	function handleApplyUpdate() {
		if (!('serviceWorker' in navigator)) {
			window.location.reload()
			return
		}
		void navigator.serviceWorker.getRegistration().then(registration => {
			if (registration?.waiting) {
				registration.waiting.postMessage({ type: 'SKIP_WAITING' })
				return
			}
			window.location.reload()
		})
	}

	// ── Render ──
	return (
		<div className='app'>
			{/* ── Верхняя строка: заголовок + настройки ── */}
			<header className='app-topbar'>
				<h1 className='app-title'>Pomodoro / Patata</h1>
				<SettingsBar
					settings={settings}
					onChange={patch => setSettings(prev => ({ ...prev, ...patch }))}
				/>
			</header>
			{updateReady && (
				<div className='update-banner' role='status'>
					<span>Доступна новая версия приложения</span>
					<button className='primary-button update-btn' onClick={handleApplyUpdate}>
						Обновить
					</button>
				</div>
			)}

			{/* ── Таймеры ── */}
			<div className='timers-section'>
				<div className='timers-row' data-mode={mode}>
					<PomodoroTimer
						elapsedSeconds={elapsedSeconds}
						isActive={mode === 'pomodoro'}
						isRunning={isRunning}
						progress={pomodoroProgress}
						onStart={handlePomodoroButton}
						buttonLabel={mode === 'pomodoro' && isRunning ? 'Отдыхать' : 'Работать'}
					/>
					<PatataTimer
						elapsedSeconds={elapsedSeconds}
						isActive={mode === 'patata'}
						isRunning={isRunning}
						onWork={handlePatataWorkButton}
						buttonLabel={mode === 'patata' && isRunning ? 'Работать' : 'Отдыхать'}
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
