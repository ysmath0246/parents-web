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
const list = snap.docs.map((d) => ({
  id: d.id,
  title: d.data().title,
  date: d.data().date,
}));

// 📌 날짜 기준 내림차순 정렬 (최신 공지가 위로)
list.sort((a, b) => b.date.localeCompare(a.date));

setNotices(list);

    })();

      (async () => {
      const snap = await getDocs(collection(db, "holidays"));
      const now = new Date();

      // 🟢 이번 달, 이전 달, 다음 달 YYYY-MM 문자열 배열 생성
      const fmt = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const thisMonth = fmt(now);
      const prevMonth = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const nextMonth = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      const months = [prevMonth, thisMonth, nextMonth];

        setHolidays(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          // 🟢 세 달치만 필터링
          .filter((h) => months.some((m) => h.date.startsWith(m)))
          // 🟢 날짜(문자열 YYYY-MM-DD) 기준 오름차순 정렬
          .sort((a, b) => a.date.localeCompare(b.date))
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
    <div className="container">
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
               <div style={{ marginTop: 8 }}>
               {noticeDetails[n.id] ? (
                 <div
                   dangerouslySetInnerHTML={{ __html: noticeDetails[n.id] }}
                 />
               ) : (
                 "불러오는 중..."
               )}
             </div>
            )}
          </li>
        ))}
        {notices.length === 0 && <p>등록된 공지사항이 없습니다.</p>}
      </ul>
    </div>
  );
}
