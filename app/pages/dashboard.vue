<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { db, type Income, type Expense } from '~/lib/db'

const incomes = ref<Income[]>([])
const expenses = ref<Expense[]>([])

const now = new Date()

const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)
const selectedCategory = ref('all')

const loading = ref(true)
const errorMessage = ref('')

const months = [
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' }
]

const loadData = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    incomes.value = await db.incomes.toArray()
    expenses.value = await db.expenses.toArray()

    const years = availableYears.value

    if (years.length > 0 && !years.includes(selectedYear.value)) {
        selectedYear.value = years[0]!
    }

    if (
      selectedCategory.value !== 'all' &&
      !categories.value.includes(selectedCategory.value)
    ) {
      selectedCategory.value = 'all'
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Die Finanzdaten konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

/*
 * Aus dem ausgewählten Jahr und Monat wird
 * ein String wie "2026-09".
 */
const selectedMonthKey = computed(() => {
  return `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`
})

/*
 * Ermittelt die verfügbaren Jahre anhand der Datenbank.
 *
 * Zusätzlich werden bei offenen wiederkehrenden Einträgen
 * fünf zukünftige Jahre angeboten.
 */
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = new Set<number>()

  years.add(currentYear)

  let hasOpenRecurringEntry = false

  const allEntries = [
    ...incomes.value,
    ...expenses.value
  ]

  for (const entry of allEntries) {
    if (entry.startDate) {
      years.add(
        Number(entry.startDate.substring(0, 4))
      )
    }

    if (entry.endDate) {
      years.add(
        Number(entry.endDate.substring(0, 4))
      )
    }

    if (
      entry.recurrence === 'monthly' ||
      entry.recurrence === 'yearly'
    ) {
      if (!entry.endDate) {
        hasOpenRecurringEntry = true
      }
    }
  }

  /*
   * Bei einer offenen monatlichen/jährlichen Ausgabe
   * möchten wir auch zukünftige Monate/Jahre betrachten.
   */
  if (hasOpenRecurringEntry) {
    for (
      let year = currentYear;
      year <= currentYear + 5;
      year++
    ) {
      years.add(year)
    }
  }

  return Array.from(years).sort((a, b) => a - b)
})

/*
 * Kategorien werden komplett aus der Datenbank ermittelt.
 */
const categories = computed(() => {
  const categorySet = new Set<string>()

  for (const expense of expenses.value) {
    const category = expense.category?.trim()

    if (category) {
      categorySet.add(category)
    }
  }

  return Array.from(categorySet).sort((a, b) =>
    a.localeCompare(b, 'de')
  )
})

/*
 * Prüft, ob ein Datensatz im ausgewählten Monat aktiv ist.
 */
const isActiveInSelectedMonth = (
  entry: Income | Expense
) => {
  const selected = selectedMonthKey.value

  const startMonth = entry.startDate.substring(0, 7)

  /*
   * Der Eintrag existiert noch nicht.
   */
  if (selected < startMonth) {
    return false
  }

  /*
   * Der Eintrag ist bereits beendet.
   */
  if (entry.endDate) {
    const endMonth = entry.endDate.substring(0, 7)

    if (selected > endMonth) {
      return false
    }
  }

  /*
   * Einmalige Einnahme/Ausgabe
   */
  if (entry.recurrence === 'once') {
    return selected === startMonth
  }

  /*
   * Monatlich
   */
  if (entry.recurrence === 'monthly') {
    return true
  }

  /*
   * Jährlich:
   * Der Monat muss mit dem Startmonat übereinstimmen.
   */
  if (entry.recurrence === 'yearly') {
    const startMonthNumber = Number(
      entry.startDate.substring(5, 7)
    )

    return selectedMonth.value === startMonthNumber
  }

  return false
}

/*
 * Einnahmen des ausgewählten Monats.
 */
const selectedIncomes = computed(() => {
  return incomes.value.filter(
    income => isActiveInSelectedMonth(income)
  )
})

/*
 * Alle Ausgaben, die im ausgewählten Monat aktiv sind.
 *
 * Der Kategorie-Filter greift hier.
 */
const selectedExpenses = computed(() => {
  return expenses.value.filter(expense => {
    if (!isActiveInSelectedMonth(expense)) {
      return false
    }

    if (selectedCategory.value === 'all') {
      return true
    }

    return expense.category === selectedCategory.value
  })
})

/*
 * Einnahmen gesamt
 */
const totalIncome = computed(() => {
  return selectedIncomes.value.reduce(
    (sum, income) =>
      sum + Number(income.amount || 0),
    0
  )
})

/*
 * Wiederkehrende Ausgaben
 */
const recurringExpenses = computed(() => {
  return selectedExpenses.value.filter(
    expense => expense.recurrence !== 'once'
  )
})

