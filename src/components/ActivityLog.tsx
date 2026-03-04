import { memo, useMemo } from 'react'
import type { LogEntry } from '../types'
import { getDateKey } from '../types'

type Props = {
	logs: LogEntry[]
	onClear: () => void
}

function ActivityLog({ logs, onClear }: Props) {
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
					entries: entries.sort((a, b) => (a.start < b.start ? 1 : -1))
			}))
	}, [logs])

	return (
		<div className='panel panel-log'>
			<div className='log-header'>
				<h2>Журнал</h2>
				<button className='danger-button danger-button-small' onClick={onClear}>
					Очистить
				</button>
			</div>

			{groupedByDate.length === 0 ? (
				<p className='empty-log'>Записей пока нет.</p>
			) : (
				<div className='log-list'>
					{groupedByDate.map(({ date, entries }) => (
						<div key={date} className='log-day'>
							<h3>
								{new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</h3>
							<ul>
								{entries.map(entry => {
									const start = new Date(entry.start)
									const end = new Date(entry.end)
									const sign = entry.mode === 'pomodoro' ? '+' : '-'
									return (
										<li key={entry.id} className={`log-item ${entry.mode}`}>
											<span className='log-time'>
												{start.toLocaleTimeString('ru-RU', {
													hour: '2-digit',
													minute: '2-digit'
												})}
												{' - '}
												{end.toLocaleTimeString('ru-RU', {
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
											<div className='log-bottom'>
												<span className='log-duration'>
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
	)
}

export default memo(ActivityLog, (prev, next) => prev.logs === next.logs)
