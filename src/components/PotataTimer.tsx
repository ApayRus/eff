import { formatTime } from '../types'

type Props = {
	elapsedSeconds: number
	isActive: boolean
	isRunning: boolean
}

export default function PotataTimer({ elapsedSeconds, isActive, isRunning }: Props) {
	const status = isActive && isRunning ? 'Отдыхаем — деньги тают' : 'Ждём Pomodoro'

	return (
		<div className={`timer-card timer-card-potata${isActive ? ' timer-card-active' : ''}`}>
			<div className='timer-inner'>
				<div className='timer-label'>Potata</div>
				<div className='timer-time'>
					{isActive ? formatTime(elapsedSeconds) : '--:--'}
				</div>
				<div className='timer-status'>{status}</div>
			</div>
		</div>
	)
}
