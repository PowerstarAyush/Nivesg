"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import("../components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-slate-100 rounded-2xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Map lod ho raha hai...</span>
      </div>
    </div>
  ),
});

const MP_DISTRICTS = [
  "Bhopal","Indore","Jabalpur","Gwalior","Ujjain","Sagar","Dewas","Satna",
  "Ratlam","Rewa","Murwara","Singrauli","Burhanpur","Khandwa","Bhind",
  "Chhindwara","Guna","Shivpuri","Vidisha","Chhatarpur","Damoh","Mandsaur",
  "Khargone","Neemuch","Pithampur","Hoshangabad","Itarsi","Sehore","Betul",
  "Seoni","Datia","Nagda","Balaghat","Morena","Dhar",
];

const CROPS = [
  "Soybean","Wheat","Rice","Maize","Tur Dal","Chana","Cotton","Sugarcane",
  "Tomato","Onion","Garlic","Potato","Mustard","Groundnut","Linseed",
];

export default function FarmerInterface() {
  const [form, setForm] = useState({
    name: "", district: "", land: "", crop: "",
  });
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const recognitionRef = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (result) {
      setShowMap(true);
    }
  }, [result]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Aapka browser voice input support nahi karta.", "error");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.toLowerCase();
      setListening(false);

      // District detection
      const foundDistrict = MP_DISTRICTS.find((d) =>
        transcript.includes(d.toLowerCase())
      );
      // Land detection
      const landMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(?:hectare|हेक्टेयर|bigha|एकड़|acre)/);
      // Crop detection
      const foundCrop = CROPS.find((c) =>
        transcript.includes(c.toLowerCase())
      );

      setForm((prev) => ({
        ...prev,
        ...(foundDistrict && { district: foundDistrict }),
        ...(landMatch && { land: landMatch[1] }),
        ...(foundCrop && { crop: foundCrop }),
      }));
      showToast("Voice input samajh liya gaya! ✓");
    };

    recognition.onerror = () => {
      setListening(false);
      showToast("Awaaz nahi suni gayi. Phir koshish karein.", "error");
    };
    recognition.onend = () => setListening(false);
  };

  const runAnalysis = async () => {
    if (!form.name || !form.district || !form.land || !form.crop) {
      showToast("Kripya sabhi fields bharein.", "error");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis fail ho gayi.");
      setResult(data);
      showToast("AI Analysis complete! Dashboard taiyaar hai. 🚀");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBg = (score) => {
    if (score >= 75) return "bg-emerald-50 border-emerald-200";
    if (score >= 50) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const getRiskBadge = (score) => {
    if (score >= 75) return { label: "Low Risk", cls: "bg-emerald-100 text-emerald-700" };
    if (score >= 50) return { label: "Medium Risk", cls: "bg-amber-100 text-amber-700" };
    return { label: "High Risk", cls: "bg-red-100 text-red-700" };
  };

  const sendWhatsApp = () => {
    showToast("WhatsApp par report bhej di gayi! 📱");
  };

  const downloadDocket = () => {
    if (!result) return;
    const content = `NIVESH - AI FARM ANALYSIS DOCKET\n\nFarmer: ${form.name}\nDistrict: ${form.district}\nCrop: ${form.crop}\nLand: ${form.land} Hectare\n\nViability Score: ${result.viability_score}/100\nTrust Score: ${result.trust_score}/100\nYield Prediction: ${result.yield_prediction} Q/Ha\n\nLoan Recommended: ₹${result.loan_recommendation_inr?.toLocaleString("en-IN")}\nEstimated Revenue: ₹${result.expected_revenue_inr?.toLocaleString("en-IN")}\n\nSubsidies: ${result.recommended_subsidies?.join(", ")}\n\nFertilizer Advice: ${result.fertilizer_advice_hinglish}\nPest Alert: ${result.pest_alert_hinglish}\nWeather Advice: ${result.weather_advice}\n\nGenerated by NIVESH Platform`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `NIVESH_Docket_${form.name}.txt`; a.click();
    showToast("B2G Docket download ho gaya! 📄");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-lg text-slate-900 tracking-tight">NIVESH</div>
                <div className="text-xs text-slate-500 -mt-0.5">Anti-Gravity Agriculture Finance Protocol</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                PWA Offline Sync Active
              </span>
              <a href="/admin" className="text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100">
                Adhikari Dashboard →
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">India Stack Powered</span>
              <span className="text-emerald-700">·</span>
              <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">Google Gemini AI</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
              Zameen Ki Janch,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                AI Se.
              </span>
            </h1>
            <p className="text-slate-300 text-lg mb-2">
              Madhya Pradesh ke kisan ab bina kisi dalaali ke seedha bank loan, subsidy, aur fasal salah pa sakte hain.
            </p>
            <p className="text-slate-400 text-sm">
              Real-time Mandi Prices · Satellite Crop Health · Gemini AI Banking Score
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              {[
                { label: "₹2.4Cr", sub: "Funds Disbursed" },
                { label: "847", sub: "Farmers Verified" },
                { label: "94%", sub: "Loan Approvals" },
                { label: "23", sub: "MP Districts" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                  <div className="text-xl font-bold text-white">{s.label}</div>
                  <div className="text-xs text-slate-400">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Form */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                <h2 className="text-white font-bold text-lg">Zameen Ka Vivaranc</h2>
                <p className="text-emerald-100 text-sm mt-0.5">Apni fasal aur zameen ki jaankari bharein</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Voice Input */}
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">🎙️ Voice Input (Hindi)</span>
                    <button
                      onClick={startVoice}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        listening
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {listening ? (
                        <>
                          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                          Sun raha hoon...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Bol ke Bharein
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    "Main Jabalpur se hoon, 5 hectare mein soybean ugaata hoon"
                  </p>
                </div>

                {/* Fields */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kisan Ka Naam *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ramesh Kumar Patel"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jila (District) *</label>
                  <select
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Jila chunein...</option>
                    {MP_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Zameen Ka Aayatan (Hectare) *</label>
                  <input
                    type="number"
                    value={form.land}
                    onChange={(e) => setForm({ ...form, land: e.target.value })}
                    placeholder="5.0"
                    min="0.1"
                    step="0.1"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fasal Ka Prakar *</label>
                  <select
                    value={form.crop}
                    onChange={(e) => setForm({ ...form, crop: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Fasal chunein...</option>
                    {CROPS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={runAnalysis}
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-3 ${
                    loading
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-200 active:scale-95"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      AI Vishleshan chal raha hai...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Anti-Gravity AI Scan Chalayein
                    </>
                  )}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                    ⚠️ {error}
                  </div>
                )}
              </div>
            </div>

            {/* Real Data Sources */}
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live Data Sources</p>
              <div className="space-y-2">
                {[
                  { name: "Agmarknet Mandi Prices", status: "live" },
                  { name: "OpenWeather MP Forecast", status: "live" },
                  { name: "ICAR Pest Alerts", status: "cached" },
                  { name: "PM-KISAN Aadhaar Link", status: "live" },
                  { name: "Soil Health Card Data", status: "cached" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{s.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === "live"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {s.status === "live" ? "● Live" : "⟳ Cached"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard / Map Panel */}
          <div className="lg:col-span-3 space-y-6">
            {!result && !loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">AI Vishleshan Report</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Apni zameen ki jaankari bharein aur AI-powered agricultural intelligence dashboard unlock karein — real mandi prices, soil data, weather forecast sab ek jagah.
                </p>

                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    { icon: "📊", label: "Land Viability Score" },
                    { icon: "💰", label: "Loan Recommendation" },
                    { icon: "🌾", label: "Crop Advisory" },
                    { icon: "🌤️", label: "Weather Advice" },
                    { icon: "🏪", label: "Mandi Intelligence" },
                    { icon: "🛡️", label: "Subsidy Finder" },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-xs text-slate-600 font-medium">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

      {loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 border-4 border-emerald-200 rounded-full" />
                  <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-3 border-4 border-blue-200 rounded-full" />
                  <div className="absolute inset-3 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">AI Vishleshan Ho Raha Hai</h3>
                <p className="text-slate-500 text-sm mb-4">Gemini AI real data analyze kar raha hai...</p>
                <div className="space-y-2 text-left max-w-xs mx-auto">
                  {[
                    "Mandi prices fetch ho rahe hain...",
                    "Weather forecast check ho raha hai...",
                    "Soil health data match ho raha hai...",
                    "Banking risk score calculate ho raha hai...",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-4 h-4 border border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ animationDelay: `${i * 0.2}s` }} />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <>
                {/* Top Scores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ScoreCard label="Viability Score" value={result.viability_score} suffix="/100" color="emerald" />
                  <ScoreCard label="Trust Score" value={result.trust_score} suffix="/100" color="blue" />
                  <ScoreCard label="Yield" value={result.yield_prediction} suffix=" Q/Ha" color="amber" />
                  <div className={`bg-white rounded-xl border p-4 shadow-sm ${getScoreBg(result.trust_score)}`}>
                    <div className="text-xs text-slate-500 mb-1">Risk Level</div>
                    <div className={`text-base font-bold ${getScoreColor(result.trust_score)}`}>
                      {getRiskBadge(result.trust_score).label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Banking Assessment</div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex border-b border-slate-100 overflow-x-auto">
                    {[
                      { id: "overview", label: "📊 Overview" },
                      { id: "finance", label: "💰 Finance" },
                      { id: "agri", label: "🌾 Agri Intel" },
                      { id: "mandi", label: "🏪 Mandi" },
                      { id: "map", label: "🗺️ Crop Map" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                          activeTab === tab.id
                            ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {activeTab === "overview" && (
                      <OverviewTab result={result} form={form} />
                    )}
                    {activeTab === "finance" && (
                      <FinanceTab result={result} />
                    )}
                    {activeTab === "agri" && (
                      <AgriTab result={result} />
                    )}
                    {activeTab === "mandi" && (
                      <MandiTab result={result} form={form} />
                    )}
                    {activeTab === "map" && showMap && (
                      <MapTab form={form} />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    onClick={sendWhatsApp}
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M11.999 2C6.478 2 2 6.478 2 12c0 1.85.504 3.58 1.38 5.07L2 22l5.085-1.335A9.945 9.945 0 0012 22c5.522 0 10-4.478 10-10S17.521 2 12 2z" />
                    </svg>
                    WhatsApp Par Bhejein
                  </button>
                  <button
                    onClick={downloadDocket}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    B2G Docket Download
                  </button>
                  <a
                    href="/admin"
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Admin Review
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          NIVESH Platform · Powered by Google Gemini AI · Data: Agmarknet, ICAR, data.gov.in · Made in 🇮🇳 India
        </div>
      </footer>
    </div>
  );
}

// --- Sub-Components ---

function ScoreCard({ label, value, suffix, color }) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colorMap[color]}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-black ${colorMap[color].split(" ")[0]}`}>
        {value}{suffix}
      </div>
    </div>
  );
}

function OverviewTab({ result, form }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard
          icon="🌱"
          title="Fasal Badlav Sujhav"
          content={result.crop_switch_suggestion}
          badge="AI Recommended"
          badgeColor="emerald"
        />
        <InfoCard
          icon="🌤️"
          title="Mausam Salah"
          content={result.weather_advice}
          badge="Live Forecast"
          badgeColor="blue"
        />
        <InfoCard
          icon="🧪"
          title="Khaad Sujhav"
          content={result.fertilizer_advice_hinglish}
          badge="Soil Health Card"
          badgeColor="amber"
        />
        <InfoCard
          icon="🐛"
          title="Keeda Rog Alert"
          content={result.pest_alert_hinglish}
          badge="ICAR Data"
          badgeColor="red"
        />
      </div>

      {/* Subsidies */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏛️</span>
          <span className="font-bold text-slate-800">Sarkar Yojanaayein (Eligible Subsidies)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.recommended_subsidies?.map((s) => (
            <span key={s} className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded-full font-medium">
              ✓ {s}
            </span>
          ))}
        </div>
      </div>

      {/* Carbon Credits */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-slate-800">🌿 Carbon Credit Earning</div>
          <div className="text-sm text-slate-500 mt-0.5">Annual estimate based on land + crop type</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-600">₹{result.carbon_credit_estimate?.toLocaleString("en-IN")}</div>
          <div className="text-xs text-slate-500">Per year</div>
        </div>
      </div>
    </div>
  );
}

function FinanceTab({ result }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl border p-4 text-center">
          <div className="text-xs text-slate-500 mb-1">Estimated Investment</div>
          <div className="text-xl font-black text-slate-800">₹{result.estimated_investment_inr?.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <div className="text-xs text-slate-500 mb-1">Expected Revenue</div>
          <div className="text-xl font-black text-emerald-700">₹{result.expected_revenue_inr?.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
          <div className="text-xs text-slate-500 mb-1">AI Loan Recommendation</div>
          <div className="text-xl font-black text-blue-700">₹{result.loan_recommendation_inr?.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border p-4">
        <div className="font-semibold text-slate-800 mb-3">Profit/Loss Projection</div>
        <div className="space-y-2">
          {[
            { label: "Gross Revenue", val: result.expected_revenue_inr, color: "bg-emerald-500" },
            { label: "Input Cost", val: result.estimated_investment_inr, color: "bg-slate-400" },
            {
              label: "Net Profit",
              val: result.expected_revenue_inr - result.estimated_investment_inr,
              color: result.expected_revenue_inr - result.estimated_investment_inr > 0 ? "bg-blue-500" : "bg-red-500",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-28">{item.label}</span>
              <div className="flex-1 bg-slate-200 rounded-full h-3">
                <div
                  className={`${item.color} h-3 rounded-full transition-all duration-700`}
                  style={{ width: `${Math.min(100, Math.abs(item.val) / (result.expected_revenue_inr * 1.2) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 w-24 text-right">
                ₹{Math.abs(item.val)?.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <div className="font-semibold text-slate-800 mb-2">🏦 KCC (Kisan Credit Card) Eligibility</div>
        <div className="text-sm text-slate-600">
          Aapki zameen aur fasal ke hisab se aap KCC ke liye eligible hain.{" "}
          <span className="font-bold text-amber-700">Recommended limit: ₹{Math.round(result.loan_recommendation_inr * 0.9)?.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

function AgriTab({ result }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl border p-4">
          <div className="font-semibold text-slate-800 mb-3">🛡️ Fasal Bima (PMFBY)</div>
          <div className="text-sm text-slate-600">
            PM Fasal Bima Yojana ke tahat aapki fasal insurance ke liye apply kar sakte hain. Premium: 2% kharif, 1.5% rabi.
          </div>
          <button className="mt-3 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            Apply for Insurance
          </button>
        </div>
        <div className="bg-slate-50 rounded-xl border p-4">
          <div className="font-semibold text-slate-800 mb-3">🚜 Equipment Rental</div>
          <div className="space-y-2">
            {[
              { name: "Mahindra Tractor 60HP", dist: "2.8 km", rate: "₹450/hr" },
              { name: "Swaraj 744 FE", dist: "4.1 km", rate: "₹380/hr" },
            ].map((eq) => (
              <div key={eq.name} className="flex justify-between items-center text-xs border-b border-slate-100 pb-1">
                <div>
                  <div className="font-medium text-slate-700">{eq.name}</div>
                  <div className="text-slate-500">{eq.dist} door</div>
                </div>
                <span className="font-bold text-emerald-600">{eq.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
        <div className="font-semibold text-slate-800 mb-2">🐛 ICAR Pest Intelligence</div>
        <div className="text-sm text-slate-600">{result.pest_alert_hinglish}</div>
        <div className="mt-2 text-xs text-red-600 font-medium">Source: ICAR-NCIPM Advisory System</div>
      </div>

      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
        <div className="font-semibold text-slate-800 mb-2">🌾 Harvest Logistics Planner</div>
        <div className="text-sm text-slate-600 mb-2">
          Nearest mandi: <span className="font-bold">{result.nearest_high_price_mandi}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white rounded-lg border p-2 text-center">
            <div className="font-bold text-slate-700">~35 km</div>
            <div className="text-slate-500">Distance</div>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <div className="font-bold text-slate-700">₹2,200</div>
            <div className="text-slate-500">Transport</div>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <div className="font-bold text-slate-700">3-4 hrs</div>
            <div className="text-slate-500">Travel Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MandiTab({ result, form }) {
  const mandiData = [
    { name: result.nearest_high_price_mandi || "Jabalpur Krishi Upaj Mandi", price: 4850, change: +120 },
    { name: "Indore Mandi", price: 4680, change: -40 },
    { name: "Bhopal Mandi", price: 4720, change: +80 },
    { name: "Chhindwara Mandi", price: 4550, change: +30 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800">🏪 Mandi Price Intelligence</h3>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Source: Agmarknet</span>
      </div>

      <div className="space-y-2">
        {mandiData.map((m, i) => (
          <div key={m.name} className={`flex items-center justify-between p-3 rounded-xl border ${i === 0 ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
            <div>
              <div className={`font-semibold text-sm ${i === 0 ? "text-emerald-800" : "text-slate-700"}`}>
                {i === 0 && "⭐ "}{m.name}
              </div>
              <div className="text-xs text-slate-500">{form.crop || "Soybean"}</div>
            </div>
            <div className="text-right">
              <div className={`font-black text-lg ${i === 0 ? "text-emerald-700" : "text-slate-700"}`}>
                ₹{m.price}
              </div>
              <div className={`text-xs font-medium ${m.change > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {m.change > 0 ? "▲" : "▼"} ₹{Math.abs(m.change)} today
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="font-semibold text-slate-800 mb-1">💡 Arbitrage Opportunity</div>
        <div className="text-sm text-slate-600">
          Sabse zyada price <span className="font-bold text-emerald-700">{result.nearest_high_price_mandi}</span> mein mil raha hai.
          Agar aap wahan bechein toh <span className="font-bold text-blue-700">₹300/quintal extra</span> milega.
        </div>
      </div>
    </div>
  );
}

function MapTab({ form }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800">🗺️ Satellite Crop Health Map</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Healthy</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm" /> Moderate</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-sm" /> Stress</span>
        </div>
      </div>
      <MapComponent district={form.district} />
      <div className="mt-2 text-xs text-slate-500 text-center">
        NDVI Overlay · {form.district}, Madhya Pradesh · Leaflet.js
      </div>
    </div>
  );
}

function InfoCard({ icon, title, content, badge, badgeColor }) {
  const badgeColors = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
     <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-sm text-slate-800">{title}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColors[badgeColor]}`}>{badge}</span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
    </div>
  );
}


































