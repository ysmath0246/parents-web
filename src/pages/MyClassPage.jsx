// src/pages/MyClassPage.jsx
import { useState } from "react";
import PointsPage from "./PointsPage";
import BooksPage from "./BooksPage";

export default function MyClassPage() {
  const [tab, setTab] = useState("points");

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>📚 내 아이 수업 현황</h1>

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setTab("points")}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            backgroundColor: tab === "points" ? "#007bff" : "#f0f0f0",
            color: tab === "points" ? "#fff" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          포인트
        </button>
        <button
          onClick={() => setTab("books")}
          style={{
            padding: "8px 16px",
            backgroundColor: tab === "books" ? "#007bff" : "#f0f0f0",
            color: tab === "books" ? "#fff" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          문제집
        </button>
      </div>

      {tab === "points" && <PointsPage />}
      {tab === "books" && <BooksPage />}
    </div>
  );
}
