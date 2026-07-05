"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("取得中...");

  useEffect(() => {
    fetch("http://localhost:3001/api/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(`${data.system} Ver.${data.version} (${data.status})`);
      })
      .catch(() => {
        setStatus("API接続失敗");
      });
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>🚗 Dream Garage Lite</h1>

      <p>整備工場向け AI業務支援システム</p>

      <hr />

      <h2>現在の開発状況</h2>

      <ul>
        <li>✅ Next.js 起動</li>
        <li>✅ NestJS 起動</li>
        <li>⬜ PostgreSQL</li>
        <li>⬜ Prisma</li>
        <li>⬜ OCR</li>
        <li>⬜ OpenAI</li>
        <li>⬜ Gemini</li>
      </ul>

      <hr />

      <h2>API状態</h2>

      <p>{status}</p>

      <hr />

      <button>車検証OCR（準備中）</button>

      <button style={{ marginLeft: "10px" }}>
        顧客管理（準備中）
      </button>
    </main>
  );
}