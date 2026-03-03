import { useEffect } from 'react'

type YandexMetrikaProps = {
	yandexMetrikaId: number
}

declare global {
	interface Window {
		ym?: (...args: unknown[]) => void
		__ymInitIds?: Set<number>
	}
}

export default function YandexMetrika({ yandexMetrikaId }: YandexMetrikaProps) {
	useEffect(() => {
		if (!yandexMetrikaId) return

		if (!window.ym) {
			window.ym = function (...args: unknown[]) {
				const ymFn = window.ym as ((...a: unknown[]) => void) & { a?: unknown[][] }
				ymFn.a = ymFn.a || []
				ymFn.a.push(args)
			}
			;(window.ym as ((...a: unknown[]) => void) & { l?: number }).l = Date.now()
		}

		const tagUrl = 'https://mc.yandex.ru/metrika/tag.js'
		const existingScript = document.querySelector<HTMLScriptElement>(
			`script[src="${tagUrl}"]`
		)
		if (!existingScript) {
			const script = document.createElement('script')
			script.async = true
			script.src = tagUrl
			document.head.appendChild(script)
		}

		if (!window.__ymInitIds) window.__ymInitIds = new Set<number>()
		if (window.__ymInitIds.has(yandexMetrikaId)) return

		window.ym?.(yandexMetrikaId, 'init', {
			clickmap: true,
			trackLinks: true,
			accurateTrackBounce: true,
			webvisor: true
		})
		window.__ymInitIds.add(yandexMetrikaId)
	}, [yandexMetrikaId])

	return (
		<noscript>
			<div>
				<img
					src={`https://mc.yandex.ru/watch/${yandexMetrikaId}`}
					style={{ position: 'absolute', left: '-9999px' }}
					alt=''
				/>
			</div>
		</noscript>
	)
}
