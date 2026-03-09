"use client";
import { useEffect, useRef } from "react";

// Madhya Pradesh district coordinates
const DISTRICT_COORDS = {
  Bhopal: [23.2599, 77.4126],
  Indore: [22.7196, 75.8577],
  Jabalpur: [23.1815, 79.9864],
  Gwalior: [26.2183, 78.1828],
  Ujjain: [23.1765, 75.7885],
  Sagar: [23.8388, 78.7378],
  Dewas: [22.9676, 76.0534],
  Chhindwara: [22.0574, 78.9382],
  Rewa: [24.5362, 81.3032],
  Hoshangabad: [22.7547, 77.7268],
};

const getCoords = (district) => DISTRICT_COORDS[district] || [23.2, 77.4];

export default function MapComponent({ district }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const loadLeaflet = async () => {
      // Load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!window.L) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      if (!mapRef.current || !window.L) return;

      const coords = getCoords(district);
      const map = window.L.map(mapRef.current).setView(coords, 10);
      mapInstanceRef.current = map;

      // Base tile layer
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Simulate NDVI grid overlay
      const ndviCells = generateNDVIGrid(coords[0], coords[1], 8, 8);
      ndviCells.forEach((cell) => {
        const color = cell.ndvi > 0.6 ? "#10b981" : cell.ndvi > 0.4 ? "#f59e0b" : "#ef4444";
        const opacity = 0.25 + cell.ndvi * 0.3;
        window.L.rectangle(cell.bounds, {
          color,
          weight: 0,
          fillColor: color,
          fillOpacity: opacity,
        }).addTo(map).bindPopup(
          `<b>NDVI Score:</b> ${cell.ndvi.toFixed(2)}<br/><b>Status:</b> ${cell.ndvi > 0.6 ? "Healthy" : cell.ndvi > 0.4 ? "Moderate" : "Stress"}`
        );
      });

      // Farm marker
      const farmIcon = window.L.divIcon({
        className: "",
        html: `<div style="background:#10b981;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🌾</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      window.L.marker(coords, { icon: farmIcon })
        .addTo(map)
        .bindPopup(`<b>${district} Farm</b><br/>Click for details`)
        .openPopup();

      // Mandi markers
      const mandiCoords = [
        [coords[0] + 0.3, coords[1] + 0.2, "Krishi Upaj Mandi", "₹4850/q"],
        [coords[0] - 0.2, coords[1] + 0.4, "Grain Market", "₹4650/q"],
      ];

      mandiCoords.forEach(([lat, lng, name, price]) => {
        const mandiIcon = window.L.divIcon({
          className: "",
          html: `<div style="background:#2563eb;color:white;border-radius:8px;padding:3px 7px;font-size:10px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;">🏪 ${price}</div>`,
          iconSize: [70, 24],
          iconAnchor: [35, 12],
        });
        window.L.marker([lat, lng], { icon: mandiIcon })
          .addTo(map)
          .bindPopup(`<b>${name}</b><br/>${price}`);
      });
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [district]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-slate-200"
      style={{ height: "300px", zIndex: 0 }}
    />
  );
}

function generateNDVIGrid(centerLat, centerLng, rows, cols) {
  const cells = [];
  const size = 0.04;
  const startLat = centerLat - (rows * size) / 2;
  const startLng = centerLng - (cols * size) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = startLat + r * size;
      const lng = startLng + c * size;
      const ndvi = 0.3 + Math.random() * 0.55;
      cells.push({
        bounds: [
          [lat, lng],
          [lat + size, lng + size],
        ],
        ndvi,
      });
    }
  }
  return cells;
        }
