import test from "node:test";
import assert from "node:assert/strict";
import { calculateBalances, calculateSettlements, equalShares, toCents } from "../src/utils/ledger.js";

test("equal shares preserve every cent", () => {
  const shares = equalShares(1000, ["a", "b", "c"]);
  assert.deepEqual(shares.map((share) => toCents(share.amount_owed)), [334, 333, 333]);
  assert.equal(shares.reduce((sum, share) => sum + toCents(share.amount_owed), 0), 1000);
});

test("balances and settle-up reconcile multiple payers", () => {
  const members = [{ user_id: "a" }, { user_id: "b" }, { user_id: "c" }];
  const expenses = [
    { paid_by_user_id: "a", amount: "30.00", expense_splits: equalShares(3000, ["a", "b", "c"]) },
    { paid_by_user_id: "b", amount: "15.00", expense_splits: equalShares(1500, ["b", "c"]) }
  ];
  const balances = calculateBalances(members, expenses);
  assert.deepEqual(balances, { a: 2000, b: -250, c: -1750 });
  assert.deepEqual(calculateSettlements(balances), [
    { from: "c", to: "a", amount: 1750 },
    { from: "b", to: "a", amount: 250 }
  ]);
});

test("settled members need no transfer", () => {
  assert.deepEqual(calculateSettlements({ a: 0, b: 0 }), []);
});
