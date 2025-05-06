// src/pages/PointsPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "../components/ui/table";

export default function PointsPage() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(list);
    });

    return () => unsub();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "24px" }}>📖 포인트 관리 페이지 📖</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>학생 이름</TableHead>
            {/* 포인트 항목 헤더 */}
            {students.length > 0 &&
              Object.keys(students[0].points || {}).map((key) => (
                <TableHead key={key}>{key}</TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((stu) => (
            <TableRow key={stu.id}>
              <TableCell>{stu.name}</TableCell>
              {/* 카테고리별 포인트 렌더링 */}
              {(stu.points ? Object.entries(stu.points) : []).map(
                ([field, value]) => (
                  <TableCell key={field}>{value}</TableCell>
                )
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
