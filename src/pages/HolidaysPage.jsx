// src/pages/HolidaysPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "holidays"));
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 16 }}>
      <h1>휴일 목록</h1>
      <ul>
        {holidays.map(h => (
          <li key={h.id} style={{ margin: "4px 0" }}>
            {h.name} — <span style={{ color: "red" }}>{h.date}</span> {/* ✅ 날짜만 빨간색 */}
          </li>
        ))}
        {holidays.length === 0 && <p>등록된 휴일이 없습니다.</p>}
      </ul>
    </div>
  );
}
