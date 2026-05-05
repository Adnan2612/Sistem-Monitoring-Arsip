import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Brush,
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
function formatTime(date) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

function getLabel(status) {
  if (status === "normal") return "Aman";
  if (status === "warning") return "Waspada";
  return "Berbahaya";
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
      style={{
        background: bgColor,
        border: `1px solid ${statusColor}`,
      }}
    >
      <p>{title}</p>

      <h2 style={{ color: statusColor }}>
        {safeValue.toFixed(1)} {unit}
      </h2>

      <div style={{ fontSize: "12px", color: "#64748b" }}>
        {waktu || "-"}
      </div>

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

/* ================= ALERT TOAST (AUTO HIDE 5 DETIK) ================= */
function AlertPopup({ statusSuhu, statusHum, onClose }) {
  if (statusSuhu === "normal" && statusHum === "normal") return null;

  let color = "#f59e0b";
  let bgColor = "#fff3bf";
  let title = "Waspada";
  let message = "Kondisi ruang arsip mulai keluar dari batas ideal.";

  if (statusSuhu === "danger" || statusHum === "danger") {
    color = "#ef4444";
    bgColor = "#fee2e2";
    title = "Berbahaya";
    message =
      "Segera lakukan pengecekan ruangan arsip dan sistem pendingin!";
  }

  const labelSuhu = getLabel(statusSuhu);
  const labelHum = getLabel(statusHum);

  // auto close 5 detik jika tidak ada interaksi
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="alert-popup"
      style={{
        position: "fixed",
        top: "85px",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "95%",
        width: "360px",
        background: bgColor,
        borderLeft: `5px solid ${color}`,
        boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
        padding: "12px 14px",
        borderRadius: "10px",
        zIndex: 1100,
        color: "#201f1f",
        fontSize: "13px",
        lineHeight: "1.4",
      }}
    >
      <h4
        style={{
          margin: "0 0 6px",
          color,
          fontWeight: 600,
          fontSize: "15px",
        }}
      >
        {title}
      </h4>

      <p style={{ margin: "0 0 8px" }}>{message}</p>

      <ul style={{ paddingLeft: "16px", margin: "0 0 8px", lineHeight: 1.4 }}>
        <li>Suhu: {labelSuhu}</li>
        <li>Kelembapan: {labelHum}</li>
        <li>Cek AC / ventilasi.</li>
        <li>Pastikan pintu tertutup rapat.</li>
      </ul>

      <button
        onClick={onClose}
        style={{
          padding: "4px 10px",
          fontSize: "12px",
          borderRadius: "6px",
          border: "none",
          background: color,
          color: "#fff",
          cursor: "pointer",
          width: "100%",
          maxWidth: "280px",
          marginTop: "4px",
          marginLeft: 0,
        }}
      >
        Saya mengerti
      </button>
    </div>
  );
}

