import React, { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import "./App.css";

/* ================= CONFIG ================= */
const CHANNEL_ID = "3324656";
const API_KEY = "O93KWC71WM5NU2SI";
const STD_SUHU = { min: 18, max: 22 };
const STD_KELEMBAPAN = { min: 45, max: 55 };

/* ================= FETCH ================= */
async function getData() {
  const res = await fetch(
    `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${API_KEY}&results=8000`
  );
  const json = await res.json();
  return json.feeds || [];
}

/* ================= FORMAT ================= */
function formatTimeSlot(date) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function groupByTimeSlot(feeds) {
  const grouped = {};

  feeds.forEach((d) => {
    const date = new Date(d.created_at);

    // slot per 30 menit
  const minute = date.getMinutes();

  if (minute < 30)
    date.setMinutes(0, 0, 0);
  else
    date.setMinutes(30, 0, 0);

    const key = date.toISOString();

    if (!grouped[key]) {
      grouped[key] = {
        created_at: key,
        field1: null,
        field2: null,
        field3: null,
        field4: null,
      };
    }

    // simpan nilai terakhir pada slot tersebut
    if (parseFloat(d.field1) > 0)
      grouped[key].field1 = parseFloat(d.field1);

    if (parseFloat(d.field2) > 0)
      grouped[key].field2 = parseFloat(d.field2);

    if (parseFloat(d.field3) > 0)
      grouped[key].field3 = parseFloat(d.field3);

    if (parseFloat(d.field4) > 0)
      grouped[key].field4 = parseFloat(d.field4);
  });

  return Object.values(grouped);
}
function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID");
}

/* ================= STATUS ================= */
function getStatus(val, min, max) {
  val = parseFloat(val);
  if (isNaN(val)) return "normal";
  if (val >= min && val <= max) return "normal";
  if (val < min - 2 || val > max + 2) return "danger";
  return "warning";
}

// LABEL BARU sesuai revisi dosen
function getLabel(status) {
  if (status === "normal") return "Ideal";
  if (status === "warning") return "Kurang Ideal";
  return "Tidak Ideal";
}

