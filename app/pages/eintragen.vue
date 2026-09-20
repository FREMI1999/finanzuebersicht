<script setup lang="ts">
import { onMounted, ref, toRaw } from 'vue'
import { db, type Income, type Expense } from '~/lib/db'

type IncomeRow = Income
type ExpenseRow = Expense

const activeTab = ref<'income' | 'expense'>('expense')

const incomes = ref<IncomeRow[]>([])
const expenses = ref<ExpenseRow[]>([])

const deletedIncomeIds = ref<number[]>([])
const deletedExpenseIds = ref<number[]>([])

const saving = ref(false)
const saved = ref(false)
const errorMessage = ref('')

const loadData = async () => {
  try {
    incomes.value = await db.incomes.toArray()
    expenses.value = await db.expenses.toArray()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Die Daten konnten nicht geladen werden.'
  }
}

onMounted(() => {
  loadData()
})

const addIncome = () => {
  incomes.value.push({
    name: '',
    amount: 0,
    recurrence: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: undefined
  })

  saved.value = false
}

const addExpense = () => {
  expenses.value.push({
    name: '',
    amount: 0,
    category: '',
    recurrence: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: undefined
  })

  saved.value = false
}

const removeIncome = (index: number) => {
  const income = incomes.value[index]

  if (income?.id !== undefined) {
    deletedIncomeIds.value.push(income.id)
  }

  incomes.value.splice(index, 1)
  saved.value = false
}

const removeExpense = (index: number) => {
  const expense = expenses.value[index]

  if (expense?.id !== undefined) {
    deletedExpenseIds.value.push(expense.id)
  }

  expenses.value.splice(index, 1)
  saved.value = false
}

const saveData = async () => {
  saving.value = true
  saved.value = false
  errorMessage.value = ''

  try {
    await db.transaction(
      'rw',
      db.incomes,
      db.expenses,
      async () => {
        /*
         * Bestehende gelöschte Datensätze entfernen
         */
        if (deletedIncomeIds.value.length > 0) {
          await db.incomes.bulkDelete(deletedIncomeIds.value)
        }

        if (deletedExpenseIds.value.length > 0) {
          await db.expenses.bulkDelete(deletedExpenseIds.value)
        }

        /*
         * Leere Zeilen nicht speichern.
         */
        const validIncomes = incomes.value.filter(
          income =>
            income.name.trim() !== '' &&
            income.amount > 0
        )

        const validExpenses = expenses.value.filter(
          expense =>
            expense.name.trim() !== '' &&
            expense.amount > 0
        )

        /*
         * bulkPut:
         * - vorhandene Datensätze werden aktualisiert
         * - neue Datensätze werden eingefügt
         */
        if (validIncomes.length > 0) {
            await db.incomes.bulkPut(
                validIncomes.map(income => toRaw(income))
            )
        }

        if (validExpenses.length > 0) {
            await db.expenses.bulkPut(
                validExpenses.map(expense => toRaw(expense))
            )
        }
      }
    )

    /*
     * IDs der gelöschten Datensätze zurücksetzen
     */
    deletedIncomeIds.value = []
    deletedExpenseIds.value = []

    /*
     * Daten erneut aus IndexedDB laden.
     * Dadurch erhalten neue Datensätze ihre ID.
     */
    await loadData()

    saved.value = true

    setTimeout(() => {
      saved.value = false
    }, 2500)
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Beim Speichern ist ein Fehler aufgetreten.'
  } finally {
    saving.value = false
  }
}

const totalIncome = () => {
  return incomes.value.reduce(
    (sum, income) => sum + Number(income.amount || 0),
    0
  )
}

