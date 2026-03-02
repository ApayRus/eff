import type { StoredSettings } from '../types'

type Props = {
	settings: StoredSettings
	onChange: (patch: Partial<StoredSettings>) => void
}

export default function SettingsBar({ settings, onChange }: Props) {
	return (
		<div className='settings-bar'>
			<label className='s-field'>
				<span>₽/ч</span>
				<input
					type='number'
					min={0}
					value={settings.hourlyRate}
					onChange={e => onChange({ hourlyRate: Number(e.target.value) || 0 })}
				/>
			</label>
			<label className='s-field'>
				<span>День (ч)</span>
				<input
					type='number'
					min={0.5}
					step={0.5}
					value={settings.workdayMinutes / 60}
					onChange={e => onChange({ workdayMinutes: (Number(e.target.value) || 0) * 60 })}
				/>
			</label>
			<label className='s-field'>
				<span>Pomodoro (мин)</span>
				<input
					type='number'
					min={1}
					value={settings.pomodoroMinutes}
					onChange={e => onChange({ pomodoroMinutes: Number(e.target.value) || 1 })}
				/>
			</label>
		</div>
	)
}
