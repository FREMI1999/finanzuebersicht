import { Dexie, type EntityTable } from 'dexie'

export interface Income {
  id?: number
  name: string
  amount: number
  recurrence: 'once' | 'monthly' | 'yearly'
  startDate: string
  endDate?: string
}
// example monthly
// {
//   id: 1,
//   name: 'Gehalt',
//   amount: 2800,
//   recurrence: 'monthly',
//   startDate: '2026-09-01'
// }
// example once
// {
//   id: 2,
//   name: 'Bonus',
//   amount: 500,
//   recurrence: 'once',
//   startDate: '2026-12-01'
// }

export interface Expense {
  id?: number
  name: string
  amount: number
  category: string
  recurrence: 'once' | 'monthly' | 'yearly'
  startDate: string
  endDate?: string
}
// example monthly
// {
//   id: 1,
//   name: 'Miete',
//   amount: 850,
//   category: 'Wohnen',
//   recurrence: 'monthly',
//   startDate: '2026-09-01'
// }
// example once
// {
//   id: 2,
//   name: 'Grafikkarte',
//   amount: 450,
//   category: 'Technik',
//   recurrence: 'once',
//   startDate: '2026-10-01'
// }

const db = new Dexie('FinanceDatabase') as Dexie & {
  incomes: EntityTable<Income, 'id'>
  expenses: EntityTable<Expense, 'id'>
}

db.version(1).stores({
  incomes: '++id, name, recurrence, startDate, endDate',
  expenses: '++id, name, category, recurrence, startDate, endDate'
})

export { db }