const totalExpenses = () => {
  return expenses.value.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  )
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <p class="eyebrow">FINANZEN</p>
        <h1>Dateneingabe</h1>
        <p class="subtitle">
          Einnahmen und Ausgaben verwalten
        </p>
      </div>

      <div class="header-actions">
        <span v-if="saved" class="save-status success">
          ✓ Gespeichert
        </span>

        <span v-else-if="saving" class="save-status">
          Speichert ...
        </span>

        <button
          class="btn btn-dark"
          :disabled="saving"
          @click="saveData"
        >
          {{ saving ? 'Speichert ...' : 'Änderungen speichern' }}
        </button>
      </div>
    </header>

    <!-- Fehlermeldung -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Übersicht -->
    <section class="summary">
      <div class="summary-card">
        <span class="summary-label">Einnahmen</span>
        <strong class="income-value">
          {{ formatCurrency(totalIncome()) }}
        </strong>
      </div>

      <div class="summary-card">
        <span class="summary-label">Ausgaben</span>
        <strong class="expense-value">
          {{ formatCurrency(totalExpenses()) }}
        </strong>
      </div>

      <div class="summary-card">
        <span class="summary-label">Monatlicher Saldo*</span>
        <strong
          :class="{
            'positive-value': totalIncome() - totalExpenses() >= 0,
            'negative-value': totalIncome() - totalExpenses() < 0
          }"
        >
          {{ formatCurrency(totalIncome() - totalExpenses()) }}
        </strong>
      </div>
    </section>

    <!-- Tabs -->
    <div class="tabs">
      <button
        :class="{ active: activeTab === 'expense' }"
        @click="activeTab = 'expense'"
      >
        Ausgaben
      </button>

      <button
        :class="{ active: activeTab === 'income' }"
        @click="activeTab = 'income'"
      >
        Einnahmen
      </button>
    </div>

    <!-- Tabelle -->
    <main class="spreadsheet-container">
      <!-- AUSGABEN -->
      <section v-if="activeTab === 'expense'">
        <div class="table-toolbar">
          <div>
            <h2>Ausgaben</h2>
            <span>
              {{ expenses.length }} Einträge
            </span>
          </div>

          <button
            class="btn btn-primary"
            @click="addExpense"
          >
            + Ausgabe
          </button>
        </div>

        <div class="table-wrapper">
          <table class="spreadsheet">
            <thead>
              <tr>
                <th class="row-number">#</th>
                <th>Name</th>
                <th class="amount-column">Betrag</th>
                <th>Kategorie</th>
                <th>Wiederholung</th>
                <th>Start</th>
                <th>Ende</th>
                <th class="action-column"></th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(expense, index) in expenses"
                :key="expense.id ?? `new-${index}`"
              >
                <td class="row-number">
                  {{ index + 1 }}
                </td>

                <td>
                  <input
                    v-model="expense.name"
                    type="text"
                    placeholder="z. B. Miete"
                  />
                </td>

                <td class="amount-cell">
                  <input
                    v-model.number="expense.amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                  />
                  <span>€</span>
                </td>

                <td>
                  <input
                    v-model="expense.category"
                    type="text"
                    placeholder="z. B. Wohnen"
                  />
                </td>

                <td>
                  <select v-model="expense.recurrence">
                    <option value="once">
                      Einmalig
                    </option>

                    <option value="monthly">
                      Monatlich
                    </option>

                    <option value="yearly">
                      Jährlich
                    </option>
                  </select>
                </td>

                <td>
                  <input
                    v-model="expense.startDate"
                    type="date"
                  />
                </td>

                <td>
                  <input
                    v-model="expense.endDate"
                    type="date"
                  />
                </td>

                <td class="action-cell">
                  <button
                    class="btn btn-danger"
                    title="Zeile löschen"
                    @click="removeExpense(index)"
                  >
                    x
                  </button>
                </td>
              </tr>

              <tr v-if="expenses.length === 0">
                <td colspan="8" class="empty-state">
                  Noch keine Ausgaben vorhanden.
                  <button @click="addExpense">
                    Erste Ausgabe hinzufügen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- EINNAHMEN -->
      <section v-else>
        <div class="table-toolbar">
          <div>
            <h2>Einnahmen</h2>
            <span>
              {{ incomes.length }} Einträge
            </span>
          </div>

          <button
            class="add-button"
            @click="addIncome"
          >
            + Einnahme
          </button>
        </div>

        <div class="table-wrapper">
          <table class="spreadsheet">
            <thead>
              <tr>
                <th class="row-number">#</th>
                <th>Name</th>
                <th class="amount-column">Betrag</th>
                <th>Wiederholung</th>
                <th>Start</th>
                <th>Ende</th>
                <th class="action-column"></th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(income, index) in incomes"
                :key="income.id ?? `new-${index}`"
              >
                <td class="row-number">
                  {{ index + 1 }}
                </td>

                <td>
                  <input
                    v-model="income.name"
                    type="text"
                    placeholder="z. B. Gehalt"
                  />
                </td>

                <td class="amount-cell">
                  <input
                    v-model.number="income.amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                  />
                  <span>€</span>
                </td>

                <td>
                  <select v-model="income.recurrence">
                    <option value="once">
                      Einmalig
                    </option>

                    <option value="monthly">
                      Monatlich
                    </option>

                    <option value="yearly">
                      Jährlich
                    </option>
                  </select>
                </td>

                <td>
                  <input
                    v-model="income.startDate"
                    type="date"
                  />
                </td>

                <td>
                  <input
                    v-model="income.endDate"
                    type="date"
                  />
                </td>

                <td class="action-cell">
                  <button
                    class="delete-button"
                    title="Zeile löschen"
                    @click="removeIncome(index)"
                  >
                    ×
                  </button>
                </td>
              </tr>

              <tr v-if="incomes.length === 0">
                <td colspan="7" class="empty-state">
                  Noch keine Einnahmen vorhanden.
                  <button @click="addIncome">
                    Erste Einnahme hinzufügen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <p class="footnote">
      * Der Saldo berücksichtigt aktuell alle eingetragenen Werte.
      Die Monatslogik bauen wir im nächsten Schritt.
    </p>
  </div>
</template>