/*
 * Einmalige Ausgaben
 */
const oneTimeExpenses = computed(() => {
  return selectedExpenses.value.filter(
    expense => expense.recurrence === 'once'
  )
})

const totalRecurringExpenses = computed(() => {
  return recurringExpenses.value.reduce(
    (sum, expense) =>
      sum + Number(expense.amount || 0),
    0
  )
})

const totalOneTimeExpenses = computed(() => {
  return oneTimeExpenses.value.reduce(
    (sum, expense) =>
      sum + Number(expense.amount || 0),
    0
  )
})

const totalExpenses = computed(() => {
  return (
    totalRecurringExpenses.value +
    totalOneTimeExpenses.value
  )
})

const balance = computed(() => {
  return totalIncome.value - totalExpenses.value
})

const selectedMonthName = computed(() => {
  return (
    months.find(
      month => month.value === selectedMonth.value
    )?.label ?? ''
  )
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

const recurrenceLabel = (
  recurrence: Expense['recurrence']
) => {
  switch (recurrence) {
    case 'monthly':
      return 'Monatlich'

    case 'yearly':
      return 'Jährlich'

    case 'once':
      return 'Einmalig'

    default:
      return recurrence
  }
}
</script>

<template>
  <div class="page dashboard-page">

    <!-- Header -->
    <header class="page-header dashboard-header">
      <div>
        <p class="eyebrow">
          FINANZEN
        </p>

        <h1>
          Dashboard
        </h1>

        <p class="subtitle">
          Finanzübersicht für {{ selectedMonthName }}
          {{ selectedYear }}
        </p>
      </div>

      <div class="header-actions">
        <NuxtLink
          to="/eintragen"
          class="btn btn-primary"
        >
          Daten bearbeiten
        </NuxtLink>
      </div>
    </header>

    <!-- Error -->
    <div
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </div>

    <!-- Filter -->
    <section class="dashboard-filters">

      <div class="filter-group">
        <label
          for="year"
          class="filter-label"
        >
          Jahr
        </label>

        <select
          id="year"
          v-model.number="selectedYear"
          class="filter-select"
        >
          <option
            v-for="year in availableYears"
            :key="year"
            :value="year"
          >
            {{ year }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label
          for="month"
          class="filter-label"
        >
          Monat
        </label>

        <select
          id="month"
          v-model.number="selectedMonth"
          class="filter-select"
        >
          <option
            v-for="month in months"
            :key="month.value"
            :value="month.value"
          >
            {{ month.label }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label
          for="category"
          class="filter-label"
        >
          Kategorie
        </label>

        <select
          id="category"
          v-model="selectedCategory"
          class="filter-select"
        >
          <option value="all">
            Alle Kategorien
          </option>

          <option
            v-for="category in categories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
      </div>

    </section>

    <!-- Loading -->
    <div
      v-if="loading"
      class="dashboard-empty"
    >
      Daten werden geladen ...
    </div>

    <template v-else>

      <!-- Summary -->
      <section class="summary dashboard-summary">

        <div class="summary-card">
          <span class="summary-label">
            Einnahmen
          </span>

          <strong class="income-value">
            {{ formatCurrency(totalIncome) }}
          </strong>

          <small class="dashboard-card-info">
            {{ selectedIncomes.length }} Einträge
          </small>
        </div>

        <div class="summary-card">
          <span class="summary-label">
            Fixkosten
          </span>

          <strong class="expense-value">
            {{ formatCurrency(totalRecurringExpenses) }}
          </strong>

          <small class="dashboard-card-info">
            Wiederkehrende Kosten
          </small>
        </div>

        <div class="summary-card">
          <span class="summary-label">
            Einmalige Ausgaben
          </span>

          <strong class="expense-value">
            {{ formatCurrency(totalOneTimeExpenses) }}
          </strong>

          <small class="dashboard-card-info">
            {{ oneTimeExpenses.length }} Einträge
          </small>
        </div>

        <div class="summary-card dashboard-balance-card">
          <span class="summary-label">
            Verfügbar
          </span>

          <strong
            :class="
              balance >= 0
                ? 'positive-value'
                : 'negative-value'
            "
          >
            {{ formatCurrency(balance) }}
          </strong>

          <small class="dashboard-card-info">
            Einnahmen − Ausgaben
          </small>
        </div>

      </section>

      <!-- Main dashboard -->
      <div class="dashboard-content">

        <!-- Einnahmen -->
        <section class="dashboard-section">

          <div class="dashboard-section-header">
            <div>
              <h2>
                Einnahmen
              </h2>

              <span>
                {{ selectedIncomes.length }} Einträge
              </span>
            </div>

            <strong class="dashboard-section-total income-value">
              {{ formatCurrency(totalIncome) }}
            </strong>
          </div>

          <div
            v-if="selectedIncomes.length > 0"
            class="dashboard-table-wrapper"
          >
            <table class="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Wiederholung</th>
                  <th>Start</th>
                  <th class="amount-column">
                    Betrag
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="income in selectedIncomes"
                  :key="income.id"
                >
                  <td>
                    <strong>
                      {{ income.name }}
                    </strong>
                  </td>

                  <td>
                    {{ recurrenceLabel(income.recurrence) }}
                  </td>

                  <td>
                    {{ income.startDate }}
                  </td>

                  <td class="amount-value income-value">
                    {{ formatCurrency(income.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else
            class="dashboard-empty"
          >
            Für diesen Monat sind keine Einnahmen vorhanden.
          </div>

        </section>

        <!-- Ausgaben -->
        <section class="dashboard-section">

          <div class="dashboard-section-header">
            <div>
              <h2>
                Ausgaben
              </h2>

              <span>
                {{ selectedExpenses.length }} Einträge

                <template
                  v-if="selectedCategory !== 'all'"
                >
                  · {{ selectedCategory }}
                </template>
              </span>
            </div>

            <strong class="dashboard-section-total expense-value">
              {{ formatCurrency(totalExpenses) }}
            </strong>
          </div>

          <div
            v-if="selectedExpenses.length > 0"
            class="dashboard-table-wrapper"
          >
            <table class="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kategorie</th>
                  <th>Art</th>
                  <th class="amount-column">
                    Betrag
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="expense in selectedExpenses"
                  :key="expense.id"
                >
                  <td>
                    <strong>
                      {{ expense.name }}
                    </strong>
                  </td>

                  <td>
                    <span
                      class="category-pill"
                    >
                      {{ expense.category || 'Keine Kategorie' }}
                    </span>
                  </td>

                  <td>
                    <span
                      :class="[
                        'transaction-type',
                        expense.recurrence === 'once'
                          ? 'transaction-once'
                          : 'transaction-recurring'
                      ]"
                    >
                      {{ recurrenceLabel(expense.recurrence) }}
                    </span>
                  </td>

                  <td class="amount-value expense-value">
                    {{ formatCurrency(expense.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else
            class="dashboard-empty"
          >
            Für diesen Monat wurden keine passenden Ausgaben gefunden.
          </div>

        </section>

      </div>

    </template>

  </div>
</template>

<style scoped>
.dashboard-page {
  max-width: 1500px;
  margin: 0 auto;
}

.dashboard-header {
  align-items: center;
}

.dashboard-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 25px;
  padding: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.filter-label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
}

.filter-select {
  min-width: 180px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  background: white;
  color: #111827;
  font: inherit;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px #dbeafe;
}

.dashboard-summary {
  grid-template-columns: repeat(4, 1fr);
}

.dashboard-card-info {
  display: block;
  margin-top: 6px;
  color: #9ca3af;
  font-size: 12px;
}

.dashboard-balance-card {
  border-left: 4px solid #2563eb;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-section {
  overflow: hidden;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.dashboard-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dashboard-section-header h2 {
  margin: 0;
  font-size: 18px;
}

.dashboard-section-header span {
  display: block;
  margin-top: 4px;
  color: #9ca3af;
  font-size: 13px;
}

.dashboard-section-total {
  font-size: 20px;
}

.dashboard-table-wrapper {
  overflow-x: auto;
}

.dashboard-table {
  width: 100%;
  min-width: 650px;
  border-collapse: collapse;
}

.dashboard-table th,
.dashboard-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.dashboard-table tr:last-child td {
  border-bottom: none;
}

.dashboard-table th {
  background: #f9fafb;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}

.dashboard-table td {
  font-size: 14px;
}

.dashboard-table tbody tr:hover {
  background: #f9fafb;
}

.dashboard-table .amount-column {
  width: 150px;
  text-align: right;
}

.amount-value {
  font-weight: 700;
  text-align: right !important;
  white-space: nowrap;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
}

.transaction-type {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.transaction-recurring {
  background: #eff6ff;
  color: #1d4ed8;
}

.transaction-once {
  background: #fef3c7;
  color: #92400e;
}

.dashboard-empty {
  padding: 35px 20px;
  color: #9ca3af;
  text-align: center;
}

@media (max-width: 1100px) {
  .dashboard-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .dashboard-header {
    align-items: flex-start;
  }

  .dashboard-filters {
    flex-direction: column;
  }

  .filter-group,
  .filter-select {
    width: 100%;
    min-width: 0;
  }

  .dashboard-summary {
    grid-template-columns: 1fr;
  }

  .dashboard-section-header {
    align-items: flex-start;
  }

  .dashboard-section-total {
    font-size: 17px;
  }
}
</style>