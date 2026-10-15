import { useState } from 'react'

export interface Col<T> {
  key: string
  label: string
  /** The value to sort by (null sorts last). */
  get: (row: T) => number | string | null
  cell: (row: T, rank: number) => React.ReactNode
  align?: 'left' | 'right'
  /** Which way the first click sorts. Most numbers start high-to-low; economy and averages that are "lower is better" start low-to-high. */
  first?: 'asc' | 'desc'
  title?: string
}

type Sort = { key: string; dir: 'asc' | 'desc' } | null

/**
 * A table whose columns can be sorted. It opens in the order the rows come in; clicking a column sorts by it
 * (an arrow shows which way), clicking again reverses it, and a third click goes back to the starting order.
 */
export function SortTable<T>({ rows, cols, rowKey, lead, rowClass, initial }: {
  rows: T[]
  cols: Col<T>[]
  rowKey: (row: T) => string
  /** A first column (rank, cap icon…). It gets `isDefault` so e.g. a cap icon only shows on the real leader. */
  lead?: (rank: number, isDefault: boolean) => React.ReactNode
  rowClass?: (row: T, rank: number) => string
  /** The column the rows already come sorted by, so its arrow shows from the start. A third click returns to it. */
  initial?: { key: string; dir: 'asc' | 'desc' }
}) {
  const [sort, setSort] = useState<Sort>(initial ?? null)
  const col = sort ? cols.find((c) => c.key === sort.key) : undefined

  const shown = (() => {
    if (!sort || !col) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = col.get(a), y = col.get(b)
      if (x === null && y === null) return 0
      if (x === null) return 1
      if (y === null) return -1
      return (typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number)) * dir
    })
  })()

  const click = (c: Col<T>) => {
    const natural = c.first ?? (c.align === 'left' ? 'asc' : 'desc')
    const opposite = natural === 'asc' ? 'desc' : 'asc'
    setSort((s) => (!s || s.key !== c.key ? { key: c.key, dir: natural } : s.dir === natural ? { key: c.key, dir: opposite } : (initial ?? null)))
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-[11px] uppercase tracking-wider text-slate-500">
        <tr>
          {lead && <th className="px-2 py-2" />}
          {cols.map((c) => {
            const on = sort?.key === c.key
            return (
              <th key={c.key} className={`px-2 py-2 font-medium ${c.align === 'left' ? 'text-left max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-panel' : 'text-right'}`} aria-sort={on ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => click(c)} title={c.title ?? `Sort by ${c.label}`} className={`inline-flex cursor-pointer items-center gap-1 uppercase tracking-wider transition hover:text-white ${on ? 'text-white' : ''}`}>
                  {c.label}
                  <span className={`w-2.5 text-[10px] ${on ? 'text-sky-300' : 'text-transparent'}`} aria-hidden>{on ? (sort!.dir === 'asc' ? '▲' : '▼') : '▼'}</span>
                </button>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {shown.map((r, i) => (
          <tr key={rowKey(r)} className={`border-t border-line/60 ${rowClass?.(r, i) ?? ''}`}>
            {lead && lead(i, !sort || (!!initial && sort.key === initial.key && sort.dir === initial.dir))}
            {cols.map((c) => (
              <td key={c.key} className={c.align === 'left' ? 'px-2 py-1.5 max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-panel max-md:shadow-[6px_0_8px_-4px_rgba(0,0,0,.5)]' : 'px-2 py-2 text-right tabular-nums text-slate-300'}>{c.cell(r, i)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
