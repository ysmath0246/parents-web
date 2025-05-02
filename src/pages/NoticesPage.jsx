import  { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [noticeDetails, setNoticeDetails] = useState({});

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "notices"));
      setNotices(snap.docs.map(d => ({ id: d.id, title: d.data().title, date: d.data().date })));
    })();
  }, []);

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    if (!noticeDetails[id]) {
      const snap = await getDoc(doc(db, "notices", id));
      if (snap.exists()) {
        setNoticeDetails(prev => ({ ...prev, [id]: snap.data().content }));
      }
    }

    setExpandedId(id);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1>공지사항</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {notices.map(n => (
          <li key={n.id} style={{ margin: "8px 0", borderBottom: "1px solid #ccc", paddingBottom: 8 }}>
            <div
              onClick={() => toggleExpand(n.id)}
              style={{ cursor: "pointer", fontWeight: "bold" }}
            >
              {n.title} ({n.date})
            </div>
            {expandedId === n.id && (
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                {noticeDetails[n.id] || "불러오는 중..."}
              </div>
            )}
          </li>
        ))}
        {notices.length === 0 && <p>등록된 공지사항이 없습니다.</p>}
      </ul>
    </div>
  );
}
