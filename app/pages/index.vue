<script setup lang="ts">
import { db } from '~/lib/db'

const addTestData = async () => {
  await db.incomes.add({
    name: 'Gehalt',
    amount: 2800,
    recurrence: 'monthly',
    startDate: '2026-09-01'
  })

  await db.expenses.bulkAdd([
    {
      name: 'Miete',
      amount: 850,
      category: 'Wohnen',
      recurrence: 'monthly',
      startDate: '2026-09-01'
    },
    {
      name: 'Internet',
      amount: 40,
      category: 'Verträge',
      recurrence: 'monthly',
      startDate: '2026-09-01'
    },
    {
      name: 'Restaurant',
      amount: 35,
      category: 'Freizeit',
      recurrence: 'once',
      startDate: '2026-09-01'
    }
  ])

  console.log('Daten gespeichert')
}

const loadData = async () => {
  const incomes = await db.incomes.toArray()
  const expenses = await db.expenses.toArray()

  console.log('Einnahmen:', incomes)
  console.log('Ausgaben:', expenses)
}
</script>

<template>
  <div>
    <button @click="addTestData">
      Testdaten speichern
    </button>

    <button @click="loadData">
      Daten laden
    </button>
  </div>
</template>