/* ================= MAIN ================= */
export default function App() {
  const [data, setData] = useState([]);
  const [time, setTime] = useState(new Date());
  const [showAlert, setShowAlert] = useState(true);

  /* FETCH REALTIME */
  useEffect(() => {
    const fetchLatest = async () => {
  const d = await getData();
  console.log("DATA BARU di Thingspeak:", d); // cek di console browser
  setData(d);
};

    fetchLatest();
    const interval = setInterval(fetchLatest, 10000); // 10 detik
    return () => clearInterval(interval);
  }, []);

  /* JAM REALTIME */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Ambil data terbaru yang benar‑benar ada
  const lastData = data.filter((d) => {
    const sa = parseFloat(d.field1);
    const sp = parseFloat(d.field3);
    const ha = parseFloat(d.field2);
    const hp = parseFloat(d.field4);
    return !isNaN(sa) || !isNaN(sp) || !isNaN(ha) || !isNaN(hp);
  });

  const last =
    lastData.length > 0 ? lastData[lastData.length - 1] : { created_at: "" };

  /* Ambil nilai terakhir yang valid */
  const suhuA = parseFloat(last.field1 ?? 0);
  const suhuP = (() => {
    // cari prediksi terakhir yang ada di data
    for (let i = lastData.length - 1; i >= 0; i--) {
      const val = parseFloat(lastData[i].field3);
      if (!isNaN(val)) return val;
    }
    return 0;
  })();

  const humA = parseFloat(last.field2 ?? 0);
  const humP = (() => {
    // cari prediksi terakhir yang ada di data
    for (let i = lastData.length - 1; i >= 0; i--) {
      const val = parseFloat(lastData[i].field4);
      if (!isNaN(val)) return val;
    }
    return 0;
  })();

  const statusSuhu = getStatus(suhuA, STD_SUHU.min, STD_SUHU.max);
  const statusHum = getStatus(humA, STD_KELEMBAPAN.min, STD_KELEMBAPAN.max);

  /* Alert muncul ketika data datang (bukan segera saat mount) */
  useEffect(() => {
    if (data.length > 0) {
      setShowAlert(true);
    }
  }, [data]);

  /* DATA CHART (grafik suhu & kelembapan) */
  const chartData = data.map((d) => ({
    waktu: formatTime(d.created_at),
    tanggal: formatDate(d.created_at),
    suhuAktual: parseFloat(d.field1) || 0,
    suhuPrediksi: parseFloat(d.field3) || 0,
    kelembapanAktual: parseFloat(d.field2) || 0,
    kelembapanPrediksi: parseFloat(d.field4) || 0,
  }));
    /* ================= STATE FILTER & PAGINATION (tabel) ================= */
  const [filterMs, setFilterMs] = useState(0);           // 0 = semua
  const [pageSuhu, setPageSuhu] = useState(1);
  const [pageHum, setPageHum] = useState(1);

  const ITEMS_PER_PAGE = 20;

  // filter data berdasarkan waktu (1 jam, 1 hari, dst)
  const filtered = data.filter((d) => {
    const now = new Date();
    const t = new Date(d.created_at);
    return filterMs <= 0 || now - t <= filterMs;
  });

  const totalItems = filtered.length;
  const totalPagesSuhu = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startSuhu = (pageSuhu - 1) * ITEMS_PER_PAGE;
  const dataSuhu = filtered.slice(startSuhu, startSuhu + ITEMS_PER_PAGE);

  const totalPagesHum = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startHum = (pageHum - 1) * ITEMS_PER_PAGE;
  const dataHum = filtered.slice(startHum, startHum + ITEMS_PER_PAGE);

   /* ================= EXPORT CSV TABEL SUHU (semua data filtered, bukan hanya halaman) ================= */
  const exportSuCSV = () => {
    let csv = "No,Tanggal,Waktu,Suhu Aktual,Prediksi,Selisih,Kondisi\n";

    filtered.forEach((d, i) => {
      const sa = parseFloat(d.field1 || 0).toFixed(1);
      const sp = parseFloat(d.field3 || 0).toFixed(1);
      const selisih = (parseFloat(sa) - parseFloat(sp)).toFixed(1);
      const status = getStatus(parseFloat(sa), 18, 22);
      const statusText = getLabel(status);

      csv += `${i + 1},${formatDate(d.created_at)},${formatTime(
        d.created_at
      )},${sa},${sp},${selisih},${statusText}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "data_suhu_arsip.csv";
    a.click();
  };

  /* ================= EXPORT CSV TABEL KELEMBAPAN (semua data filtered) ================= */
  const exportHumCSV = () => {
    let csv = "No,Tanggal,Waktu,Kelembapan Aktual,Prediksi,Selisih,Kondisi\n";

    // iterasi semua data yang sudah difilter (bukan dataHum per halaman)
    filtered.forEach((d, i) => {
      const ha = parseFloat(d.kelembapanAktual || 0).toFixed(1);
      const hp = parseFloat(d.kelembapanPrediksi || 0).toFixed(1);
      const selisih = (parseFloat(ha) - parseFloat(hp)).toFixed(1);
      const status = getStatus(parseFloat(ha), 45, 55);
      const statusText = getLabel(status);

      csv += `${i + 1},${formatDate(d.created_at)},${formatTime(
        d.created_at
      )},${ha},${hp},${selisih},${statusText}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "data_kelembapan_arsip.csv";
    a.click();
  };

    /* ================= EXPORT PDF TABEL SUHU ================= */
  const exportSuhuPDF = () => {
    let tbody = "";
    filtered.forEach((d, i) => {
      const sa = parseFloat(d.field1 || 0).toFixed(1);
      const sp = parseFloat(d.field3 || 0).toFixed(1);
      const selisih = (parseFloat(sa) - parseFloat(sp)).toFixed(1);
      const status = getStatus(parseFloat(sa), 18, 22);
      const statusText = getLabel(status);

      tbody += `
        <tr>
          <td>${i + 1}</td>
          <td>${formatDate(d.created_at)}</td>
          <td>${formatTime(d.created_at)}</td>
          <td>${sa}</td>
          <td>${sp}</td>
          <td>${selisih}</td>
          <td>${statusText}</td>
        </tr>
      `;
    });

    const w = window.open();
    w.document.write(`
      <html>
        <head>
          <title>Tabel Suhu Arsip</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; }
            table, th, td { border: 1px solid #ccc; border-collapse: collapse; padding: 8px; text-align: center; }
            th { background: #16a34a; color: white; }
          </style>
        </head>
        <body>
          <h2>Tabel Suhu Arsip</h2>
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Suhu Aktual</th>
                <th>Prediksi</th>
                <th>Selisih</th>
                <th>Kondisi</th>
              </tr>
            </thead>
            <tbody>
              ${tbody}
            </tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  /* ================= EXPORT PDF TABEL KELEMBAPAN ================= */
  const exportHumPDF = () => {
    let tbody = "";
    filtered.forEach((d, i) => {
      const ha = parseFloat(d.field2 || 0).toFixed(1);
      const hp = parseFloat(d.field4 || 0).toFixed(1);
      const selisih = (parseFloat(ha) - parseFloat(hp)).toFixed(1);
      const status = getStatus(parseFloat(ha), 45, 55);
      const statusText = getLabel(status);

      tbody += `
        <tr>
          <td>${i + 1}</td>
          <td>${formatDate(d.created_at)}</td>
          <td>${formatTime(d.created_at)}</td>
          <td>${ha}</td>
          <td>${hp}</td>
          <td>${selisih}</td>
          <td>${statusText}</td>
        </tr>
      `;
    });

    const w = window.open();
    w.document.write(`
      <html>
        <head>
          <title>Tabel Kelembapan Relatif Arsip</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; }
            table, th, td { border: 1px solid #ccc; border-collapse: collapse; padding: 8px; text-align: center; }
            th { background: #16a34a; color: white; }
          </style>
        </head>
        <body>
          <h2>Tabel Kelembapan Relatif Arsip</h2>
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Kelembapan Aktual</th>
                <th>Prediksi</th>
                <th>Selisih</th>
                <th>Kondisi</th>
              </tr>
            </thead>
            <tbody>
              ${tbody}
            </tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div className="container">
      {/* ================= HEADER BARU ================= */}
      <div className="header-pro">
        <div className="overlay header-overlay">
          <h1 className="header-title">
            Sistem Monitoring & Prediksi Mikroklimat
          </h1>

          <div className="header-info">
            <strong>DEPO | GALERI ARSIP</strong>
            <br />
            Dinas Perpustakaan dan Kearsipan
            <br />
            Provinsi Kalimantan Barat
            <br />
            Jalan Sutan Syahrir No.17 Pontianak Kalimantan Barat
          </div>

          {/* WAKTU DI KANAN BAWAH */}
          <div className="header-time">
            {time.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {/* ALERT */}
      {showAlert && (
        <AlertPopup
          statusSuhu={statusSuhu}
          statusHum={statusHum}
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* ================= CARD ================= */}
      <div className="card-grid">
        <Card
          title="Suhu Aktual"
          value={suhuA}
          unit="°C"
          status={statusSuhu}
          waktu={formatTime(last.created_at)}
        />
        <Card
          title="Kelembapan Aktual"
          value={humA}
          unit="%"
          status={statusHum}
          waktu={formatTime(last.created_at)}
        />
        <Card
          title="Prediksi Suhu"
          value={suhuP}
          unit="°C"
          status={statusSuhu}
          waktu={formatTime(last.created_at)}
        />
        <Card
          title="Prediksi Kelembapan"
          value={humP}
          unit="%"
          status={statusHum}
          waktu={formatTime(last.created_at)}
        />
      </div>

      {/* ================= GRAFIK SUHU ================= */}
      <div className="chart-box">
        <h3>Grafik Suhu</h3>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="waktu"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: "#94a3b8" }}
            />
            <YAxis
              label={{
                value: "Suhu (°C)",
                angle: -90,
                position: "insideLeft",
                offset: 10,
              }}
              tick={{ fontSize: 12 }}
            />

            <Tooltip />
            <Legend />

            {/* BATAS AMAN */}
            <ReferenceLine y={18} stroke="green" strokeDasharray="4 4" />
            <ReferenceLine y={22} stroke="green" strokeDasharray="4 4" />

            {/* SUHU AKTUAL */}
            <Line
              dataKey="suhuAktual"
              stroke="#1e40af"
              strokeWidth={3}
              name="Suhu Aktual (°C)"
            />

            {/* PREDIKSI SUHU */}
            <Line
              dataKey="suhuPrediksi"
              stroke="#dc2626"
              strokeDasharray="5 5"
              strokeWidth={3}
              name="Prediksi Suhu (°C)"
            />

            <Brush height={25} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ================= GRAFIK KELEMBAPAN ================= */}
      <div className="chart-box">
        <h3>Grafik Kelembapan (%)</h3>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="waktu"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: "#94a3b8" }}
            />
            <YAxis
              label={{
                value: "Kelembapan (%)",
                angle: -90,
                position: "insideLeft",
                offset: 10,
              }}
              tick={{ fontSize: 12 }}
            />

            <Tooltip />
            <Legend />

            {/* BATAS AMAN */}
            <ReferenceLine y={45} stroke="green" strokeDasharray="4 4" />
            <ReferenceLine y={55} stroke="green" strokeDasharray="4 4" />

            {/* KELEMBAPAN AKTUAL */}
            <Line
              dataKey="kelembapanAktual"
              stroke="#1e40af"
              strokeWidth={3}
              name="Kelembapan Aktual (%)"
            />

            {/* PREDIKSI KELEMBAPAN */}
            <Line
              dataKey="kelembapanPrediksi"
              stroke="#dc2626"
              strokeDasharray="5 5"
              strokeWidth={3}
              name="Prediksi Kelembapan (%)"
            />

            <Brush height={25} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ================= INFO INTERAKTIF ================= */}
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h4>Informasi Penanganan Kondisi Mikroklimat</h4>

        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Klik untuk melihat tindakan yang perlu dilakukan
          </summary>

          <div style={{ marginTop: "10px", fontSize: "14px" }}>
            <p>• Pastikan AC / pendingin ruangan berfungsi normal</p>
            <p>• Periksa ventilasi dan kebocoran udara</p>
            <p>• Gunakan dehumidifier jika kelembapan terlalu tinggi</p>
            <p>• Hindari membuka pintu ruangan arsip terlalu sering</p>
            <p>• Lakukan pengecekan berkala terhadap sensor dan server</p>
          </div>
        </details>
      </div>

      {/* ================= FILTER WAKTU (POJOK KIRI ATAS) ================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          margin: "10px 0 20px",
          background: "#f8fafc",
          borderRadius: "8px",
          padding: "10px 15px",
        }}
      >
        <select
          value={filterMs}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setFilterMs(val);
            setPageSuhu(1);
            setPageHum(1);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
          }}
        >
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
        <table id="table-suhu" className="table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Waktu</th>
              <th>Suhu Aktual</th>
              <th>Prediksi</th>
              <th>Selisih</th>
              <th>Kondisi</th>
            </tr>
          </thead>
          <tbody>
            {dataSuhu.map((d, i) => {
              const sa = parseFloat(d.field1 || 0).toFixed(1);
              const sp = parseFloat(d.field3 || 0).toFixed(1);
              const selisih = (parseFloat(sa) - parseFloat(sp)).toFixed(1);
              const status = getStatus(parseFloat(sa), 18, 22);
              const statusText = getLabel(status);

              return (
                <tr key={d.entry_id || i}>
                  <td>{startSuhu + i + 1}</td>
                  <td>{formatDate(d.created_at)}</td>
                  <td>{formatTime(d.created_at)}</td>
                  <td>{sa}</td>
                  <td>{sp}</td>
                  <td>{selisih}</td>
                  <td>{statusText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* PAGINATION 1/2/3 (suhu) */}
        <div className="pagination">
          {Array.from({ length: totalPagesSuhu }, (_, i) => (
            <button
              key={i + 1}
              className={pageSuhu === i + 1 ? "active" : ""}
              onClick={() => setPageSuhu(i + 1)}
              style={{
                padding: "4px 8px",
                margin: "0 2px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* EXPORT CSV & PDF kanan bawah (suhu) */}
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
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "6px",
            }}
          >
            Export CSV
          </button>
          <button
            onClick={exportSuhuPDF}
            className="btn-primary"
            style={{
              padding: "4px 10px",
              fontSize: "12px",
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
          <table id="table-hum" className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Kelembapan Aktual</th>
                <th>Prediksi</th>
                <th>Selisih</th>
                <th>Kondisi</th>
              </tr>
            </thead>
            <tbody>
              {dataHum.map((d, i) => {
                const ha = parseFloat(d.field2 || 0).toFixed(1);
                const hp = parseFloat(d.field4 || 0).toFixed(1);
                const selisih = (parseFloat(ha) - parseFloat(hp)).toFixed(1);
                const status = getStatus(parseFloat(ha), 45, 55);
                const statusText = getLabel(status);

                return (
                  <tr key={d.entry_id || i}>
                    <td>{startHum + i + 1}</td>
                    <td>{formatDate(d.created_at)}</td>
                    <td>{formatTime(d.created_at)}</td>
                    <td>{ha}</td>
                    <td>{hp}</td>
                    <td>{selisih}</td>
                    <td>{statusText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PAGINATION 1/2/3 (kelembapan) */}
          <div className="pagination">
            {Array.from({ length: totalPagesHum }, (_, i) => (
              <button
                key={i + 1}
                className={pageHum === i + 1 ? "active" : ""}
                onClick={() => setPageHum(i + 1)}
                style={{
                  padding: "4px 8px",
                  margin: "0 2px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* EXPORT CSV & PDF kanan bawah (kelembapan) */}
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
                padding: "4px 10px",
                fontSize: "12px",
                borderRadius: "6px",
              }}
            >
              Export CSV
            </button>
            <button
              onClick={exportHumPDF}
              className="btn-primary"
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                borderRadius: "6px",
              }}
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* ================= KETERANGAN ================= */}
        <div style={{ padding: "20px", fontSize: "14px" }}>
          <h4>Keterangan Kondisi Mikroklimat</h4>

          <p style={{ color: "#16a34a" }}>
            Aman: Suhu 18–22°C | Kelembapan 45–55%
          </p>

          <p style={{ color: "#f59e0b" }}>
            Waspada: Suhu 15–18°C / 22–24°C | Kelembapan 43–45% / 55–57%
          </p>

          <p style={{ color: "#ef4444" }}>
            Berbahaya: Suhu &lt;15 atau &gt;24 | Kelembapan &lt;43 atau &gt;57
          </p>
        </div>
      </div>
    );
}