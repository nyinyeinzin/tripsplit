import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Receipt, Trash2, Wallet } from "lucide-react";
import { supabase } from "../lib/supabase";

const cents = (value) => Math.round(Number(value) * 100);
const formatMoney = (value, currency) => `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100)} ${currency}`;

function calculateSettlements(balances) {
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

export default function TripExpenses({ trip, user }) {
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stops, setStops] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(user.id);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [relatedLegId, setRelatedLegId] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [custom, setCustom] = useState({});
  const [saving, setSaving] = useState(false);
  const canEdit = role === "owner" || role === "editor";

  const load = useCallback(async () => {
    const [memberResult, expenseResult, legResult, stopResult] = await Promise.all([
      supabase.from("trip_members").select("user_id,role").eq("trip_id", trip.id),
      supabase.from("expenses").select("id,description,amount,paid_by_user_id,split_type,related_leg_id,created_at,expense_splits(user_id,amount_owed)").eq("trip_id", trip.id).order("created_at", { ascending: false }),
      supabase.from("legs").select("id,from_stop_id,to_stop_id,estimated_cost").eq("trip_id", trip.id),
      supabase.from("stops").select("id,name").eq("trip_id", trip.id)
    ]);
    const problem = [memberResult, expenseResult, legResult, stopResult].find((result) => result.error)?.error;
    if (problem) { setError(problem.message); setLoading(false); return; }
    const memberRows = memberResult.data ?? [];
    const stopRows = stopResult.data ?? [];
    setMembers(memberRows);
    setRole(memberRows.find((member) => member.user_id === user.id)?.role ?? "viewer");
    setExpenses(expenseResult.data ?? []);
    setLegs(legResult.data ?? []);
    setStops(stopRows);
    setSelectedUsers((current) => current.length ? current : memberRows.map((member) => member.user_id));
    const [profileResult, participantResult] = await Promise.all([
      memberRows.length ? supabase.from("profiles").select("id,name,email").in("id", memberRows.map((member) => member.user_id)) : Promise.resolve({ data: [] }),
      stopRows.length ? supabase.from("stop_participants").select("stop_id,user_id").in("stop_id", stopRows.map((stop) => stop.id)) : Promise.resolve({ data: [] })
    ]);
    setProfiles(profileResult.data ?? []);
    setParticipants(participantResult.data ?? []);
    setError("");
    setLoading(false);
  }, [trip.id, user.id]);

  useEffect(() => {
    load();
    const channel = supabase.channel(`expenses:${trip.id}`).on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${trip.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "expense_splits" }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trip.id, load]);

  const balances = useMemo(() => {
    const result = Object.fromEntries(members.map((member) => [member.user_id, 0]));
    for (const expense of expenses) {
      result[expense.paid_by_user_id] = (result[expense.paid_by_user_id] ?? 0) + cents(expense.amount);
      for (const split of expense.expense_splits ?? []) result[split.user_id] = (result[split.user_id] ?? 0) - cents(split.amount_owed);
    }
    return result;
  }, [members, expenses]);
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);
  const total = expenses.reduce((sum, expense) => sum + cents(expense.amount), 0);
  const label = (id) => profiles.find((profile) => profile.id === id)?.name || profiles.find((profile) => profile.id === id)?.email || (id === user.id ? "You" : "Member");

  function chooseLeg(id) {
    setRelatedLegId(id);
    if (!id) return;
    const leg = legs.find((item) => item.id === id);
    if (!leg) return;
    const from = stops.find((stop) => stop.id === leg.from_stop_id);
    const to = stops.find((stop) => stop.id === leg.to_stop_id);
    const riders = participants.filter((person) => person.stop_id === leg.to_stop_id).map((person) => person.user_id);
    setDescription(`Ride: ${from?.name || "stop"} → ${to?.name || "stop"}`);
    setSelectedUsers(riders);
    setAmount(String(Math.round(Number(leg.estimated_cost) * Math.ceil(riders.length / trip.default_vehicle_capacity) * 100) / 100));
    setSplitType("equal");
  }

  function resetForm() {
    setShowForm(false); setDescription(""); setAmount(""); setPayer(user.id); setRelatedLegId(""); setSplitType("equal"); setCustom({});
    setSelectedUsers(members.map((member) => member.user_id));
  }

  async function saveExpense(event) {
    event.preventDefault();
    const amountCents = cents(amount);
    if (!description.trim() || !Number.isSafeInteger(amountCents) || amountCents <= 0) return setError("Enter a description and an amount greater than zero.");
    if (!members.some((member) => member.user_id === payer)) return setError("Choose a trip member who paid.");
    if (!selectedUsers.length) return setError("Choose at least one person to split this expense.");
    let shares;
    if (splitType === "custom") {
      shares = selectedUsers.map((id) => ({ user_id: id, amount_owed: cents(custom[id] || 0) / 100 }));
      if (shares.some((share) => !Number.isSafeInteger(cents(share.amount_owed)) || share.amount_owed < 0) || shares.reduce((sum, share) => sum + cents(share.amount_owed), 0) !== amountCents) return setError("Custom shares must add up exactly to the expense amount.");
    } else {
      const base = Math.floor(amountCents / selectedUsers.length), remainder = amountCents % selectedUsers.length;
      shares = selectedUsers.map((id, index) => ({ user_id: id, amount_owed: (base + (index < remainder ? 1 : 0)) / 100 }));
    }
    setSaving(true); setError("");
    const { data, error: insertError } = await supabase.from("expenses").insert({ trip_id: trip.id, description: description.trim(), amount: amountCents / 100, paid_by_user_id: payer, split_type: splitType, related_leg_id: relatedLegId || null }).select("id").single();
    if (insertError) { setSaving(false); return setError(insertError.message); }
    const { error: splitError } = await supabase.from("expense_splits").insert(shares.map((share) => ({ ...share, expense_id: data.id })));
    setSaving(false);
    if (splitError) {
      await supabase.from("expenses").delete().eq("id", data.id);
      return setError(`Could not save the split: ${splitError.message}`);
    }
    resetForm();
    await load();
  }

  async function deleteExpense(expense) {
    if (!window.confirm(`Delete “${expense.description}”?`)) return;
    const { error: deleteError } = await supabase.from("expenses").delete().eq("id", expense.id).eq("trip_id", trip.id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  return <section className="trip-expenses"><div className="trip-stops-heading"><div><p className="trips-overline">Trip money</p><h2>Shared ledger</h2></div>{canEdit && !showForm && <button className="trip-new-button" type="button" onClick={() => setShowForm(true)}>+ Add expense</button>}</div>
    <div className="trip-ledger-total"><Wallet size={24} /><div><small>Total recorded spending</small><strong>{formatMoney(total, trip.currency)}</strong></div></div>
    <p className="trip-ledger-note">Transport estimates become debts only when you record who paid for the ride.</p>
    {error && <p className="trip-form-error" role="alert">{error}</p>}
    {showForm && <form className="trip-create-form trip-expense-form" onSubmit={saveExpense}><h3>Record an expense</h3><label><span>Transport leg <small>optional</small></span><select value={relatedLegId} onChange={(event) => chooseLeg(event.target.value)}><option value="">Other expense</option>{legs.filter((leg) => leg.estimated_cost != null).map((leg) => <option key={leg.id} value={leg.id}>{stops.find((stop) => stop.id === leg.from_stop_id)?.name} → {stops.find((stop) => stop.id === leg.to_stop_id)?.name}</option>)}</select></label>
      <label><span>Description</span><input required maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Hotel, meal, tickets…" /></label><div className="trip-form-pair"><label><span>Amount ({trip.currency})</span><input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label><span>Paid by</span><select value={payer} onChange={(event) => setPayer(event.target.value)}>{members.map((member) => <option key={member.user_id} value={member.user_id}>{label(member.user_id)}</option>)}</select></label></div>
      <fieldset><legend>Split between</legend><div className="trip-member-checks">{members.map((member) => <label key={member.user_id}><input type="checkbox" checked={selectedUsers.includes(member.user_id)} onChange={(event) => setSelectedUsers((current) => event.target.checked ? [...current, member.user_id] : current.filter((id) => id !== member.user_id))} /> {label(member.user_id)}</label>)}</div></fieldset>
      <label><span>Split method</span><select value={splitType} onChange={(event) => setSplitType(event.target.value)}><option value="equal">Equally</option><option value="custom">Custom amounts</option></select></label>
      {splitType === "custom" && <div className="trip-custom-splits">{selectedUsers.map((id) => <label key={id}><span>{label(id)} owes ({trip.currency})</span><input type="number" min="0" step="0.01" value={custom[id] ?? ""} onChange={(event) => setCustom({ ...custom, [id]: event.target.value })} /></label>)}</div>}
      <div className="trip-stop-actions"><button className="trip-create-submit" type="submit" disabled={saving}>{saving ? "Saving…" : "Save expense"}</button><button type="button" onClick={resetForm}>Cancel</button></div></form>}
    {loading ? <p className="trips-status">Loading ledger…</p> : <><div className="trip-balance-list">{members.map((member) => { const balance = balances[member.user_id] ?? 0; return <div key={member.user_id}><span>{label(member.user_id)}</span><strong className={balance < 0 ? "owes" : "owed"}>{balance < 0 ? `Owes ${formatMoney(-balance, trip.currency)}` : balance > 0 ? `Gets back ${formatMoney(balance, trip.currency)}` : "Settled"}</strong></div>; })}</div>
      {settlements.length > 0 && <div className="trip-settle"><h3>Settle up</h3>{settlements.map((transfer) => <p key={`${transfer.from}:${transfer.to}`}><span>{label(transfer.from)}</span><ArrowRight size={16} /><span>{label(transfer.to)}</span><strong>{formatMoney(transfer.amount, trip.currency)}</strong></p>)}</div>}
      <h3 className="trip-expense-history-title">Expenses</h3>{expenses.length === 0 ? <p className="trips-status">No expenses recorded yet.</p> : <div className="trip-expense-list">{expenses.map((expense) => <article key={expense.id}><span><Receipt size={18} /></span><div><strong>{expense.description}</strong><small>Paid by {label(expense.paid_by_user_id)} · split {expense.split_type} among {expense.expense_splits?.length ?? 0}</small></div><b>{formatMoney(cents(expense.amount), trip.currency)}</b>{canEdit && <button type="button" aria-label={`Delete ${expense.description}`} onClick={() => deleteExpense(expense)}><Trash2 size={17} /></button>}</article>)}</div>}</>}
  </section>;
}
