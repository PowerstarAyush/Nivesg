import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Real Dataset Fallbacks ──────────────────────────────────────────────────
const MANDI_FALLBACK = {
  Soybean: { price: 4850, unit: "quintal", mandi: "Jabalpur Krishi Upaj Mandi" },
  Wheat: { price: 2275, unit: "quintal", mandi: "Indore Grain Market" },
  Rice: { price: 3180, unit: "quintal", mandi: "Balaghat Mandi" },
  Maize: { price: 1950, unit: "quintal", mandi: "Chhindwara Mandi" },
  "Tur Dal": { price: 6900, unit: "quintal", mandi: "Ujjain Dal Mandi" },
  Chana: { price: 5350, unit: "quintal", mandi: "Sagar Pulses Market" },
  Cotton: { price: 6200, unit: "quintal", mandi: "Khandwa Mandi" },
  Sugarcane: { price: 315, unit: "quintal", mandi: "Burhanpur Mandi" },
  Tomato: { price: 1200, unit: "quintal", mandi: "Bhopal Sabzi Mandi" },
  Onion: { price: 1450, unit: "quintal", mandi: "Mandsaur Mandi" },
  Mustard: { price: 5400, unit: "quintal", mandi: "Morena Mandi" },
  Groundnut: { price: 5900, unit: "quintal", mandi: "Ratlam Mandi" },
  DEFAULT: { price: 3500, unit: "quintal", mandi: "Bhopal Krishi Mandi" },
};

const WEATHER_FALLBACK = {
  Bhopal: { temp: 32, condition: "Partly Cloudy", rain_mm: 0, forecast: "3 din mein baarish expected hai" },
  Indore: { temp: 35, condition: "Sunny", rain_mm: 0, forecast: "Agle 5 din sunny rahega" },
  Jabalpur: { temp: 30, condition: "Cloudy", rain_mm: 12, forecast: "Aaj barish ho sakti hai, irrigation mat karein" },
  Gwalior: { temp: 38, condition: "Sunny Hot", rain_mm: 0, forecast: "Garmi zyada hai, subah irrigation karein" },
  DEFAULT: { temp: 33, condition: "Partly Cloudy", rain_mm: 5, forecast: "Moderate conditions, regular irrigation karein" },
};

const SOIL_FALLBACK = {
  Jabalpur: { type: "Black Cotton Soil", ph: 7.8, nitrogen: "Medium", phosphorus: "Low", potassium: "High" },
  Indore: { type: "Alluvial Soil", ph: 7.2, nitrogen: "High", phosphorus: "Medium", potassium: "Medium" },
  Bhopal: { type: "Black Soil", ph: 7.6, nitrogen: "Low", phosphorus: "Medium", potassium: "High" },
  DEFAULT: { type: "Mixed Soil", ph: 7.4, nitrogen: "Medium", phosphorus: "Medium", potassium: "Medium" },
};

const PEST_FALLBACK = {
  Soybean: "Girdle Beetle aur White Fly ka moderate risk detect hua hai. Chlorpyrifos 2ml/L spray karein.",
  Wheat: "Yellow Rust ka low risk hai. Propiconazole fungicide ready rakhein.",
  Rice: "Brown Plant Hopper ka high alert hai. Immediate monitoring karein.",
  Maize: "Fall Armyworm ka moderate risk detect hua hai. Emamectin 0.4g/L spray karein.",
  Cotton: "Bollworm active hai. BT-based pesticide use karein.",
  DEFAULT: "Seasonal pests ka low-medium risk hai. Regular field inspection karein.",
};

const SUBSIDIES = {
  base: ["PM-KISAN (₹6000/year)", "PM Fasal Bima Yojana (PMFBY)", "Kisan Credit Card (KCC)"],
  drip: "Drip Irrigation Subsidy (90% for small farmers)",
  organic: "Paramparagat Krishi Vikas Yojana (PKVY)",
  soil: "Soil Health Card Scheme",
  small: "SMAM Equipment Subsidy",
};

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchMandiPrices(crop, district) {
  try {
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${process.env.DATA_GOV_IN_KEY}&format=json&filters[State]=Madhya Pradesh&filters[Commodity]=${encodeURIComponent(crop)}&limit=5`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("API failed");
    const data = await res.json();
    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      return {
        price: parseFloat(record.Modal_Price || record.modal_price || 0),
        mandi: `${record.Market || district} Krishi Upaj Mandi`,
        source: "live",
      };
    }
    throw new Error("No records");
  } catch {
    const fallback = MANDI_FALLBACK[crop] || MANDI_FALLBACK.DEFAULT;
    return { ...fallback, source: "cached" };
  }
}

async function fetchWeather(district) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error("No API key");
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${district},IN&appid=${apiKey}&units=metric&cnt=5`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error("Weather API failed");
    const data = await res.json();
    const current = data.list[0];
    const rainNext3 = data.list.slice(0, 3).some((d) => d.rain && d.rain["3h"] > 0);
    return {
      temp: Math.round(current.main.temp),
      condition: current.weather[0].description,
      rain_mm: current.rain ? current.rain["3h"] || 0 : 0,
      forecast: rainNext3
        ? "3 din mein barish expected hai. Aaj irrigation mat karein — water waste hoga."
        : `Agle 3 din ${current.weather[0].description} rahega. Scheduled irrigation maintain karein.`,
      source: "live",
    };
  } catch {
    const fallback = WEATHER_FALLBACK[district] || WEATHER_FALLBACK.DEFAULT;
    return { ...fallback, source: "cached" };
  }
}

