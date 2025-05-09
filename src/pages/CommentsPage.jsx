// src/pages/CommentsPage.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const studentId = localStorage.getItem("studentId");

  useEffect(() => {
    const ref = collection(db, "comments");
    return onSnapshot(ref, (snapshot) => {
      const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const myComments = all.filter((c) => c.studentId === studentId);
      setComments(myComments.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    });
  }, [studentId]);

  return (
    <div className="container" style={{ textAlign: "center", marginTop: "40px" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>📝 저장된 코멘트</h2>
      <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
        {comments.map((c) => (
          <li key={c.id} style={{ marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 4 }}>
            <div>
              {c.comment} <span style={{ color: "#888", fontSize: "12px" }}>({c.date})</span>
            </div>
            <div style={{ fontSize: "12px", color: "#aaa" }}>
              저장시간: {c.createdAt?.slice(0, 19).replace("T", " ")}
            </div>
          </li>
        ))}
        {comments.length === 0 && (
          <li style={{ color: "#888" }}>등록된 코멘트가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
