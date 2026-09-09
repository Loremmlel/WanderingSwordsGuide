import guide from './data/guide.json'
export type Chapter = (typeof guide.chapters)[number]
export type Task = Chapter['tasks'][number]
export type Branch = 'medicine' | 'nawu' | 'merchant'
export interface ProgressState {
  app: string
  schema: number
  revision: string
  statuses: Record<string, 'done' | 'skipped'>
  notes: Record<string, string>
  branch: Branch
  optional: boolean
  lastChapter: string
}
