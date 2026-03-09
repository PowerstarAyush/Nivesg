"use client";
import { useState, useEffect } from "react";

const SEED_DATA = [
  { id: 1, name: "Ramesh Kumar Patel", district: "Jabalpur", crop: "Soybean", land: 5, loan: 175000, trust: 82, risk: "Low", status: "Pending" },
  { id: 2, name: "Sunita Devi", district: "Indore", crop: "Wheat", land: 3.2, loan: 98000, trust: 67, risk: "Medium", status: "Pending" },
  { id: 3, name: "Mohan Singh Rajput", district: "Bhopal", crop: "Tur Dal", land: 7, loan: 245000, trust: 91, risk: "Low", status: "Approved" },
  { id: 4, name: "Geeta Bai", district: "Sagar", crop: "Cotton", land: 4, loan: 156000, trust: 44, risk: "High", status: "Pending" },
  { id: 5, name: "Raju Vishwakarma", district: "Gwalior", crop: "Maize", land: 2.5, loan: 82000, trust: 78, risk: "Low", status: "Pending" },
  { id: 6, name: "Kamlesh Yadav", district: "Ujjain", crop: "Onion", land: 1.8, loan: 55000, trust: 59, risk: "Medium", status: "Rejected" },
  { id: 7, name: "Pushpa Tiwari", district: "Hoshangabad", crop: "Wheat", land: 6, loan: 212000, trust: 88, risk: "Low", status: "Approved" },
  { id: 8, name: "Dinesh Prajapati", district: "Chhindwara", crop: "Soybean", land: 3.5, loan: 128000, trust: 52, risk: "Medium", status: "Pending" },
];

