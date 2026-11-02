/** What goes on the picture shared after a match: the teams, the result, the two scores, the Man of the Match and the best moments. */
export interface ShareInfo {
  title: string
  result: string
  scores: { team: string; score: string }[]
  motm?: string
  moments: string[]
  colors: [string, string]
}

/** The shared text (also put on the clipboard when the phone cannot share a picture). */
export const shareText = (i: ShareInfo): string =>
  [`${i.title}`, i.result, ...i.scores.map((s) => `${s.team} ${s.score}`), i.motm ? `Man of the Match: ${i.motm}` : '', ...(i.moments.length ? ['', 'Highlights:', ...i.moments.map((m) => `• ${m}`)] : []), '', 'Fantasy Cric Sim'].filter((l, k, a) => l !== '' || a[k - 1] !== '').join('\n')

/** A 1080 x 1350 picture of the match highlights, drawn on a canvas. */
export function drawShareCard(i: ShareInfo): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 1080; c.height = 1350
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const g = ctx.createLinearGradient(0, 0, 1080, 1350)
  g.addColorStop(0, i.colors[0]); g.addColorStop(0.55, '#0b1020'); g.addColorStop(1, i.colors[1])
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, 1080, 1350)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fbbf24'; ctx.font = '800 38px sans-serif'; ctx.fillText('MATCH HIGHLIGHTS', 540, 90)
  ctx.fillStyle = '#ffffff'; ctx.font = '900 64px sans-serif'; ctx.fillText(i.title, 540, 190, 980)
  ctx.fillStyle = '#fde68a'; ctx.font = '800 44px sans-serif'; ctx.fillText(i.result, 540, 290, 980)
  i.scores.forEach((s, k) => {
    const y = 420 + k * 120
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(90, y - 48, 900, 96, 20); ctx.fill()
    ctx.textAlign = 'left'; ctx.fillStyle = '#e2e8f0'; ctx.font = '700 40px sans-serif'; ctx.fillText(s.team, 130, y, 540)
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = '900 54px sans-serif'; ctx.fillText(s.score, 950, y)
  })
  ctx.textAlign = 'center'
  if (i.motm) { ctx.fillStyle = '#a5b4fc'; ctx.font = '700 36px sans-serif'; ctx.fillText(`Man of the Match: ${i.motm}`, 540, 690, 980) }
  ctx.fillStyle = '#fbbf24'; ctx.font = '800 34px sans-serif'; ctx.fillText('THE BEST MOMENTS', 540, 790)
  ctx.textAlign = 'left'
  i.moments.slice(0, 6).forEach((m, k) => { ctx.fillStyle = '#ffffff'; ctx.font = '700 36px sans-serif'; ctx.fillText(`•  ${m}`, 100, 870 + k * 66, 880) })
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '700 30px sans-serif'; ctx.fillText('Fantasy Cric Sim', 540, 1290)
  return c
}

/** Shares the picture and the text with the phone's share sheet; where that is not possible the picture is saved and the text copied. Returns what happened. */
export async function shareHighlights(i: ShareInfo): Promise<'shared' | 'saved' | 'failed'> {
  try {
    const canvas = drawShareCard(i)
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
    const text = shareText(i)
    if (blob) {
      const file = new File([blob], 'match-highlights.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: i.title, text }); return 'shared' }
      if (navigator.share) { await navigator.share({ title: i.title, text }); return 'shared' }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'match-highlights.png'; document.body.appendChild(a); a.click(); a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    }
    try { await navigator.clipboard?.writeText(text) } catch { /* the picture is saved anyway */ }
    return 'saved'
  } catch (e) {
    return (e as { name?: string })?.name === 'AbortError' ? 'shared' : 'failed' // (closing the share sheet is not an error)
  }
}
