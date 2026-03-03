type Props = {
	workedMinutes: number
	totalMinutes: number
	progress: number
}

export default function DayProgress({ workedMinutes, totalMinutes, progress }: Props) {
	const workedHours = (workedMinutes / 60).toFixed(2)
	const totalHours = (totalMinutes / 60).toFixed(1)
	const progressPct = progress.toFixed(1)
	const tooltip = `Дневная выработка: ${workedHours} ч из ${totalHours} ч, ${progressPct}%`

	return (
		<div className='panel panel-progress' title={tooltip} aria-label={tooltip}>
			<div className='progress-header'>
				<span className='progress-title'>Дневная выработка</span>
				<span>
					{workedHours} ч из {totalHours} ч
				</span>
				<span>{progressPct}%</span>
			</div>
			<div className='progress-bar'>
				<div className='progress-bar-fill' style={{ width: `${progress}%` }} />
			</div>
		</div>
	)
}
