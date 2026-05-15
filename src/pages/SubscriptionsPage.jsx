import { useEffect, useMemo, useState } from "react";
import Header from "../components/common/Header";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import { supabase } from "../lib/supabase";

const tabs = [
  { value: "active", label: "Active" },
  { value: "owing", label: "Owing" },
  { value: "overdue", label: "Overdue" },
  { value: "downgraded", label: "Downgraded" },
  { value: "suspended", label: "Suspended" },
];

const money = (value, currency = "XAF") =>
  `${Number(value || 0).toLocaleString()} ${currency || ""}`.trim();

const planRoleLabel = (targetRole) => {
  if (targetRole === "library_user") return "Library only";
  if (targetRole === "student") return "Courses + library";
  return targetRole || "-";
};

const toCsv = (rows) => {
  const escape = (v) => {
    const s = (v ?? "").toString();
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = [
    "email",
    "name",
    "plan",
    "status",
    "access_state",
    "total_due",
    "total_paid",
    "amount_owing",
    "overdue_amount",
    "overdue_installments",
    "next_due_at",
  ];
  const lines = rows.map((r) =>
    [
      r.email,
      `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      r.plan_name,
      r.subscription_status,
      r.access_state,
      r.total_due,
      r.total_paid,
      r.amount_owing,
      r.overdue_amount,
      r.overdue_installments,
      r.next_due_at,
    ]
      .map(escape)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
};

const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const SubscriptionsPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [rows, setRows] = useState([]);
  const [installmentsBySubscription, setInstallmentsBySubscription] = useState({});
  const [plans, setPlans] = useState([]);
  const [planInstallments, setPlanInstallments] = useState([]);
  const [tab, setTab] = useState("owing");
  const [editingPlanId, setEditingPlanId] = useState("");
  const [draftInstallment, setDraftInstallment] = useState({
    installment_number: 1,
    label: "",
    amount: "",
    due_after_days: 0,
  });
  const [planEdits, setPlanEdits] = useState({});
  const [savingPlanId, setSavingPlanId] = useState("");

  const load = async () => {
    const [receivables, userInstallments, planRows, planInstRows] =
      await runWithLoader(() =>
        Promise.all([
          supabase
            .from("v_subscription_receivables")
            .select("*")
            .order("next_due_at", { ascending: true, nullsFirst: false }),
          supabase
            .from("user_subscription_installments")
            .select("*")
            .order("installment_number", { ascending: true }),
          supabase
            .from("subscription_plans")
            .select("id,code,name,target_role,duration_months,price_amount,currency,active")
            .order("price_amount", { ascending: true }),
          supabase
            .from("subscription_plan_installments")
            .select("*")
            .order("installment_number", { ascending: true }),
        ])
      );

    if (receivables.error) throw new Error(receivables.error.message);
    if (userInstallments.error) throw new Error(userInstallments.error.message);
    if (planRows.error) throw new Error(planRows.error.message);
    if (planInstRows.error) throw new Error(planInstRows.error.message);

    setRows(receivables.data || []);
    const loadedPlans = planRows.data || [];
    setPlans(loadedPlans);
    setPlanEdits(
      loadedPlans.reduce((acc, p) => {
        acc[p.id] = {
          name: p.name || "",
          price_amount: String(p.price_amount ?? ""),
          duration_months: String(p.duration_months ?? ""),
          active: p.active !== false,
        };
        return acc;
      }, {})
    );
    setPlanInstallments(planInstRows.data || []);
    setInstallmentsBySubscription(
      (userInstallments.data || []).reduce((acc, item) => {
        acc[item.subscription_id] = acc[item.subscription_id] || [];
        acc[item.subscription_id].push(item);
        return acc;
      }, {})
    );
    if (!editingPlanId && planRows.data?.[0]?.id) setEditingPlanId(planRows.data[0].id);
  };

  useEffect(() => {
    load().catch((e) => console.error("Load subscriptions failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === "active") return r.subscription_status === "active";
      if (tab === "owing") return Number(r.amount_owing || 0) > 0;
      if (tab === "overdue") return Number(r.overdue_installments || 0) > 0;
      if (tab === "downgraded") return r.access_state === "downgraded";
      if (tab === "suspended") return r.access_state === "suspended";
      return true;
    });
  }, [rows, tab]);

  const setAccessState = async (subscriptionId, accessState) => {
    const note = window.prompt(
      `Optional note for setting access to "${accessState}"`,
      ""
    );
    const { error } = await supabase.rpc("set_subscription_access_state", {
      p_subscription_id: subscriptionId,
      p_access_state: accessState,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);
    await load();
  };

  const recordManualPayment = async (row) => {
    const raw = window.prompt("Amount paid", row.amount_owing || "");
    if (!raw) return;
    const amount = Math.round(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const { error } = await supabase.rpc("record_subscription_installment_payment", {
      p_user_id: row.user_id,
      p_plan_id: row.plan_id,
      p_payment_tx_id: null,
      p_amount: amount,
      p_currency: row.currency || "XAF",
      p_installment_id: null,
      p_installment_number: null,
    });
    if (error) throw new Error(error.message);
    await load();
  };

  const updatePlanEdit = (planId, field, value) => {
    setPlanEdits((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], [field]: value },
    }));
  };

  const savePlan = async (plan) => {
    const edit = planEdits[plan.id];
    if (!edit) return;
    const price = Math.round(Number(edit.price_amount));
    const duration = Math.round(Number(edit.duration_months));
    if (!edit.name?.trim() || !Number.isFinite(price) || price <= 0) {
      window.alert("Enter a valid plan name and price.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      window.alert("Duration must be at least 1 month.");
      return;
    }
    setSavingPlanId(plan.id);
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: edit.name.trim(),
          price_amount: price,
          duration_months: duration,
          active: !!edit.active,
        })
        .eq("id", plan.id);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      console.error("Save plan failed", e);
      window.alert(e.message || "Failed to save plan");
    } finally {
      setSavingPlanId("");
    }
  };

  const savePlanInstallment = async () => {
    if (!editingPlanId) return;
    const payload = {
      plan_id: editingPlanId,
      installment_number: Number(draftInstallment.installment_number),
      label: draftInstallment.label || null,
      amount: Math.round(Number(draftInstallment.amount)),
      due_after_days: Number(draftInstallment.due_after_days || 0),
      active: true,
    };
    if (!payload.installment_number || !payload.amount) return;
    const { error } = await supabase
      .from("subscription_plan_installments")
      .upsert(payload, { onConflict: "plan_id,installment_number" });
    if (error) throw new Error(error.message);
    setDraftInstallment({
      installment_number: payload.installment_number + 1,
      label: "",
      amount: "",
      due_after_days: 0,
    });
    await load();
  };

  const disablePlanInstallment = async (id) => {
    const { error } = await supabase
      .from("subscription_plan_installments")
      .update({ active: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await load();
  };

  const selectedPlanInstallments = planInstallments.filter(
    (item) => item.plan_id === editingPlanId && item.active
  );

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Subscriptions" />

      <div className="p-6 space-y-6">
        <section className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl border border-gray-700 p-5">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setTab(item.value)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    tab === item.value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-900 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => load()}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm"
              >
                Refresh
              </button>
              <button
                onClick={() =>
                  downloadText(
                    `subscription_receivables_${tab}_${new Date()
                      .toISOString()
                      .slice(0, 10)}.csv`,
                    toCsv(filtered)
                  )
                }
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-300 border-b border-gray-700">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Access</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3">Paid</th>
                  <th className="py-2 pr-3">Owing</th>
                  <th className="py-2 pr-3">Next due</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.subscription_id} className="border-b border-gray-800 align-top">
                    <td className="py-3 pr-3">
                      <div className="text-gray-100">{r.email || "-"}</div>
                      <div className="text-xs text-gray-400">
                        {(r.first_name || "")} {(r.last_name || "")}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{r.plan_name}</div>
                      <div className="text-xs text-gray-400">{r.plan_code}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-gray-900 px-2 py-1 text-xs">
                        {r.access_state}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {r.subscription_status}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{money(r.total_due, r.currency)}</td>
                    <td className="py-3 pr-3">{money(r.total_paid, r.currency)}</td>
                    <td className="py-3 pr-3">
                      <div className="text-amber-300">
                        {money(r.amount_owing, r.currency)}
                      </div>
                      {Number(r.overdue_installments || 0) > 0 && (
                        <div className="text-xs text-red-300">
                          {r.overdue_installments} overdue
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3">{r.next_due_at || "-"}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setAccessState(r.subscription_id, "downgraded")}
                          className="px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-xs"
                        >
                          Downgrade
                        </button>
                        <button
                          onClick={() => setAccessState(r.subscription_id, "full")}
                          className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => setAccessState(r.subscription_id, "suspended")}
                          className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-xs"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => recordManualPayment(r)}
                          className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs"
                        >
                          Record payment
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-400 space-y-1">
                        {(installmentsBySubscription[r.subscription_id] || []).map((i) => (
                          <div key={i.id}>
                            #{i.installment_number} {money(i.amount_paid, i.currency)}
                            /{money(i.amount_due, i.currency)} - {i.status}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-gray-400" colSpan={8}>
                      No matching subscriptions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl border border-gray-700 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Subscription plan prices</h2>
            <p className="mt-1 text-sm text-gray-400">
              Amounts shown in the mobile app when users subscribe. If installments exist, the
              first installment is charged at checkout; otherwise the full price is used.
            </p>
          </div>
          <div className="mt-5 overflow-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/80">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Display name</th>
                  <th className="px-4 py-3">Price (XAF)</th>
                  <th className="px-4 py-3">Duration (months)</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {plans.map((p) => {
                  const edit = planEdits[p.id] || {};
                  return (
                    <tr key={p.id} className="text-gray-100 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.code}</div>
                        <div className="text-xs text-gray-400">{p.currency || "XAF"}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{planRoleLabel(p.target_role)}</td>
                      <td className="px-4 py-3">
                        <input
                          className={planInputClass}
                          value={edit.name ?? ""}
                          onChange={(e) => updatePlanEdit(p.id, "name", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={planInputClass}
                          type="number"
                          min="1"
                          value={edit.price_amount ?? ""}
                          onChange={(e) => updatePlanEdit(p.id, "price_amount", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={planInputClass}
                          type="number"
                          min="1"
                          value={edit.duration_months ?? ""}
                          onChange={(e) => updatePlanEdit(p.id, "duration_months", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={edit.active !== false}
                            onChange={(e) => updatePlanEdit(p.id, "active", e.target.checked)}
                            className="rounded border-gray-600 bg-gray-900"
                          />
                          Visible in app
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={savingPlanId === p.id}
                          onClick={() => savePlan(p)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {savingPlanId === p.id ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {plans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No subscription plans found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl border border-gray-700 p-5">
          <div className="flex flex-col gap-4 border-b border-gray-700 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Plan Installment Schedules</h2>
              <p className="mt-1 text-sm text-gray-400">
                Set how each trimester plan is split into installments.
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                Plan
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                value={editingPlanId}
                onChange={(e) => setEditingPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({money(p.price_amount, p.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Changes apply to new subscriptions. Existing rows are kept for records.
          </p>
          <div className="mt-5 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
            <h3 className="text-sm font-medium text-gray-200">Add installment</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PlanField label="Number">
                <input className={planInputClass} type="number" min="1" value={draftInstallment.installment_number} onChange={(e) => setDraftInstallment((v) => ({ ...v, installment_number: e.target.value }))} />
              </PlanField>
              <PlanField label="Label">
                <input className={planInputClass} value={draftInstallment.label} onChange={(e) => setDraftInstallment((v) => ({ ...v, label: e.target.value }))} placeholder="e.g. First payment" />
              </PlanField>
              <PlanField label="Amount">
                <input className={planInputClass} type="number" min="1" value={draftInstallment.amount} onChange={(e) => setDraftInstallment((v) => ({ ...v, amount: e.target.value }))} placeholder="XAF" />
              </PlanField>
              <PlanField label="Due after (days)">
                <input className={planInputClass} type="number" min="0" value={draftInstallment.due_after_days} onChange={(e) => setDraftInstallment((v) => ({ ...v, due_after_days: e.target.value }))} />
              </PlanField>
            </div>
            <button type="button" onClick={savePlanInstallment} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Add installment</button>
          </div>
          <div className="mt-5 overflow-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/80">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due after</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {selectedPlanInstallments.map((i) => (
                  <tr key={i.id} className="text-gray-100">
                    <td className="px-4 py-3 font-medium">{i.installment_number}</td>
                    <td className="px-4 py-3">{i.label || "-"}</td>
                    <td className="px-4 py-3">{money(i.amount)}</td>
                    <td className="px-4 py-3">{i.due_after_days} days</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => disablePlanInstallment(i.id)} className="rounded-md bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600">Remove</button>
                    </td>
                  </tr>
                ))}
                {selectedPlanInstallments.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={5}>No installments for this plan yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

const planInputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100";

const PlanField = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
    {children}
  </div>
);

export default SubscriptionsPage;
