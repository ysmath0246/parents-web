// src/pages/NoticeDetailPage.jsx
import { useState, useEffect } from "react";
import { db }                         from "../firebase";
import { doc, getDoc }                from "firebase/firestore";
import { useParams, Link }            from "react-router-dom";

export default function NoticeDetailPage() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "notices", id));
      if (snap.exists()) setNotice({ id: snap.id, ...snap.data() });
    })();
  }, [id]);

  if (!notice) return <p>공지사항을 불러오는 중…</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1>{notice.title}</h1>
      <p><strong>날짜:</strong> {notice.date}</p>
      <div style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
        {notice.content}
      </div>
      <p style={{ marginTop: 24 }}>
        <Link to="/notices">← 목록으로 돌아가기</Link>
      </p>
    </div>
  );
}
