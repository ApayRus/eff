import { formatTime } from '../types'

type Props = {
	elapsedSeconds: number
	isActive: boolean
	isRunning: boolean
	progress: number
	onStart: () => void
}

export default function PomodoroTimer({
	elapsedSeconds,
	isActive,
	isRunning,
	progress,
	onStart
}: Props) {
	const status =
		isActive && isRunning
			? 'Работаем'
			: isActive
				? 'На паузе'
				: 'Готов к старту'

	const btnLabel = isActive && isRunning ? 'Стоп → Patata' : 'Старт Pomodoro'

	return (
		<div
			className={`timer-card timer-card-pomodoro${isActive ? ' timer-card-active' : ''}`}
		>
			<div className='timer-inner'>
				<div className='timer-label'>Pomodoro</div>
				<div className='timer-time'>
					{isActive ? formatTime(elapsedSeconds) : '00:00'}
				</div>
				<div className='timer-status'>{status}</div>
				<div className='timer-progress'>
					<div className='timer-progress-bar'>
						<div
							className='timer-progress-fill'
							style={{ width: `${progress.toFixed(1)}%` }}
						/>
					</div>
					<span className='timer-progress-pct'>{progress.toFixed(0)}%</span>
				</div>
				<button className='primary-button timer-btn' onClick={onStart}>
					{btnLabel}
				</button>
			</div>
		</div>
	)
}