/* ================= CARD ================= */
function Card({ title, value, unit, status, waktu }) {
  const label = getLabel(status);
  const safeValue =
    value === null || value === undefined || isNaN(parseFloat(value))
      ? 0
      : parseFloat(value);
  let statusColor;
  let bgColor;
  if (status === "normal") {
    statusColor = "#16a34a";
    bgColor = "#f0fdf4";
  } else if (status === "warning") {
    statusColor = "#f59e0b";
    bgColor = "#fff7ed";
  } else {
    statusColor = "#ef4444";
    bgColor = "#fef2f2";
  }
  return (
    <div
      className={`card ${status}`}
      style={{ background: bgColor, border: `1px solid ${statusColor}` }}
    >
      <p>{title}</p>
      <h2 style={{ color: statusColor }}>
        {safeValue.toFixed(1)} {unit}
      </h2>
      <div style={{ fontSize: "12px", color: "#64748b" }}>{waktu || "-"}</div>
      <div
        style={{
          marginTop: "6px",
          padding: "3px 10px",
          fontSize: "12px",
          color: "#fff",
          background: statusColor,
          borderRadius: "6px",
          display: "inline-block",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ================= ALERT POPUP (MUNCUL SEKALI SAJA) ================= */
function AlertPopup({ statusSuhu, statusHum, onClose }) {
  if (statusSuhu === "normal" && statusHum === "normal") return null;

  let color = "#f59e0b";
  let bgColor = "#fff3bf";
  let title = "Kurang Ideal";
  let message = "Kondisi ruang arsip mulai keluar dari batas ideal.";
  if (statusSuhu === "danger" || statusHum === "danger") {
    color = "#ef4444";
    bgColor = "#fee2e2";
    title = "Tidak Ideal";
    message = "Segera lakukan pengecekan ruangan arsip dan sistem pendingin!";
  }

  const labelSuhu = getLabel(statusSuhu);
  const labelHum = getLabel(statusHum);

  React.useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: "85px",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "95%",
        width: "360px",
        background: bgColor,
        borderLeft: `5px solid ${color}`,
        boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
        padding: "14px 16px",
        borderRadius: "10px",
        zIndex: 1100,
        color: "#201f1f",
        fontSize: "13px",
        lineHeight: "1.5",
      }}
    >
      <h4 style={{ margin: "0 0 6px", color, fontWeight: 700, fontSize: "15px" }}>
        ⚠ {title}
      </h4>
      <p style={{ margin: "0 0 8px" }}>{message}</p>
      <ul style={{ paddingLeft: "16px", margin: "0 0 10px", lineHeight: 1.6 }}>
        <li>Suhu: {labelSuhu}</li>
        <li>Kelembapan: {labelHum}</li>
        <li>Periksa AC / ventilasi ruangan.</li>
        <li>Pastikan pintu tertutup rapat.</li>
      </ul>
      <button
        onClick={onClose}
        style={{
          padding: "5px 12px",
          fontSize: "12px",
          borderRadius: "6px",
          border: "none",
          background: color,
          color: "#fff",
          cursor: "pointer",
          width: "100%",
          fontWeight: 600,
        }}
      >
        Saya Mengerti
      </button>
    </div>
  );
}

/* ================= CUSTOM TOOLTIP GRAFIK ================= */
function CustomTooltipSuhu({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>🕐 {d.waktu}</p>
      <p style={{ margin: "0 0 2px", color: "#1e40af" }}>Aktual: {Number(d.suhuAktual || 0).toFixed(1)} °C</p>
      <p style={{ margin: 0, color: "#dc2626" }}>Prediksi: {Number(d.suhuPrediksi || 0).toFixed(1)} °C</p>
    </div>
  );
}

function CustomTooltipHum({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>🕐 {d.waktu}</p>
      <p style={{ margin: "0 0 2px", color: "#1e40af" }}>Aktual: {Number(d.kelembapanAktual || 0).toFixed(1)} %RH</p>
      <p style={{ margin: 0, color: "#dc2626" }}>Prediksi: {Number(d.kelembapanPrediksi || 0).toFixed(1)} %RH</p>
    </div>
  );
}

/* ================= MAIN ================= */
export default function App() {
  const [data, setData] = useState([]);
  const [time, setTime] = useState(new Date());
  const [showAlert, setShowAlert] = useState(false);
  // Ref agar alert hanya muncul SEKALI per session (tidak repeat tiap fetch)
  const alertShownRef = useRef(false);

  /* FETCH REALTIME */
  useEffect(() => {
    const fetchLatest = async () => {
      const d = await getData();
      setData(d);
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 10000);
    return () => clearInterval(interval);
  }, []);

  /* JAM REALTIME */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ================= EKSTRAK DATA TERAKHIR VALID ================= */
  const getLastValid = (field) => {
    for (let i = data.length - 1; i >= 0; i--) {
      const val = parseFloat(data[i][field]);
      if (!isNaN(val) && val !== 0) {
        return { value: val, time: data[i].created_at };
      }
    }
    return { value: 0, time: null };
  };

  const suhuAktualLast = getLastValid("field1");
  const humAktualLast = getLastValid("field2");
  const suhuPredLast = getLastValid("field3");
  const humPredLast = getLastValid("field4");

  const suhuA = suhuAktualLast.value;
  const suhuP = suhuPredLast.value;
  const humA = humAktualLast.value;
  const humP = humPredLast.value;

  const statusSuhu = getStatus(suhuA, STD_SUHU.min, STD_SUHU.max);
  const statusHum = getStatus(humA, STD_KELEMBAPAN.min, STD_KELEMBAPAN.max);

  /* Alert hanya muncul SEKALI saat data pertama kali datang */
  useEffect(() => {
    if (data.length > 0 && !alertShownRef.current) {
      if (statusSuhu !== "normal" || statusHum !== "normal") {
        setShowAlert(true);
        alertShownRef.current = true;
      }
    }
  }, [data, statusSuhu, statusHum]);

/* ================= CHART DATA (TIME SLOT 1 JAM) ================= */

// Kelompokkan data berdasarkan jam
const groupedChart = {};

data.forEach((d) => {
  const date = new Date(d.created_at);

 const slotMinute = date.getMinutes() < 30 ? "00" : "30";

  const key =
`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")} `
+`${String(date.getHours()).padStart(2,"0")}:${slotMinute}`;

  if (!groupedChart[key]) {
    groupedChart[key] = {
      waktu:
`     ${String(date.getHours()).padStart(2,"0")}:${
      date.getMinutes() < 30 ? "00" : "30"
      }`,
      tanggal: formatDate(date),
      suhuAktual: null,
      suhuPrediksi: null,
      kelembapanAktual: null,
      kelembapanPrediksi: null,
      created_at: date,
    };
  }

  // Ambil nilai terakhir yang valid pada jam tersebut
  if (!isNaN(parseFloat(d.field1)) && parseFloat(d.field1) > 0)
    groupedChart[key].suhuAktual = parseFloat(d.field1);

  if (!isNaN(parseFloat(d.field2)) && parseFloat(d.field2) > 0)
    groupedChart[key].kelembapanAktual = parseFloat(d.field2);

  if (!isNaN(parseFloat(d.field3)) && parseFloat(d.field3) > 0)
    groupedChart[key].suhuPrediksi = parseFloat(d.field3);

  if (!isNaN(parseFloat(d.field4)) && parseFloat(d.field4) > 0)
    groupedChart[key].kelembapanPrediksi = parseFloat(d.field4);
});

// Ubah menjadi array dan urutkan berdasarkan waktu
const chartData = Object.values(groupedChart)
  .sort((a, b) => a.created_at - b.created_at)
  .slice(-20)
  .map((d, i) => ({
    index: i + 1,
    waktu: d.waktu,
    tanggal: d.tanggal,
    suhuAktual: d.suhuAktual,
    suhuPrediksi: d.suhuPrediksi,
    kelembapanAktual: d.kelembapanAktual,
    kelembapanPrediksi: d.kelembapanPrediksi,
  }));

/* ================= DOMAIN Y DINAMIS ================= */

const suhuValues = chartData
  .flatMap((d) => [d.suhuAktual, d.suhuPrediksi])
  .filter((v) => v !== null);

const suhuMin = suhuValues.length
  ? Math.floor(Math.min(...suhuValues)) - 2
  : 15;

const suhuMax = suhuValues.length
  ? Math.ceil(Math.max(...suhuValues)) + 2
  : 45;

const humValues = chartData
  .flatMap((d) => [d.kelembapanAktual, d.kelembapanPrediksi])
  .filter((v) => v !== null);

const humMin = humValues.length
  ? Math.floor(Math.min(...humValues)) - 5
  : 30;

const humMax = humValues.length
  ? Math.ceil(Math.max(...humValues)) + 5
  : 100;

  /* ================= FILTER & PAGINATION ================= */
  const [filterMs, setFilterMs] = useState(0);
  const [pageSuhu, setPageSuhu] = useState(1);
  const [pageHum, setPageHum] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const filtered = groupByTimeSlot(
  data.filter((d) => {
    const now = new Date();
    const t = new Date(d.created_at);

    return filterMs <= 0 || now - t <= filterMs;
  })
);

  const totalPagesSuhu = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startSuhu = (pageSuhu - 1) * ITEMS_PER_PAGE;
  const dataSuhu = filtered.slice(startSuhu, startSuhu + ITEMS_PER_PAGE);

  const totalPagesHum = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startHum = (pageHum - 1) * ITEMS_PER_PAGE;
  const dataHum = filtered.slice(startHum, startHum + ITEMS_PER_PAGE);

  /* ================= EXPORT CSV SUHU ================= */
  const exportSuCSV = () => {
    let csv = "No,Tanggal,Waktu,Suhu Aktual,Prediksi,Selisih,Kondisi\n";
    filtered.forEach((d, i) => {
      const sa = parseFloat(d.field1 || 0).toFixed(1);
      const sp = parseFloat(d.field3 || 0).toFixed(1);
      const selisih = (parseFloat(sa) - parseFloat(sp)).toFixed(1);
      const statusText = getLabel(getStatus(parseFloat(sa), 18, 22));
      csv += `${i + 1},${formatDate(d.created_at)},${formatTimeSlot(d.created_at)},${sa},${sp},${selisih},${statusText}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data_suhu_arsip.csv";
    a.click();
  };

  /* ================= EXPORT CSV KELEMBAPAN ================= */
  const exportHumCSV = () => {
    let csv = "No,Tanggal,Waktu,Kelembapan Aktual,Prediksi,Selisih,Kondisi\n";
    filtered.forEach((d, i) => {
      const ha = parseFloat(d.field2 || 0).toFixed(1);
      const hp = parseFloat(d.field4 || 0).toFixed(1);
      const selisih = (parseFloat(ha) - parseFloat(hp)).toFixed(1);
      const statusText = getLabel(getStatus(parseFloat(ha), 45, 55));
      csv += `${i + 1},${formatDate(d.created_at)},${formatTimeSlot(d.created_at)},${ha},${hp},${selisih},${statusText}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data_kelembapan_arsip.csv";
    a.click();
  };

  /* ================= EXPORT PDF SUHU ================= */
  const exportSuhuPDF = () => {
    let tbody = "";
    filtered.forEach((d, i) => {
      const sa = parseFloat(d.field1 || 0).toFixed(1);
      const sp = parseFloat(d.field3 || 0).toFixed(1);
      const selisih = (parseFloat(sa) - parseFloat(sp)).toFixed(1);
      const statusText = getLabel(getStatus(parseFloat(sa), 18, 22));
      tbody += `<tr><td>${i + 1}</td><td>${formatDate(d.created_at)}</td><td>${formatTimeSlot(d.created_at)}</td><td>${sa}</td><td>${sp}</td><td>${selisih}</td><td>${statusText}</td></tr>`;
    });
    const w = window.open();
    w.document.write(`<html><head><title>Tabel Suhu Arsip</title><style>body{font-family:"Segoe UI",sans-serif}table,th,td{border:1px solid #ccc;border-collapse:collapse;padding:8px;text-align:center}th{background:#16a34a;color:white}</style></head><body><h2>Tabel Suhu Arsip</h2><table><thead><tr><th>No</th><th>Tanggal</th><th>Time Slot</th><th>Suhu Aktual (°C)</th><th>Prediksi (°C)</th><th>Selisih</th><th>Kondisi</th></tr></thead><tbody>${tbody}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  /* ================= EXPORT PDF KELEMBAPAN ================= */
  const exportHumPDF = () => {
    let tbody = "";
    filtered.forEach((d, i) => {
      const ha = parseFloat(d.field2 || 0).toFixed(1);
      const hp = parseFloat(d.field4 || 0).toFixed(1);
      const selisih = (parseFloat(ha) - parseFloat(hp)).toFixed(1);
      const statusText = getLabel(getStatus(parseFloat(ha), 45, 55));
      tbody += `<tr><td>${i + 1}</td><td>${formatDate(d.created_at)}</td><td>${formatTimeSlot(d.created_at)}</td><td>${ha}</td><td>${hp}</td><td>${selisih}</td><td>${statusText}</td></tr>`;
    });
    const w = window.open();
    w.document.write(`<html><head><title>Tabel Kelembapan Arsip</title><style>body{font-family:"Segoe UI",sans-serif}table,th,td{border:1px solid #ccc;border-collapse:collapse;padding:8px;text-align:center}th{background:#0369a1;color:white}</style></head><body><h2>Tabel Kelembapan Relatif Arsip</h2><table><thead><tr><th>No</th><th>Tanggal</th><th>Time Slot</th><th>Kelembapan Aktual (%RH)</th><th>Prediksi (%RH)</th><th>Selisih</th><th>Kondisi</th></tr></thead><tbody>${tbody}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  /* ================= RENDER ================= */
  return (
    <div className="container">

      {/* HEADER */}
      <div className="header-pro">
        <div className="overlay header-overlay">
          <h1 className="header-title">Sistem Monitoring & Prediksi Mikroklimat</h1>
          <div className="header-info">
            <strong>DEPO | GALERI ARSIP</strong><br />
            Dinas Perpustakaan dan Kearsipan<br />
            Provinsi Kalimantan Barat<br />
            Jalan Sutan Syahrir No.17 Pontianak Kalimantan Barat
          </div>
          <div className="header-time">{time.toLocaleString("id-ID")}</div>
        </div>
      </div>

      {/* ALERT — muncul sekali saja */}
      {showAlert && (
        <AlertPopup
          statusSuhu={statusSuhu}
          statusHum={statusHum}
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* CARD */}
      <div className="card-grid">
        <Card title="Suhu Aktual" value={suhuA} unit="°C"
          status={getStatus(suhuA, STD_SUHU.min, STD_SUHU.max)}
          waktu={formatTimeSlot(suhuAktualLast.time)} />
        <Card title="Kelembapan Aktual" value={humA} unit="%RH"
          status={getStatus(humA, STD_KELEMBAPAN.min, STD_KELEMBAPAN.max)}
          waktu={formatTimeSlot(humAktualLast.time)} />
        <Card title="Prediksi Suhu" value={suhuP} unit="°C"
          status={getStatus(suhuP, STD_SUHU.min, STD_SUHU.max)}
          waktu={formatTimeSlot(suhuPredLast.time)} />
        <Card title="Prediksi Kelembapan" value={humP} unit="%RH"
          status={getStatus(humP, STD_KELEMBAPAN.min, STD_KELEMBAPAN.max)}
          waktu={formatTimeSlot(humPredLast.time)} />
      </div>

      {/* GRAFIK SUHU */}
      <div className="chart-box">
        <h3>📊 Grafik Suhu (°C)</h3>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <ReferenceLine
    y={18}
    stroke="#16a34a"
    strokeWidth={2}
    strokeDasharray="5 5"
/>

<ReferenceLine
    y={22}
    stroke="#16a34a"
    strokeWidth={2}
    strokeDasharray="5 5"
/>
            <XAxis
              dataKey="waktu"
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{ value: "Time Slot", position: "insideBottomRight", offset: -10, fontSize: 12 }}
            />
            <YAxis
              domain={[suhuMin, suhuMax]}
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{ value: "Suhu (°C)", angle: -90, position: "insideLeft", offset: 15, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltipSuhu />} />
            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "13px" }} />
            <ReferenceLine y={STD_SUHU.min} stroke="#16a34a" strokeDasharray="5 5" strokeWidth={1.5}
              label={{ value: "Min Aman (18°C)", position: "insideTopLeft", fontSize: 10, fill: "#16a34a" }} />
            <ReferenceLine y={STD_SUHU.max} stroke="#16a34a" strokeDasharray="5 5" strokeWidth={1.5}
              label={{ value: "Maks Aman (22°C)", position: "insideTopLeft", fontSize: 10, fill: "#16a34a" }} />
            <Line dataKey="suhuAktual" stroke="#1e40af" strokeWidth={2.5}
              name="Suhu Aktual (°C)" dot={{ r: 3, fill: "#1e40af" }} activeDot={{ r: 5 }} connectNulls />
            <Line dataKey="suhuPrediksi" stroke="#dc2626" strokeDasharray="6 3" strokeWidth={2.5}
              name="Prediksi Suhu (°C)" dot={{ r: 3, fill: "#dc2626" }} activeDot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* GRAFIK KELEMBAPAN */}
      <div className="chart-box">
        <h3>💧 Grafik Kelembapan (%RH)</h3>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="waktu"
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{ value: "Time Slot", position: "insideBottomRight", offset: -10, fontSize: 12 }}
            />
            <YAxis
              domain={[humMin, humMax]}
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{ value: "Kelembapan (%RH)", angle: -90, position: "insideLeft", offset: 15, fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltipHum />} />
            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "13px" }} />
            <ReferenceLine y={STD_KELEMBAPAN.min} stroke="#0369a1" strokeDasharray="5 5" strokeWidth={1.5}
              label={{ value: "Min Aman (45%)", position: "insideTopLeft", fontSize: 10, fill: "#0369a1" }} />
            <ReferenceLine y={STD_KELEMBAPAN.max} stroke="#0369a1" strokeDasharray="5 5" strokeWidth={1.5}
              label={{ value: "Maks Aman (55%)", position: "insideTopLeft", fontSize: 10, fill: "#0369a1" }} />
            <Line dataKey="kelembapanAktual" stroke="#1e40af" strokeWidth={2.5}
              name="Kelembapan Aktual (%RH)" dot={{ r: 3, fill: "#1e40af" }} activeDot={{ r: 5 }} connectNulls />
            <Line dataKey="kelembapanPrediksi" stroke="#dc2626" strokeDasharray="6 3" strokeWidth={2.5}
              name="Prediksi Kelembapan (%RH)" dot={{ r: 3, fill: "#dc2626" }} activeDot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* INFO INTERAKTIF */}
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h4>Informasi Penanganan Kondisi Mikroklimat</h4>
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Klik untuk melihat tindakan yang perlu dilakukan
          </summary>
          <div style={{ marginTop: "10px", fontSize: "14px", textAlign: "left", maxWidth: "600px", margin: "10px auto 0" }}>
            <p>• Pastikan AC / pendingin ruangan berfungsi normal</p>
            <p>• Periksa ventilasi dan kebocoran udara</p>
            <p>• Gunakan dehumidifier jika kelembapan terlalu tinggi</p>
            <p>• Hindari membuka pintu ruangan arsip terlalu sering</p>
            <p>• Lakukan pengecekan berkala terhadap sensor dan perangkat sistem</p>
          </div>
        </details>
      </div>

      {/* FILTER WAKTU */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center",
        flexWrap: "wrap", gap: "10px", margin: "10px 0 20px",
        background: "#f8fafc", borderRadius: "8px", padding: "10px 15px" }}>
        <label style={{ fontWeight: 600, fontSize: "14px" }}>Filter Data:</label>
        <select value={filterMs} onChange={(e) => {
            setFilterMs(parseInt(e.target.value));
            setPageSuhu(1); setPageHum(1);
          }}
          style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}>
          <option value={0}>Semua Data</option>
          <option value={3600000}>1 Jam Terakhir</option>
          <option value={10800000}>3 Jam Terakhir</option>
          <option value={18000000}>5 Jam Terakhir</option>
          <option value={43200000}>12 Jam Terakhir</option>
          <option value={86400000}>1 Hari Terakhir</option>
          <option value={259200000}>3 Hari Terakhir</option>
          <option value={604800000}>7 Hari Terakhir</option>
          <option value={1209600000}>14 Hari Terakhir</option>
          <option value={2592000000}>1 Bulan Terakhir</option>
        </select>
      </div>

      {/* ================= TABEL SUHU ================= */}
