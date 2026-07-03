export default function Home() {
  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>🚗 Dream Garage Lite</h1>

      <p>整備工場向け AI業務支援システム</p>

      <hr />

      <h2>現在の開発状況</h2>

      <ul>
        <li>✅ Next.js 起動</li>
        <li>⬜ NestJS</li>
        <li>⬜ PostgreSQL</li>
        <li>⬜ Prisma</li>
        <li>⬜ OCR</li>
        <li>⬜ OpenAI</li>
        <li>⬜ Gemini</li>
      </ul>

      <hr />

      <button>車検証OCR（準備中）</button>

      <button style={{ marginLeft: "10px" }}>
        顧客管理（準備中）
      </button>
    </main>
  );
}