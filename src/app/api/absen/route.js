import { NextResponse } from 'next/server';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRraeQK_asZVf1XjmFcG3T_ZKDzvUp7-8qL_q_pkAzmK0qYJB9GILgKCnC0mRQ2diBUw/exec";

export async function POST(request) {
  try {
    const data = await request.json();

    // Kirim ke Google Apps Script
    // redirect: "follow" penting agar fetch mengikuti redirect dari Google
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        nama: data.nama,
        status: data.status,
        foto: data.foto || "", // kirim foto jika ada
      }),
    });

    // Google Apps Script kadang mengembalikan teks biasa, bukan JSON
    // Jadi kita baca dulu sebagai teks, lalu coba parse
    const text = await response.text();

    let result = { status: "Sukses" };
    try {
      result = JSON.parse(text);
    } catch (_) {
      // Jika bukan JSON tapi response OK, anggap berhasil
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} - ${text}`);
      }
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error("Error submitting attendance:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