<div className="table-wrapper">
  <h4 style={{ textAlign: "left", margin: "10px 0 10px 25px" }}>
    Tabel Suhu
  </h4>

  <table className="table">
    <thead>
      <tr>
        <th>No</th>
        <th>Tanggal</th>
        <th>Waktu</th>
        <th>Suhu Aktual (°C)</th>
        <th>Prediksi (°C)</th>
        <th>Selisih</th>
        <th>Kondisi</th>
      </tr>
    </thead>

    <tbody>
      {chartData.map((d, i) => {

        const sa = d.suhuAktual ?? 0;
        const sp = d.suhuPrediksi ?? 0;

        const selisih = (sa - sp).toFixed(1);

        const status = getStatus(sa, STD_SUHU.min, STD_SUHU.max);

        const statusText = getLabel(status);

        const rowColor =
          status === "normal"
            ? "#f0fdf4"
            : status === "warning"
            ? "#fff7ed"
            : "#fef2f2";

        return (
          <tr key={i} style={{ background: rowColor }}>
            <td>{i + 1}</td>
            <td>{d.tanggal}</td>
            <td>{d.waktu}</td>
            <td>{sa.toFixed(1)}</td>
            <td>{sp.toFixed(1)}</td>
            <td>{selisih}</td>
            <td style={{ fontWeight: 600 }}>{statusText}</td>
          </tr>
        );
      })}
    </tbody>
  </table>

  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "12px",
    }}
  >
    <button
      onClick={exportSuCSV}
      className="btn-primary"
      style={{
        padding: "5px 12px",
        fontSize: "13px",
        borderRadius: "6px",
      }}
    >
      Export CSV
    </button>

    <button
      onClick={exportSuhuPDF}
      className="btn-primary"
      style={{
        padding: "5px 12px",
        fontSize: "13px",
        borderRadius: "6px",
      }}
    >
      Export PDF
    </button>
  </div>
