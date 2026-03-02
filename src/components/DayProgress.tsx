type Props = {
	workedMinutes: number
	totalMinutes: number
	progress: number
}

export default function DayProgress({ workedMinutes, totalMinutes, progress }: Props) {
	return (
		<div className='panel panel-progress'>
			<div className='progress-header'>
				<span>Дневная выработка</span>
				<span>
					{(workedMinutes / 60).toFixed(2)} ч из {(totalMinutes / 60).toFixed(1)} ч
				</span>
				<span>{progress.toFixed(1)}%</span>
			</div>
			<div className='progress-bar'>
				<div className='progress-bar-fill' style={{ width: `${progress}%` }} />
			</div>
		</div>
	)
}
