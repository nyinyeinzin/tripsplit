import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { perPersonBudgetTHB, tripDays } from "../data/tripData";
import { formatMoney, formatUsd, moneyToTHB } from "../utils/currency";
import {
  getBookedTourActualByDay,
  getBudgetActivities,
  getCategoryBreakdown,
  getDayEstimate,
  getPerPersonCost,
  getTotalEstimate
} from "../utils/budget";
import { STORAGE_KEYS, readStoredJson, writeStoredJson } from "../utils/storage";
import CurrencySwitch from "../components/CurrencySwitch";

const spendCategories = ["Tours", "Food & cafes", "Temples & entry", "Transport", "Other"];

function readRealSpend() {
  return readStoredJson(STORAGE_KEYS.realSpend, []);
}

function writeRealSpend(entries) {
  writeStoredJson(STORAGE_KEYS.realSpend, entries);
}

export default function BudgetPage({ activities, currency, setCurrency }) {
  const [spendDay, setSpendDay] = useState(1);
  const [spendCategory, setSpendCategory] = useState("Food & cafes");
  const [spendAmount, setSpendAmount] = useState("");
  const [realSpends, setRealSpends] = useState(readRealSpend);

  const plannedTotal = getTotalEstimate(activities);
  const bookedByDay = useMemo(() => getBookedTourActualByDay(activities), [activities]);
  const bookedActualTotal = Object.values(bookedByDay).reduce((total, value) => total + value, 0);
  const manualActualTotal = realSpends.reduce(
    (total, item) => total + moneyToTHB(item.amount, item.currency),
    0
  );
  const actualTotal = bookedActualTotal + manualActualTotal;
  const budgetLeft = perPersonBudgetTHB - actualTotal;
  const rows = getCategoryBreakdown(activities);
  const exactUsdItems = getBudgetActivities(activities).filter((item) => item.costPerPersonUSD);

  function addSpend(event) {
    event.preventDefault();
    const rawAmount = Number(spendAmount);
    // Validate the entered amount, not the THB conversion — small IDR amounts
    // round down to 0 THB and were silently rejected before.
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) return;
    const amountTHB = moneyToTHB(rawAmount, currency);

    setRealSpends((current) => {
      const next = [
        ...current,
        {
          id: "spend-" + Date.now(),
          category: spendCategory,
          amount: rawAmount,
          currency,
          day: Number(spendDay),
          note: "",
          created_at: new Date().toISOString()
        }
      ];
      writeRealSpend(next);
      return next;
    });

    setSpendAmount("");
  }

  function deleteSpend(id) {
    setRealSpends((current) => {
      const next = current.filter((spend) => spend.id !== id);
      writeRealSpend(next);
      return next;
    });
  }

  return (
    <main className="page page-scroll">
      <header className="page-header budget-header">
        <div>
          <p className="eyebrow">Per-person budget</p>
          <h1>Budget</h1>
        </div>
        <CurrencySwitch currency={currency} setCurrency={setCurrency} />
      </header>

      <section className="card budget-hero">
        <div className="budget-card-stack">
          <RealUseCard actualTotal={actualTotal} budgetLeft={budgetLeft} currency={currency} />
          <ExpectedUseCard plannedTotal={plannedTotal} currency={currency} />
        </div>
      </section>

      <section className="card spend-card">
        <h2>Add real spend</h2>
        <form onSubmit={addSpend} className="spend-form">
          <select value={spendDay} onChange={(event) => setSpendDay(event.target.value)}>
            {tripDays.map((day) => (
              <option key={day.day} value={day.day}>Day {day.day} - {day.date}</option>
            ))}
          </select>
          <select value={spendCategory} onChange={(event) => setSpendCategory(event.target.value)}>
            {spendCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <input
            inputMode="decimal"
            value={spendAmount}
            onChange={(event) => setSpendAmount(event.target.value)}
            placeholder={`Per-person amount in ${currency}`}
            aria-label={`Amount per person in ${currency}`}
          />
          <button type="submit"><Plus size={18} /> Add</button>
        </form>
      </section>

      <section className="card breakdown-card">
        <h2>Expected by day</h2>
        {tripDays.map((day) => {
          const planned = getDayEstimate(activities, day.day);
          const actual =
            (bookedByDay[day.day] || 0) +
            realSpends
              .filter((item) => item.day === day.day)
              .reduce((total, item) => total + moneyToTHB(item.amount, item.currency), 0);

          return (
            <div className="budget-row stacked" key={day.day}>
              <span>Day {day.day} - {day.date}<small>{day.title}</small></span>
              <strong>{formatMoney(planned, currency)}<small>actual {formatMoney(actual, currency)}</small></strong>
            </div>
          );
        })}
      </section>

      <section className="card breakdown-card">
        <h2>Expected categories</h2>
        {rows.map((row) => (
          <div className="budget-row" key={row.key}>
            <span>{row.label}</span>
            <strong>{formatMoney(row.value, currency)}</strong>
          </div>
        ))}
      </section>

      <section className="card breakdown-card">
        <h2>Booked tours</h2>
        {exactUsdItems.map((item) => (
          <div className="budget-row stacked" key={item.id}>
            <span>{item.title}<small>{formatUsd(item.costPerPersonUSD)} per pax - already counted as real used</small></span>
            <strong>{formatMoney(getPerPersonCost(item), currency)}</strong>
          </div>
        ))}
      </section>

      {realSpends.length > 0 && (
        <section className="card breakdown-card">
          <h2>Manual real spend</h2>
          {realSpends.map((item) => (
            <div className="budget-row with-action" key={item.id}>
              <span>Day {item.day} - {item.category}</span>
              <strong>{formatMoney(moneyToTHB(item.amount, item.currency), currency)}</strong>
              <button type="button" className="mini-delete" onClick={() => deleteSpend(item.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function RealUseCard({ actualTotal, budgetLeft, currency }) {
  const overBudget = Math.max(actualTotal - perPersonBudgetTHB, 0);
  const fill = Math.min(100, actualTotal / perPersonBudgetTHB * 100);

  return (
    <div className="use-panel real-use">
      <div className="use-panel-head">
        <span>Real use</span>
        <strong>{formatMoney(actualTotal, currency)}</strong>
      </div>
      <div className="real-budget-bar">
        <span className="real-budget-fill" style={{ width: fill + "%" }} />
        <span className="real-budget-left">
          {budgetLeft >= 0 ? `${formatMoney(budgetLeft, currency)} left` : "Over budget"}
        </span>
      </div>
      {overBudget > 0 && <p className="budget-warning">Over by {formatMoney(overBudget, currency)}</p>}
    </div>
  );
}

function ExpectedUseCard({ plannedTotal, currency }) {
  return (
    <div className="use-panel expected-use">
      <div className="use-panel-head">
        <span>Expected use</span>
        <strong>{formatMoney(plannedTotal, currency)}</strong>
      </div>
      <p>Planned per-person estimate from itinerary items.</p>
    </div>
  );
}