</div>





{/* ================= TABEL KELEMBAPAN ================= */}

<div className="table-wrapper">

  <h4 style={{ textAlign: "left", margin: "10px 0 10px 25px" }}>
    Tabel Kelembapan Relatif
  </h4>

  <table className="table">

    <thead>

      <tr>
        <th>No</th>
        <th>Tanggal</th>
        <th>Waktu</th>
        <th>Kelembapan Aktual (%RH)</th>
        <th>Prediksi (%RH)</th>
        <th>Selisih</th>
        <th>Kondisi</th>
      </tr>

    </thead>

    <tbody>

      {chartData.map((d, i) => {

        const ha = d.kelembapanAktual ?? 0;
        const hp = d.kelembapanPrediksi ?? 0;

        const selisih = (ha - hp).toFixed(1);

        const status = getStatus(
          ha,
          STD_KELEMBAPAN.min,
          STD_KELEMBAPAN.max
        );

        const statusText = getLabel(status);

        const rowColor =
          status === "normal"
            ? "#f0fdf4"
            : status === "warning"
            ? "#fff7ed"
            : "#fef2f2";

        return (
          <tr key={i} style={{ background: rowColor }}>
            <td>{i + 1}</td>
            <td>{d.tanggal}</td>
            <td>{d.waktu}</td>
            <td>{ha.toFixed(1)}</td>
            <td>{hp.toFixed(1)}</td>
            <td>{selisih}</td>
            <td style={{ fontWeight: 600 }}>{statusText}</td>
          </tr>
        );
      })}

    </tbody>

  </table>

  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "12px",
    }}
  >
    <button
      onClick={exportHumCSV}
      className="btn-primary"
      style={{
        padding: "5px 12px",
        fontSize: "13px",
        borderRadius: "6px",
      }}
    >
      Export CSV
    </button>

    <button
      onClick={exportHumPDF}
      className="btn-primary"
      style={{
        padding: "5px 12px",
        fontSize: "13px",
        borderRadius: "6px",
      }}
    >
      Export PDF
    </button>
  </div>

</div>

      {/* KETERANGAN KONDISI */}
      <div style={{ padding: "20px 25px", fontSize: "14px", background: "#f8fafc", margin: "20px", borderRadius: "10px" }}>
        <h4 style={{ marginBottom: "10px" }}>Keterangan Kondisi Mikroklimat</h4>
        <p style={{ color: "#16a34a", marginBottom: "6px" }}>
          🟢 <strong>Ideal:</strong> Suhu 18–22°C | Kelembapan 45–55%RH
        </p>
        <p style={{ color: "#f59e0b", marginBottom: "6px" }}>
          🟡 <strong>Kurang Ideal:</strong> Suhu 16–18°C / 22–24°C | Kelembapan 43–45% / 55–57%RH
        </p>
        <p style={{ color: "#ef4444", marginBottom: 0 }}>
          🔴 <strong>Tidak Ideal:</strong> Suhu &lt;16°C atau &gt;24°C | Kelembapan &lt;43% atau &gt;57%RH
        </p>
      </div>

    </div>
  );
}