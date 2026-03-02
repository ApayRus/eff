export type TimerMode = 'idle' | 'pomodoro' | 'potata'
export type WorkMode = Extract<TimerMode, 'pomodoro' | 'potata'>

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
}

export const defaultSettings: StoredSettings = {
	hourlyRate: 1000,
	workdayMinutes: 480,
	pomodoroMinutes: 40,
}

export function formatTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function getDateKey(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return d.toISOString().slice(0, 10)
}
