import type { Player } from '../types'
import youth from './youth.json'

/** An unsigned young player: today's ratings, the most he could grow into (hidden in the sim, hinted in the market), and his show. */
export interface YouthPlayer extends Player { potential: number; series: string }

export const YOUTH: YouthPlayer[] = youth as unknown as YouthPlayer[]
export const YOUTH_BY_ID = new Map(YOUTH.map((p) => [p.id, p]))
