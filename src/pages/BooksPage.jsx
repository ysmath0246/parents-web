// src/pages/BooksPage.jsx
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const studentId = localStorage.getItem("studentId");

  useEffect(() => {
    const ref = collection(db, "books");
    return onSnapshot(ref, (qs) => {
      const allBooks = qs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const myBooks = allBooks.filter((b) => b.studentId === studentId);
      setBooks(myBooks);
    });
  }, [studentId]);

  const handleDownload = () => {
    const headers = ["이름", "학년", "책 제목", "완료일"];
    const rows = books.map((b) => [b.name, b.grade, b.title, b.completedDate]);
    let csv = headers.join(",") + "\n";
    rows.forEach((r) => {
      csv += r.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `문제집목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
<div className="container">
        <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>📚 문제집 관리</h1>

      <button
        onClick={handleDownload}
        style={{
          padding: "8px 16px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        엑셀 다운로드
      </button>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>이름</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>학년</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>책 제목</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>완료일</th>
          </tr>
        </thead>
        <tbody>
          {books.length > 0 ? (
            books.map((b) => (
              <tr key={b.id}>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{b.name}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{b.grade}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{b.title}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{b.completedDate}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                등록된 데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
