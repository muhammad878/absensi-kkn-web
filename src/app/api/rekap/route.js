import { NextResponse } from 'next/server';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRraeQK_asZVf1XjmFcG3T_ZKDzvUp7-8qL_q_pkAzmK0qYJB9GILgKCnC0mRQ2diBUw/exec";

export async function GET() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAll`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store", // Selalu ambil data terbaru
    });

    const text = await response.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch (_) {
      return NextResponse.json({ success: false, error: "Response bukan JSON", raw: text }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data || [] });

  } catch (error) {
    console.error("Error fetching attendance:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
