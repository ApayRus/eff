import { useState } from 'react'
import type { StoredSettings } from '../types'

type Props = {
	settings: StoredSettings
	onChange: (patch: Partial<StoredSettings>) => void
}

function SpeakerIcon({ muted }: { muted: boolean }) {
	if (muted) {
		return (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
				<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
				<line x1="23" y1="9" x2="17" y2="15" />
				<line x1="17" y1="9" x2="23" y2="15" />
			</svg>
		)
	}
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
			<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
			<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
		</svg>
	)
}

export default function SettingsBar({ settings, onChange }: Props) {
	const [volumeOpen, setVolumeOpen] = useState(false)
	const muted = (settings.tickVolume ?? 0.6) === 0

	return (
		<div className="settings-bar">
			<label className="s-field s-field--hour">
				<span>₽/ч</span>
				<input
					type="number"
					min={0}
					value={settings.hourlyRate}
					onChange={e => onChange({ hourlyRate: Number(e.target.value) || 0 })}
				/>
			</label>
			<label className="s-field s-field--day">
				<span>День (ч)</span>
				<input
					type="number"
					min={0.5}
					step={0.5}
					value={settings.workdayMinutes / 60}
					onChange={e =>
						onChange({ workdayMinutes: (Number(e.target.value) || 0) * 60 })
					}
				/>
			</label>
			<label className="s-field s-field--focus">
				<span>Фокус (мин)</span>
				<input
					type="number"
					min={1}
					value={settings.pomodoroMinutes}
					onChange={e =>
						onChange({ pomodoroMinutes: Number(e.target.value) || 1 })
					}
				/>
			</label>

			<div className="s-volume-wrap">
				<button
					type="button"
					className="s-volume-btn"
					onClick={() => setVolumeOpen(open => !open)}
					title={muted ? 'Включить звук' : 'Громкость тика'}
					aria-label="Громкость тика"
				>
					<SpeakerIcon muted={muted} />
				</button>
				{volumeOpen && (
					<>
						<div
							className="s-volume-backdrop"
							aria-hidden
							onClick={() => setVolumeOpen(false)}
						/>
						<div className="s-volume-popover">
							<div className="s-volume-label">Громкость тика</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.05}
								value={settings.tickVolume ?? 0.6}
								onChange={e =>
									onChange({ tickVolume: Number(e.target.value) || 0 })
								}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
