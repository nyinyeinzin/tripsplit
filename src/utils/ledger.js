export const toCents = (value) => Math.round(Number(value) * 100);

export function equalShares(amountCents, userIds) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !userIds.length) throw new Error("Invalid equal split");
  const base = Math.floor(amountCents / userIds.length);
  const remainder = amountCents % userIds.length;
  return userIds.map((userId, index) => ({ user_id: userId, amount_owed: (base + (index < remainder ? 1 : 0)) / 100 }));
}

export function calculateBalances(members, expenses) {
  const balances = Object.fromEntries(members.map((member) => [member.user_id, 0]));
  for (const expense of expenses) {
    balances[expense.paid_by_user_id] = (balances[expense.paid_by_user_id] ?? 0) + toCents(expense.amount);
    for (const split of expense.expense_splits ?? []) balances[split.user_id] = (balances[split.user_id] ?? 0) - toCents(split.amount_owed);
  }
  return balances;
}

export function calculateSettlements(balances) {
  const creditors = Object.entries(balances).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const debtors = Object.entries(balances).filter(([, value]) => value < 0).sort((a, b) => a[1] - b[1]);
  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i][1], creditors[j][1]);
    if (amount > 0) transfers.push({ from: debtors[i][0], to: creditors[j][0], amount });
    debtors[i][1] += amount;
    creditors[j][1] -= amount;
    if (debtors[i][1] === 0) i++;
    if (creditors[j][1] === 0) j++;
  }
  return transfers;
}