export default function AdminDashboard() {
  const [farmers, setFarmers] = useState(SEED_DATA);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (id) => {
    setLoading((prev) => ({ ...prev, [id]: "approving" }));
    await new Promise((r) => setTimeout(r, 900));
    setFarmers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "Approved" } : f))
    );
    setLoading((prev) => ({ ...prev, [id]: null }));
    showToast("✅ Loan approved kar diya gaya!");
  };

  const handleReject = async (id) => {
    setLoading((prev) => ({ ...prev, [id]: "rejecting" }));
    await new Promise((r) => setTimeout(r, 700));
    setFarmers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "Rejected" } : f))
    );
    setLoading((prev) => ({ ...prev, [id]: null }));
    showToast("Loan reject kar diya gaya.", "error");
  };

  const filtered = farmers.filter((f) => {
    const matchFilter = filter === "All" || f.status === filter;
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.district.toLowerCase().includes(search.toLowerCase()) ||
      f.crop.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const metrics = {
    total: farmers.length,
    disbursed: farmers.filter((f) => f.status === "Approved").reduce((sum, f) => sum + f.loan, 0),
    pending: farmers.filter((f) => f.status === "Pending").length,
    avgTrust: Math.round(farmers.reduce((sum, f) => sum + f.trust, 0) / farmers.length),
  };

  const getRiskBadge = (risk) => {
    if (risk === "Low") return "bg-emerald-100 text-emerald-700";
    if (risk === "Medium") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const getStatusBadge = (status) => {
    if (status === "Approved") return "bg-emerald-100 text-emerald-700";
    if (status === "Rejected") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all duration-300 ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-slate-600 hover:text-emerald-700 text-sm font-medium">
                ← NIVESH Home
              </a>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <span className="font-bold text-slate-900 text-lg">Adhikari Dashboard</span>
                <span className="text-xs text-slate-500 ml-2">Bank & Government Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:block">
                Last sync: {new Date().toLocaleTimeString("en-IN")}
              </span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                AO
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon="👨‍🌾"
            label="Total Farmers"
            value={metrics.total}
            sub="Registered on platform"
            color="slate"
          />
          <MetricCard
            icon="💰"
            label="Funds Disbursed"
            value={`₹${(metrics.disbursed / 100000).toFixed(1)}L`}
            sub="Approved loans total"
            color="emerald"
          />
          <MetricCard
            icon="⏳"
            label="Pending Approvals"
            value={metrics.pending}
            sub="Awaiting review"
            color="amber"
          />
          <MetricCard
            icon="🤖"
            label="Avg AI Trust Score"
            value={`${metrics.avgTrust}/100`}
            sub="Gemini AI assessment"
            color="blue"
          />
        </div>

        {/* Trust Score Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Trust Score Distribution</h3>
          <div className="flex items-end gap-2 h-20">
            {farmers.map((f) => (
              <div key={f.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${
                    f.trust >= 75 ? "bg-emerald-500" : f.trust >= 50 ? "bg-amber-400" : "bg-red-500"
                  }`}
                  style={{ height: `${f.trust}%` }}
                />
                <span className="text-xs text-slate-500 hidden sm:block" style={{ fontSize: "9px" }}>
                  {f.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> High Trust (≥75)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /> Medium (50–74)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-sm" /> Low Risk (&lt;50)</span>
          </div>
        </div>

        {/* Table Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-bold text-slate-800 text-lg">Kisan Loan Applications</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Naam, jila ya fasal dhundein..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52"
              />
              {["All", "Pending", "Approved", "Rejected"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f}
                  {f !== "All" && (
                    <span className="ml-1 text-xs opacity-75">
                      ({farmers.filter((x) => x.status === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Kisan Ka Naam", "Jila", "Fasal", "Zameen", "Loan Required", "AI Trust Score", "Risk", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((farmer) => (
                  <tr
                    key={farmer.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected === farmer.id ? "bg-blue-50" : ""}`}
                    onClick={() => setSelected(selected === farmer.id ? null : farmer.id)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {farmer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <span className="font-semibold text-sm text-slate-800">{farmer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{farmer.district}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{farmer.crop}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{farmer.land} Ha</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">
                      ₹{farmer.loan.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 w-16">
                          <div
                            className={`h-2 rounded-full ${
                              farmer.trust >= 75 ? "bg-emerald-500" : farmer.trust >= 50 ? "bg-amber-400" : "bg-red-500"
                            }`}
                            style={{ width: `${farmer.trust}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${
                          farmer.trust >= 75 ? "text-emerald-600" : farmer.trust >= 50 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {farmer.trust}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRiskBadge(farmer.risk)}`}>
                        {farmer.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadge(farmer.status)}`}>
                        {farmer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {farmer.status === "Pending" ? (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleApprove(farmer.id)}
                            disabled={!!loading[farmer.id]}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-60 flex items-center gap-1"
                          >
                            {loading[farmer.id] === "approving" ? (
                              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : "✓"} Approve
                          </button>
                          <button
                            onClick={() => handleReject(farmer.id)}
                            disabled={!!loading[farmer.id]}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">🔍</div>
                <p>Koi application nahi mili.</p>
              </div>
            )}
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>{filtered.length} of {farmers.length} applications dikha raha hai</span>
            <span>AI Powered by Google Gemini · NIVESH Platform</span>
          </div>
        </div>

        {/* Expanded Detail Row */}
        {selected && (() => {
          const f = farmers.find((x) => x.id === selected);
          if (!f) return null;
          return (
            <div className="mt-4 bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">📋 AI Vishleshan Report — {f.name}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center border">
                  <div className="text-xs text-slate-500">District</div>
                  <div className="font-bold text-slate-800">{f.district}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border">
                  <div className="text-xs text-slate-500">Crop / Land</div>
                  <div className="font-bold text-slate-800">{f.crop} · {f.land} Ha</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
                  <div className="text-xs text-slate-500">Loan Amount</div>
                  <div className="font-bold text-emerald-700">₹{f.loan.toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                  <div className="text-xs text-slate-500">AI Trust Score</div>
                  <div className={`font-bold text-xl ${f.trust >= 75 ? "text-emerald-600" : f.trust >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {f.trust}/100
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border text-sm text-slate-600">
                <span className="font-semibold text-slate-800">AI Recommendation: </span>
                {f.trust >= 75
                  ? `${f.name} ka profile strong hai. Low risk ke saath ₹${f.loan.toLocaleString("en-IN")} ka loan approve karna recommended hai. PM-KISAN aur KCC eligibility confirmed.`
                  : f.trust >= 50
                  ? `${f.name} ka profile moderate hai. Partial disbursement (70%) ya guarantor ke saath approval possible hai. Further verification required.`
                  : `${f.name} ka profile high risk dikh raha hai. Additional documents aur field verification ke baad hi approval karein.`}
              </div>
            </div>
          );
        })()}

        {/* Bottom Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {[
            { label: "Approval Rate", value: `${Math.round((farmers.filter(f => f.status === "Approved").length / farmers.length) * 100)}%`, color: "emerald", icon: "✅" },
            { label: "Total Applications", value: farmers.length, color: "blue", icon: "📋" },
            { label: "Funds Pending", value: `₹${(farmers.filter(f => f.status === "Pending").reduce((s, f) => s + f.loan, 0) / 100000).toFixed(1)}L`, color: "amber", icon: "⏳" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl border p-4 shadow-sm flex items-center gap-4`}>
              <div className="text-3xl">{s.icon}</div>
              <div>
                <div className="text-2xl font-black text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, color }) {
  const bg = {
    slate: "bg-white border-slate-200",
    emerald: "bg-emerald-50 border-emerald-200",
    amber: "bg-amber-50 border-amber-200",
    blue: "bg-blue-50 border-blue-200",
  };
  const text = {
    slate: "text-slate-800",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${bg[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-black ${text[color]}`}>{value}</div>
      <div className="text-sm font-semibold text-slate-700 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
              }
                  
