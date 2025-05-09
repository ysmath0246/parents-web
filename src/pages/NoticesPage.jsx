import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [noticeDetails, setNoticeDetails] = useState({});
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "notices"));
      setNotices(snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title,
        date: d.data().date,
      })));
    })();

    (async () => {
      const snap = await getDocs(collection(db, "holidays"));
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // "YYYY-MM"
      setHolidays(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((h) => h.date.startsWith(thisMonth))
      );
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
        setNoticeDetails((prev) => ({
          ...prev,
          [id]: snap.data().content,
        }));
      }
    }

    setExpandedId(id);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      {/* ✅ 이번 달 휴일 표시 */}
      <div style={{ background: "#f9f9f9", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>📅 이번 달 휴일</h2>
        {holidays.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {holidays.map((h) => (
              <li key={h.id} style={{ marginBottom: "4px" }}>
                {h.name} — <span style={{ color: "red" }}>{h.date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>이번 달 휴일이 없습니다.</p>
        )}
      </div>

      <h1 style={{ fontSize: "24px" }}>📣 공지사항 📣</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {notices.map((n) => (
          <li
            key={n.id}
            style={{
              margin: "8px 0",
              borderBottom: "1px solid #ccc",
              paddingBottom: 8,
            }}
          >
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
