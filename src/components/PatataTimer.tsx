import { formatTime } from '../types'

type Props = {
	elapsedSeconds: number
	isActive: boolean
	isRunning: boolean
	onWork: () => void
	buttonLabel: string
}

export default function PatataTimer({
	elapsedSeconds,
	isActive,
	isRunning,
	onWork,
	buttonLabel
}: Props) {
	const status =
		isActive && isRunning ? 'Отдыхаем — упускаем деньги' : 'Ждём Pomodoro'

	return (
		<div
			className={`timer-card timer-card-patata${isActive ? ' timer-card-active' : ''}`}
		>
			<div className='timer-inner'>
				<div className='timer-label'>Patata</div>
				<div className='timer-time'>
					{isActive ? formatTime(elapsedSeconds) : '--:--'}
				</div>
				<div className='timer-status'>{status}</div>
			</div>
			<button
				className='primary-button timer-btn'
				onClick={onWork}
				aria-label={buttonLabel}
			>
				{buttonLabel}
			</button>
		</div>
	)
}
