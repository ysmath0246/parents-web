// src/pages/AttendancePage.jsx
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { doc, getDocs, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import { generateScheduleWithRollovers } from "../firebase/logic";

export default function AttendancePage() {
  const studentId = localStorage.getItem("studentId");
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [makeups, setMakeups] = useState([]);
  const [extraHolidays, setExtraHolidays] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!studentId) return;

    const unsub = onSnapshot(doc(db, "students", studentId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStudent({ id: docSnap.id, ...data });
      }
    });

    (async () => {
      const snap = await getDocs(collection(db, "attendance"));
      const data = {};
      snap.docs.forEach(docSnap => {
        data[docSnap.id] = docSnap.data();
      });
      setAttendance(data);
    })();

    (async () => {
      const snap = await getDocs(collection(db, "makeups"));
      setMakeups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    })();

    (async () => {
      const snap = await getDocs(collection(db, "holidays"));
      setExtraHolidays(snap.docs.map(d => d.data().date));
    })();

    return () => unsub();
  }, [studentId]);

  useEffect(() => {
    const rebuildLessons = async () => {
      if (!student) return;

      const days = student.schedules.map(s => s.day);
      const cycleSize = days.length * 4;
      const totalTarget = cycleSize * 10;
      const allHolidays = [...extraHolidays];

      let raw = generateScheduleWithRollovers(student.startDate, days, totalTarget * 2, allHolidays);

      const startDateDay = new Date(student.startDate).getDay();
      const hasStartDay = days.includes(startDateDay);

      if (hasStartDay && (!raw.length || raw[0].date !== student.startDate)) {
        console.log(`✅ 첫날(${student.startDate})이 요일에 맞아서 추가됨`);
        raw.unshift({ date: student.startDate });
      } else {
        console.log(`ℹ️ 첫날(${student.startDate})은 이미 포함됨 or 요일 안 맞음`);
      }

      const filtered = raw.filter(l => !allHolidays.includes(l.date));

      const baseLessons = filtered.map((l, idx) => {
        const att = attendance?.[l.date]?.[student.name];
        let status = att?.status || '미정';
        let time = att?.time || '';
        return { date: l.date, status, time, originalIndex: idx };
      });

      const studentMakeups = makeups.filter(m => m.name === student.name);
      const rollovers = studentMakeups.filter(m => m.type === '이월');
      const clinics = studentMakeups.filter(m => m.type === '보강');
      const extras = [];

      for (const m of rollovers) {
        const origin = baseLessons.find(l => l.date === m.sourceDate);
        if (origin) origin.status = '이월';
        if (m.date) {
          extras.push({ date: m.date, status: '미정', time: '', originalIndex: -1 });
        }
      }

      for (const m of clinics) {
        if (m.date && !baseLessons.find(l => l.date === m.date && l.status === '보강')) {
          extras.push({ date: m.date, status: '보강', time: '', originalIndex: -1 });
        }
      }

      let merged = [...baseLessons, ...extras].sort((a, b) => a.date.localeCompare(b.date));
      const existingKeys = new Set(merged.map(l => l.date + '-' + l.originalIndex));
      let lastDate = merged.length > 0 ? merged.at(-1).date : student.startDate;

      while (true) {
        const normalCount = merged.filter(m => m.status !== '이월').length;
        if (normalCount >= totalTarget) break;
        const next = generateScheduleWithRollovers(lastDate, days, 1, allHolidays).find(d => {
          const key = d.date + '-' + d.originalIndex;
          return !existingKeys.has(key);
        });
        if (!next) break;
        lastDate = next.date;
        existingKeys.add(next.date + '-' + next.originalIndex);
        merged.push({ date: next.date, status: '미정', time: '', originalIndex: next.originalIndex });
      }

      const reindexed = [];
      let count = 1;
      for (let l of merged) {
        reindexed.push({ ...l, session: l.status === '이월' ? 'X' : count++ });
        if (count > cycleSize) count = 1;
      }

      setSessions(reindexed);
    };

    rebuildLessons();
  }, [student, attendance, makeups, extraHolidays]);

  if (!student) return <p>로딩 중…</p>;

  return (
<div className="container" style={{ textAlign: "center", fontSize: "18px" }}>       
   <h1 style={{ fontSize: "24px" }}>📅 출석 확인 </h1>
        <Calendar
        // 달력 전체를 부모의 textAlign:center 에 맞춰 중앙에 배치
        style={{ display: "block", margin: "0 auto" }}
        tileContent={({ date, view }) => {
          if (view !== "month") return null;
          const d = format(date, "yyyy-MM-dd");
          const ses = sessions.find(s => s.date === d);

          let bgColor = "";
          if (ses?.status === '보강') {
            bgColor = 'yellowgreen';
          } else if (ses?.status === '이월') {
            bgColor = 'skyblue';
          } else if (['출석', 'onTime'].includes(ses?.status)) {
            bgColor = 'green';
          } else if  (['지각', 'tardy'].includes(ses?.status)) {
            bgColor = '#ff9800';
          } else if (ses?.status === '결석') {
            bgColor = '#f44336';
          } else if (extraHolidays.includes(d)) {
            bgColor = 'red';
          }

          const today = new Date();
          const isToday = date.toDateString() === today.toDateString();

          return ses ? (
            <div style={{
              background: bgColor ? bgColor : (isToday ? 'yellow' : ''),
              color: 'black',
              borderRadius: 4,
              padding: 2,
              fontSize: 12,
              textAlign: 'center',
            }}>
              <div>{`${ses.session}회차`}</div>
              {ses.time && (
                <div style={{ fontSize: 10 }}>
                  {ses.time}
                </div>
              )}
            </div>
          ) : isToday ? (
            <div style={{
              background: 'yellow',
              borderRadius: 4,
              padding: 2,
              fontSize: 12,
              textAlign: 'center',
            }}></div>
          ) : null;
        }}
        onClickDay={(value) => {
          const d = format(value, "yyyy-MM-dd");
          const ses = sessions.find(s => s.date === d);
          if (ses) {
            alert(`📅 ${d} → ${ses.session}회차 (${ses.status})`);
          } else {
            alert(`📅 ${d} → 출석 기록 없음`);
          }
        }}
      />

      <p style={{ marginTop: 12, fontSize: 14 }}>
        • 색상 설명:<br />
        출석(초록), 지각(주황), 결석(빨강), 보강(연두), 이월(하늘), 오늘(노랑)
      </p>
    </div>
  );
}
