"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { members } from "../data/members";
import * as faceapi from "face-api.js";

// Rumus Haversine untuk menghitung jarak antar koordinat dalam meter
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

export default function Home() {
  const [selectedMember, setSelectedMember] = useState("");
  const [status, setStatus] = useState("H"); // Default ke "H" (Hadir)
  const [photo, setPhoto] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        setModelsLoaded(true);
      } catch (err) {
        console.error("Gagal memuat model pendeteksi wajah", err);
      }
    };
    loadModels();
  }, []);

  // Matikan kamera jika komponen dilepas atau status berubah bukan Hadir
  useEffect(() => {
    if (status !== "H") {
      stopCamera();
      setPhoto(null);
    }
    return () => stopCamera();
  }, [status]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      
      // Munculkan elemen video di UI terlebih dahulu
      setCameraActive(true);
      setPhoto(null);

      // Tunggu sejenak agar React selesai merender elemen <video ref={videoRef}>
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
      
      // Ambil lokasi GPS secara background
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          (err) => console.log("GPS tidak diizinkan atau gagal:", err),
          { enableHighAccuracy: true }
        );
      }
      
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      toast.error("Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin di browser.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // --- KOMPRESI UKURAN FOTO ---
      // Batasi resolusi maksimal agar ukuran file kecil (misal 640x480)
      const MAX_WIDTH = 640;
      const MAX_HEIGHT = 480;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);
      
      // --- TAMBAHAN WATERMARK WAKTU ---
      const now = new Date();
      const timeStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + 
                      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Latar belakang semi-transparan
      ctx.fillRect(0, height - 70, width, 70); 
      
      ctx.fillStyle = "white";
      ctx.textAlign = "right";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("KKN DAMARJATI", width - 10, height - 48);
      
      ctx.font = "14px sans-serif";
      if (userLocation) {
        ctx.fillText(`GPS: ${userLocation.lat.toFixed(5)}, ${userLocation.lon.toFixed(5)}`, width - 10, height - 28);
      } else {
        ctx.fillText("GPS: Mencari lokasi...", width - 10, height - 28);
      }
      ctx.fillText(timeStr, width - 10, height - 10);
      
      // Kompresi kualitas JPEG (0.6 artinya 60% kualitas)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      setPhoto(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast.error("Pilih nama terlebih dahulu!");
      return;
    }
    
    // Foto dan Lokasi hanya diwajibkan jika statusnya Hadir (H)
    if (status === "H") {
      if (!photo) {
        toast.error("Untuk absen Hadir, wajib mengambil foto bukti!");
        return;
      }
      
      if (!userLocation) {
        toast.error("Sistem sedang melacak lokasi Anda. Pastikan GPS menyala dan izin lokasi diberikan, lalu coba lagi dalam beberapa detik.");
        return;
      }

      // Validasi Jarak Geofencing (Maksimal 100 meter dari Posko)
      const POSKO_LAT = -6.7026771;
      const POSKO_LON = 110.7472901;
      const distance = getDistanceFromLatLonInM(userLocation.lat, userLocation.lon, POSKO_LAT, POSKO_LON);

      if (distance > 100) {
        toast.error(`Anda berada di luar zona absen! Jarak Anda: ${Math.round(distance)} meter dari Posko (Maks 100m). Silakan mendekat ke posko.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // ✅ CEK DUPLIKAT: ambil data hari ini dari Google Sheets dulu
      const rekapRes = await fetch("/api/rekap", { cache: "no-store" });
      const rekapJson = await rekapRes.json();

      if (rekapJson.success && rekapJson.data) {
        const todayStr = (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        })();

        const sudahAbsen = rekapJson.data.some(a => {
          const d = new Date(a.timestamp);
          const rowDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          return a.nama === selectedMember && rowDate === todayStr;
        });

        if (sudahAbsen) {
          toast.error(`${selectedMember} sudah absen hari ini!\nTidak bisa absen 2 kali dalam 1 hari.`, { duration: 5000 });
          setIsSubmitting(false);
          return;
        }
      }

      // Fungsi untuk mengirim data ke API
      const sendData = async (base64Photo) => {
        const response = await fetch("/api/absen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nama: selectedMember,
            status: status,
            foto: base64Photo
          })
        });

        const data = await response.json();

        if (data.success) {
          setIsSubmitting(false);
          setSuccess(true);
          toast.success("Absensi Berhasil Tersimpan!");

          setTimeout(() => {
            setSuccess(false);
            setSelectedMember("");
            setPhoto(null);
            setStatus("H");
          }, 3000);
        } else {
          toast.error("Gagal mengirim data. Coba lagi.");
          setIsSubmitting(false);
        }
      };

      // Jika ada foto, konversi ke Base64 dulu
      // Jika ada foto, deteksi wajah dulu sebelum dikonversi
      if (photo) {
        if (!modelsLoaded) {
          toast.error("Sistem masih memuat model AI (pendeteksi wajah). Silakan tunggu sebentar.");
          setIsSubmitting(false);
          return;
        }

        const imgElement = document.createElement("img");
        imgElement.src = photo; // photo sekarang sudah berupa base64 string

        imgElement.onload = async () => {
          try {
            // Proses deteksi wajah dengan tingkat sensitivitas (scoreThreshold) diturunkan
            // Defaultnya 0.5, kita turunkan ke 0.3 agar lebih toleran terhadap cahaya kurang/kamera buram
            const detection = await faceapi.detectSingleFace(
              imgElement, 
              new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
            );

            if (!detection) {
              toast.error("Wajah tidak terdeteksi! Pastikan Anda mengambil foto selfie yang jelas.");
              setIsSubmitting(false);
              return; // Batal kirim
            }

            // Wajah terdeteksi! Lanjutkan kirim data
            await sendData(photo);

          } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan saat memproses deteksi wajah.");
            setIsSubmitting(false);
          }
        };
      } else {
        // Jika tidak ada foto (untuk Izin, Sakit, Alpha), langsung kirim
        await sendData("");
      }

    } catch (error) {
      toast.error("Terjadi kesalahan jaringan/sistem.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-emerald-900 mb-2">Absensi KKN</h1>
          <p className="text-emerald-700 font-medium">Desa Damarjati</p>
        </div>

        {success ? (
          <div className="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-6 rounded-xl text-center mb-4 transition-all">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-bold">Absensi Berhasil Tersimpan!</p>
            <p className="text-sm mt-1">Data telah terkirim ke Google Sheets.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-emerald-900 font-bold mb-2">Nama Anggota</label>
              <select 
                className="w-full glass-input"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                required
              >
                <option value="" disabled>-- Pilih Nama Anda --</option>
                {members.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-emerald-900 font-bold mb-2">Keterangan</label>
              <select 
                className="w-full glass-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                <option value="H">Hadir</option>
                <option value="S">Sakit</option>
                <option value="I">Izin</option>
                <option value="A">Alpha</option>
              </select>
            </div>

            {/* Input Foto (Hanya tampil jika status "H") */}
            {status === "H" && (
              <div>
                <label className="block text-emerald-900 font-bold mb-2">
                  Foto Bukti (Selfie di Posko)
                  {!modelsLoaded && (
                    <span className="text-yellow-600 text-sm ml-2 font-normal">
                      ⏳ Memuat AI deteksi wajah...
                    </span>
                  )}
                </label>
                <div className="w-full glass-input flex flex-col items-center justify-center border-dashed border-2 p-4 text-center">
                  {!cameraActive && !photo ? (
                    <button type="button" onClick={startCamera} className="glass-button !py-2 !px-4 text-sm bg-emerald-600">
                      📷 Buka Kamera
                    </button>
                  ) : null}

                  {cameraActive && !photo ? (
                    <div className="flex flex-col items-center w-full">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-w-sm rounded-lg shadow-md bg-black mb-3" />
                      <button type="button" onClick={capturePhoto} className="glass-button !py-3 !px-6 text-md font-bold bg-emerald-600 w-full max-w-sm">
                        📸 Jepret Foto
                      </button>
                    </div>
                  ) : null}

                  {photo ? (
                    <div className="flex flex-col items-center w-full">
                      <img src={photo} alt="Hasil Foto" className="w-full max-w-sm rounded-lg shadow-md mb-3" />
                      <button type="button" onClick={retakePhoto} className="glass-button !py-2 !px-4 text-sm bg-yellow-500 w-full max-w-sm text-yellow-900">
                        🔄 Foto Ulang
                      </button>
                    </div>
                  ) : null}
                  
                  {/* Canvas tersembunyi untuk mengambil gambar */}
                  <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full glass-button mt-4 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Mengirim Data...' : 'Kirim Absensi'}
            </button>
          </form>
        )}

        {/* Link ke halaman admin */}
        <div className="mt-8 pt-6 border-t border-emerald-200/50 text-center">
          <Link href="/admin" className="text-emerald-700 hover:text-emerald-900 text-sm font-medium hover:underline flex items-center justify-center gap-2 transition-colors">
            <span>⚙️</span> Masuk sebagai Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
