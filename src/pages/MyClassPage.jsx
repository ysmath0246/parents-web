// src/pages/MyClassPage.jsx
import { useState } from "react";
import PointsPage from "./PointsPage";
import BooksPage from "./BooksPage";
import CommentPage from "./CommentsPage";

export default function MyClassPage() {
  const [tab, setTab] = useState("comments");

  return (
    <div className="container" style={{ textAlign: "center", marginTop: "40px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>📚 내 아이 수업 현황</h1>

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setTab("comments")}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            backgroundColor: tab === "comments" ? "#007bff" : "#f0f0f0",
            color: tab === "comments" ? "#fff" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          코멘트
        </button>
        <button
          onClick={() => setTab("books")}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            backgroundColor: tab === "books" ? "#007bff" : "#f0f0f0",
            color: tab === "books" ? "#fff" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          문제집
        </button>
        <button
          onClick={() => setTab("points")}
          style={{
            padding: "8px 16px",
            backgroundColor: tab === "points" ? "#007bff" : "#f0f0f0",
            color: tab === "points" ? "#fff" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          포인트
        </button>
      </div>

      {tab === "comments" && <CommentPage />}
      {tab === "books" && <BooksPage />}
      {tab === "points" && <PointsPage />}
    </div>
  );
}