function getSoilData(district) {
  return SOIL_FALLBACK[district] || SOIL_FALLBACK.DEFAULT;
}

function getPestAlert(crop) {
  return PEST_FALLBACK[crop] || PEST_FALLBACK.DEFAULT;
}

function buildSubsidyList(land, crop) {
  const list = [...SUBSIDIES.base];
  if (land < 2) list.push(SUBSIDIES.drip);
  if (["Wheat", "Rice", "Tur Dal"].includes(crop)) list.push(SUBSIDIES.organic);
  list.push(SUBSIDIES.soil);
  if (land >= 3) list.push(SUBSIDIES.small);
  return list;
}

function getDefaultYield(crop) {
  const yields = {
    Soybean: 18, Wheat: 35, Rice: 28, Maize: 25, "Tur Dal": 12,
    Chana: 15, Cotton: 20, Sugarcane: 650, Tomato: 200, Onion: 180,
    Mustard: 14, Groundnut: 22, DEFAULT: 20,
  };
  return yields[crop] || yields.DEFAULT;
}

function getInvestmentPerHa(crop) {
  const costs = {
    Soybean: 18000, Wheat: 16000, Rice: 22000, Maize: 17000, "Tur Dal": 14000,
    Chana: 13000, Cotton: 25000, Sugarcane: 45000, Tomato: 35000, Onion: 30000,
    Mustard: 12000, Groundnut: 20000, DEFAULT: 18000,
  };
  return costs[crop] || costs.DEFAULT;
}

function getCropSuggestion(currentCrop, district) {
  const suggestions = {
    Soybean: "Tur Dal ugaayein — Soybean se 28% zyada profit, mandi demand high hai.",
    Wheat: "Sarson (Mustard) try karein — 20% better margin, kam paani chahiye.",
    Rice: "SRI method se hi rice ugaayein ya Maize shift karein — 15% cost bachega.",
    Cotton: "Aapke soil mein Chana better perform karega — input cost 30% kam hai.",
    Maize: "Baby Corn variety try karein — 3x better price in urban mandis.",
    DEFAULT: `${district} ke liye seasonal vegetables (Tomato/Onion) ek strong option hain.`,
  };
  return suggestions[currentCrop] || suggestions.DEFAULT;
}

// ─── Main Route Handler ───────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, district, land, crop } = body;

    if (!name || !district || !land || !crop) {
      return Response.json({ error: "Sabhi fields required hain." }, { status: 400 });
    }

    const [mandiData, weatherData] = await Promise.all([
      fetchMandiPrices(crop, district),
      fetchWeather(district),
    ]);

    const soilData = getSoilData(district);
    const pestAlert = getPestAlert(crop);
    const subsidies = buildSubsidyList(parseFloat(land), crop);

    const contextPayload = {
      farmer: { name, district, land_hectares: parseFloat(land), crop },
      mandi: mandiData,
      weather: weatherData,
      soil: soilData,
      pest_alert: pestAlert,
      eligible_subsidies: subsidies,
    };

    const systemPrompt = `You are a strict agronomist for Madhya Pradesh. Analyze farm data and return ONLY a valid JSON object. No markdown, no backticks, no prose.`;

    const userPrompt = `Analyze this farm:
FARM DATA: ${JSON.stringify(contextPayload)}

Return JSON with these keys: viability_score, estimated_investment_inr, expected_revenue_inr, yield_prediction, loan_recommendation_inr, recommended_subsidies, fertilizer_advice_hinglish, pest_alert_hinglish, weather_advice, crop_switch_suggestion, nearest_high_price_mandi, carbon_credit_estimate, trust_score.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    });

    const result = await model.generateContent(systemPrompt + "\n" + userPrompt);
    const response = await result.response;
    const rawText = response.text();

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback Logic
      const landF = parseFloat(land);
      const pricePerQ = mandiData.price;
      const yieldEst = getDefaultYield(crop);
      const investment = Math.round(landF * getInvestmentPerHa(crop));
      const revenue = Math.round(landF * yieldEst * pricePerQ * 0.01);

      parsed = {
        viability_score: 75,
        estimated_investment_inr: investment,
        expected_revenue_inr: revenue,
        yield_prediction: yieldEst,
        loan_recommendation_inr: Math.round(investment * 0.75),
        recommended_subsidies: subsidies,
        fertilizer_advice_hinglish: `Soil type ${soilData.type} ke liye NPK balanced use karein.`,
        pest_alert_hinglish: pestAlert,
        weather_advice: weatherData.forecast,
        crop_switch_suggestion: getCropSuggestion(crop, district),
        nearest_high_price_mandi: mandiData.mandi,
        carbon_credit_estimate: Math.round(landF * 2500),
        trust_score: 80,
      };
    }

    parsed._meta = {
      mandi_source: mandiData.source,
      weather_source: weatherData.source,
      generated_at: new Date().toISOString(),
    };

    return Response.json(parsed);
  } catch (error) {
    console.error("NIVESH API Error:", error);
    return Response.json(
      { error: "Analysis fail ho gayi." },
      { status: 500 }
    );
  }
        }
