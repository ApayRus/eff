type Props = {
	earned: number
	lost: number
}

export default function MoneyRow({ earned, lost }: Props) {
	return (
		<div className='money-row'>
			<div className='money-card money-earned'>
				<span className='money-label'>Заработано</span>
				<strong>{earned.toFixed(2)} ₽</strong>
			</div>
			<div className='money-card money-lost'>
				<span className='money-label'>Упущено</span>
				<strong>{lost.toFixed(2)} ₽</strong>
			</div>
		</div>
	)
}
