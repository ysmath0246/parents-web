// src/pages/PointsPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "../components/ui/table";

export default function PointsPage() {
  const studentId = localStorage.getItem("studentId");
  const [me, setMe] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  // 1) 내 정보 가져오기
  useEffect(() => {
    if (!studentId) return;
    const unsub = onSnapshot(
      doc(db, "students", studentId),
      (snap) => {
        if (snap.exists()) {
          setMe({ id: snap.id, ...snap.data() });
        }
      }
    );
    return () => unsub();
  }, [studentId]);

  // 2) 전체 학생 정보 가져오기 (랭킹용)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllStudents(list);
      }
    );
    return () => unsub();
  }, []);

  // 3) 랭킹 계산 (총포인트 내림차순 Top5)
  const ranking = allStudents
    .map(stu => ({
      name: stu.name,
      total: Object.values(stu.points || {}).reduce((sum, v) => sum + (v || 0), 0)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (!me) return <p>로딩 중…</p>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16, textAlign: "center" }}>
      <h1 style={{ fontSize: "24px" }}>📖 포인트 관리</h1>

      {/* —————————— 내 포인트 테이블 —————————— */}
      <h2 style={{ margin: "16px 0" }}>💡 내 포인트</h2>
      <Table>
        <TableHeader>
          <TableRow>
            {Object.keys(me.points || {}).map(key => (
              <TableHead key={key}>{key}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {Object.entries(me.points || {}).map(([field, value]) => (
              <TableCell key={field}>{value}</TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>

      {/* —————————— 전체 랭킹 테이블 —————————— */}
      <h2 style={{ margin: "32px 0 16px" }}>🏆 전체 랭킹 (Top 5)</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>순위</TableHead>
            <TableHead>학생 이름</TableHead>
            <TableHead>총 포인트</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranking.map((item, idx) => (
            <TableRow key={item.name}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
