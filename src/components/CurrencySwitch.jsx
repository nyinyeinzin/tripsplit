const currencies = ["THB", "IDR", "USD"];

// Single shared currency toggle — previously duplicated across HomePage and
// BudgetPage with two different visual styles.
export default function CurrencySwitch({ currency, setCurrency, label = "Currency" }) {
  return (
    <div className="currency-control" role="group" aria-label={label}>
      {currencies.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setCurrency(item)}
          className={currency === item ? "active" : ""}
          aria-pressed={currency === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
