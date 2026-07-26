"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { members } from "../../data/members";
import * as XLSX from "xlsx";

// 🔗 Link Google Spreadsheet Absensi KKN Damarjati
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1VJMFEGku8Zljx61eCsSGMbhdpWkgZzTZmjjEHaApqA8/edit?usp=sharing";

// Tanggal mulai KKN - sesuaikan dengan tanggal mulai KKN Anda
const START_DATE = new Date("2026-07-26");
const TOTAL_DAYS = 40; // 40 hari pengabdian

function getDates() {
  const dates = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(START_DATE);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
}

function formatDateKey(d) {
  // Gunakan waktu lokal (bukan UTC) agar sesuai dengan timezone WIB
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminPage() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const ADMIN_PIN = "1234"; // PIN admin sederhana, bisa diubah

  const dates = getDates();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAttendances();
    }
  }, [isAuthenticated]);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      // Panggil API route internal Next.js (bukan langsung ke Google, agar tidak CORS)
      const res = await fetch("/api/rekap", { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        setAttendances(json.data || []);
      } else {
        console.error("Gagal memuat data:", json.error);
        setAttendances([]);
      }
    } catch (err) {
      console.error("Gagal memuat data:", err);
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  // Normalisasi status: handle kata penuh ('Hadir') maupun singkatan ('H')
  const normalizeStatus = (status) => {
    if (!status) return "-";
    const map = {
      "hadir": "H", "h": "H",
      "sakit": "S", "s": "S",
      "izin": "I",  "i": "I",
      "alpha": "A", "a": "A",
      "alfa":  "A",
    };
    return map[status.toLowerCase()] || status.toUpperCase();
  };

  // Ambil status absen berdasarkan nama & tanggal
  const getStatus = (memberName, date) => {
    const dateKey = formatDateKey(date);
    const found = attendances.find(a => {
      // Konversi timestamp ke waktu lokal WIB (bukan UTC)
      const d = new Date(a.timestamp);
      const rowDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      return a.nama === memberName && rowDate === dateKey;
    });
    return found ? normalizeStatus(found.status) : "-";
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "H": return "bg-emerald-200 text-emerald-800 font-bold";
      case "S": return "bg-yellow-200 text-yellow-800 font-bold";
      case "I": return "bg-blue-200 text-blue-800 font-bold";
      case "A": return "bg-red-200 text-red-800 font-bold";
      default:  return "text-gray-300";
    }
  };

  const countStatus = (memberName, targetStatus) => {
    // Hitung per hari unik saja (abaikan duplikat di hari yang sama)
    const uniqueDays = new Set(
      attendances
        .filter(a => a.nama === memberName && normalizeStatus(a.status) === targetStatus)
        .map(a => {
          const d = new Date(a.timestamp);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        })
    );
    return uniqueDays.size;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
    } else {
      alert("PIN salah! Coba lagi.");
    }
  };

  // 📥 Export ke Excel format kampus
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [];

    // Header info kampus
    wsData.push(["DAFTAR HADIR MAHASISWA KKN"]);
    wsData.push(["Desa", ": Damarjati"]);
    wsData.push(["Kecamatan", ": ___________________________"]);
    wsData.push(["Kabupaten", ": ___________________________"]);
    wsData.push(["Bulan", ": Juli - September 2026"]);
    wsData.push([]);

    // Header tabel: No | Nama | Tgl 1 | Tgl 2 | ... | H | S | I | A
    const headerRow = ["No", "Nama"];
    dates.forEach(d => headerRow.push(d.getDate()));
    headerRow.push("H", "S", "I", "A");
    wsData.push(headerRow);

    // Baris data per anggota
    members.forEach((member, idx) => {
      const row = [idx + 1, member.name];
      dates.forEach(d => {
        row.push(getStatus(member.name, d) === "-" ? "" : getStatus(member.name, d));
      });
      row.push(
        countStatus(member.name, "H"),
        countStatus(member.name, "S"),
        countStatus(member.name, "I"),
        countStatus(member.name, "A")
      );
      wsData.push(row);
    });

    wsData.push([]);
    wsData.push(["", "", "", "", "", "", "Mengetahui,"]);
    wsData.push(["", "", "", "", "", "", "Dosen Pembimbing Lapangan"]);
    wsData.push([]);
    wsData.push([]);
    wsData.push([]);
    wsData.push(["", "", "", "", "", "", "(________________________)"]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set lebar kolom
    ws["!cols"] = [
      { wch: 5 },   // No
      { wch: 30 },  // Nama
      ...dates.map(() => ({ wch: 4 })), // Tanggal
      { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 } // H S I A
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Absensi KKN");
    XLSX.writeFile(wb, `Absensi_KKN_Damarjati_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.xlsx`);
  };

  // --- Halaman Login Admin ---
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full glass-panel p-8 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-extrabold text-emerald-900 mb-2">Dashboard Admin</h1>
          <p className="text-emerald-700 text-sm mb-6">Masukkan PIN untuk melanjutkan</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Masukkan PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full glass-input text-center text-xl tracking-widest"
              required
            />
            <button type="submit" className="w-full glass-button">
              Masuk
            </button>
          </form>
          <Link href="/" className="block mt-4 text-sm text-emerald-600 hover:underline">
            ← Kembali ke Absensi
          </Link>
        </div>
      </main>
    );
  }

  // --- Halaman Dashboard Admin ---
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-full">
        {/* Header */}
        <div className="glass-panel p-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-900">
              📋 Rekap Absensi KKN
            </h1>
            <p className="text-emerald-700 mt-1">Desa Damarjati • 26 Juli - 3 September 2026 (40 Hari)</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAttendances}
              className="glass-button !py-2 !px-4 text-sm"
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={exportToExcel}
              className="glass-button !py-2 !px-4 text-sm bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              📥 Export Excel
            </button>
            <a
              href={SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button !py-2 !px-4 text-sm bg-gradient-to-r from-green-500 to-emerald-600"
            >
              📊 Buka Spreadsheet
            </a>
            <Link href="/" className="glass-button !py-2 !px-4 text-sm bg-gradient-to-r from-gray-400 to-gray-500">
              ← Form Absen
            </Link>
          </div>
        </div>

        {/* Legenda Keterangan */}
        <div className="glass-panel p-4 mb-6 flex flex-wrap gap-3">
          <span className="text-sm font-bold text-emerald-900 mr-2">Keterangan:</span>
          {[["H", "Hadir", "bg-emerald-200 text-emerald-800"], ["S", "Sakit", "bg-yellow-200 text-yellow-800"], ["I", "Izin", "bg-blue-200 text-blue-800"], ["A", "Alpha", "bg-red-200 text-red-800"]].map(([key, label, style]) => (
            <span key={key} className={`px-3 py-1 rounded-full text-xs font-bold ${style}`}>{key} = {label}</span>
          ))}
        </div>

        {/* Tabel Absensi */}
        {loading ? (
          <div className="glass-panel p-12 text-center">
            <div className="text-4xl mb-4 animate-spin inline-block">⏳</div>
            <p className="text-emerald-800 font-bold">Memuat data dari Google Sheets...</p>
          </div>
        ) : (
          <div className="glass-panel p-2 md:p-4 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-emerald-600/20">
                  <th className="sticky left-0 bg-emerald-100 z-20 px-3 py-3 text-left font-bold text-emerald-900 border border-emerald-200 min-w-[130px] md:min-w-[160px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]">
                    Nama Anggota
                  </th>
                  {dates.map((d, i) => (
                    <th key={i} className="px-1 md:px-2 py-2 text-center font-bold text-emerald-800 border border-emerald-200 min-w-[36px] text-[10px] md:text-xs">
                      {d.getDate()}
                    </th>
                  ))}
                  <th className="px-2 md:px-3 py-2 text-center font-bold text-emerald-800 border border-emerald-200 bg-emerald-50 min-w-[40px] md:min-w-[50px]">H</th>
                  <th className="px-2 md:px-3 py-2 text-center font-bold text-yellow-700 border border-emerald-200 bg-yellow-50 min-w-[40px] md:min-w-[50px]">S</th>
                  <th className="px-2 md:px-3 py-2 text-center font-bold text-blue-700 border border-emerald-200 bg-blue-50 min-w-[40px] md:min-w-[50px]">I</th>
                  <th className="px-2 md:px-3 py-2 text-center font-bold text-red-700 border border-emerald-200 bg-red-50 min-w-[40px] md:min-w-[50px]">A</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => (
                  <tr key={member.id} className={idx % 2 === 0 ? "bg-white/50" : "bg-emerald-50/50"}>
                    <td className={`sticky left-0 z-10 px-2 md:px-3 py-2 font-semibold text-emerald-900 border border-emerald-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] ${idx % 2 === 0 ? "bg-white" : "bg-emerald-50"}`}>
                      <div className="text-sm md:text-base">{idx + 1}. {member.name}</div>
                      <div className="text-[10px] md:text-xs text-emerald-600 font-normal">{member.role}</div>
                    </td>
                    {dates.map((d, i) => {
                      const status = getStatus(member.name, d);
                      return (
                        <td key={i} className="px-1 py-2 text-center border border-emerald-100">
                          <span className={`inline-block w-7 h-7 rounded-md text-xs flex items-center justify-center ${getStatusStyle(status)}`}>
                            {status}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center border border-emerald-200 bg-emerald-50 font-bold text-emerald-700">
                      {countStatus(member.name, "H")}
                    </td>
                    <td className="px-2 py-2 text-center border border-emerald-200 bg-yellow-50 font-bold text-yellow-700">
                      {countStatus(member.name, "S")}
                    </td>
                    <td className="px-2 py-2 text-center border border-emerald-200 bg-blue-50 font-bold text-blue-700">
                      {countStatus(member.name, "I")}
                    </td>
                    <td className="px-2 py-2 text-center border border-emerald-200 bg-red-50 font-bold text-red-700">
                      {countStatus(member.name, "A")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-emerald-600 mt-4">
          Data diambil langsung dari Google Sheets. Klik Refresh untuk memperbarui.
        </p>
      </div>
    </main>
  );
}
