export type TimerMode = 'idle' | 'pomodoro' | 'patata'
export type WorkMode = Extract<TimerMode, 'pomodoro' | 'patata'>

export type LogEntry = {
	id: string
	mode: WorkMode
	start: string
	end: string
	durationMinutes: number
	amount: number
}

export type StoredSettings = {
	hourlyRate: number
	workdayMinutes: number
	pomodoroMinutes: number
	tickVolume: number
}

export const defaultSettings: StoredSettings = {
	hourlyRate: 1000,
	workdayMinutes: 480,
	pomodoroMinutes: 40,
	tickVolume: 0.6
}

export function formatTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function getDateKey(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}
