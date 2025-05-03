// src/pages/PaymentPage.jsx
import  { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { collection } from "firebase/firestore";

export default function PaymentPage() {
  const studentId = localStorage.getItem("studentId");
  const [student, setStudent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [currentRoutineIndex, setCurrentRoutineIndex] = useState(0);
  const [selectedPayments, setSelectedPayments] = useState({});
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const paymentMethods = ["계좌이체", "결제선생", "카드"];

  // 기존 루틴별 결제 방법 가져오는 useEffect를 이렇게 개선
  useEffect(() => {
    if (!studentId) return;
  
    const unsub = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        const updates = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.studentId === studentId) {
            updates[data.routineNumber] = data.paymentMethod;
          }
        });
        setSelectedPayments(updates);
      }
    );
  
    return () => unsub();
  }, [studentId]);
  


  useEffect(() => {
    if (!studentId) return;
  
    const unsub = onSnapshot(
      collection(db, "payment_completed"),
      (snapshot) => {
        const statuses = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.studentId === studentId) {
            statuses[data.routineNumber] = data.paymentComplete;
          }
        });
        setPaymentStatuses(statuses);  // 🔥 상태에 저장
      }
    );
  
    return () => unsub();
  }, [studentId]);

  
  useEffect(() => {
    if (!studentId) return;

    const unsubRoutine = onSnapshot(doc(db, "routines", studentId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lessons = data.lessons || [];
        setSessions(lessons);
    
        // ✅ 오늘 날짜가 포함된 루틴 찾기
        const todayStr = new Date().toISOString().slice(0, 10); // '2025-05-04' 형태
    
        // 루틴 묶기
        const routineMap = {};
        lessons.forEach(item => {
          const routineKey = item.routineNumber || 1;
          if (!routineMap[routineKey]) routineMap[routineKey] = [];
          routineMap[routineKey].push(item);
        });
        const routinesArray = Object.values(routineMap).sort((a, b) => a[0].routineNumber - b[0].routineNumber);
    
        // 오늘 날짜가 포함된 루틴 인덱스 찾기
        const foundIndex = routinesArray.findIndex(routine =>
          routine.some(item => item.date === todayStr)
        );
    
        if (foundIndex !== -1) {
          setCurrentRoutineIndex(foundIndex);
        } else {
          // 오늘 포함된 루틴 없으면 기본 0
          setCurrentRoutineIndex(0);
        }
      }
    });
    
    return () => {
      unsubRoutine();
    };
  }, [studentId]);

 const handlePaymentSelect = async (method, routineNum) => {
    setSelectedPayments(prev => ({
      ...prev,
      [routineNum]: method
    }));

    if (studentId && routineNum) {
      try {
       await setDoc(doc(db, "payments", `${studentId}_routine_${routineNum}`), {
  studentId,
  routineNumber: routineNum,
  paymentMethod: method,
  paymentComplete: false,  // ✅ 초기엔 false로 저장
  updatedAt: new Date().toISOString(),
}, { merge: true });

        console.log("✅ 결제방법 저장 완료 (루틴별): ", method, "(루틴:", routineNum, ")");
      } catch (err) {
        console.error("❌ 결제방법 저장 오류: ", err);
      }
    }
};


  if (!student) return <p>로딩 중…</p>;

  const cycleSize = student.schedules?.length ? student.schedules.length * 4 : 8;

// 루틴별로 묶기 (routineNumber로 묶기)
const routineMap = {};
sessions.forEach(item => {
  const routineKey = item.routineNumber || 1;  // 혹시 없으면 기본 1
  if (!routineMap[routineKey]) routineMap[routineKey] = [];
  routineMap[routineKey].push(item);
});
const routines = Object.values(routineMap).sort((a, b) => a[0].routineNumber - b[0].routineNumber);


  const currentRoutine = routines[currentRoutineIndex] || [];
 // ✅ routineNumber 추출
 const routineNumber = currentRoutine.length > 0 ? currentRoutine[0].routineNumber : (currentRoutineIndex + 1);

  // 다음 루틴의 첫 수업일 구하기
  const nextRoutineFirstDate = routines[currentRoutineIndex + 1]?.[0]?.date;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {/* 결제 방법 선택 */}
      <h3 style={{ fontWeight: "bold", marginBottom: 8 }}>결제 방법 선택</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      <button
  className="px-2 py-1 text-xs"
  onClick={() => handlePaymentSelect("계좌이체", routineNumber)}
  style={{
    flex: 1,
    padding: 8,
    background: "#4caf50",
    color: "white",
    borderRadius: 4
  }}
>
  계좌이체
</button>

<button
  className="px-2 py-1 text-xs"
  onClick={() => handlePaymentSelect("결제선생", routineNumber)}
  style={{
    flex: 1,
    padding: 8,
    background: "#2196f3",
    color: "white",
    borderRadius: 4
  }}
>
  결제선생
</button>

<button
  className="px-2 py-1 text-xs"
  onClick={() => handlePaymentSelect("카드", routineNumber)}
  style={{
    flex: 1,
    padding: 8,
    background: "#f44336",
    color: "white",
    borderRadius: 4
  }}
>
  카드
</button>


        
      </div>
      <p style={{ fontSize: 16, marginBottom: 16 }}>
  현재 선택된 결제방법: {selectedPayments[routineNumber] || "없음"}
</p>


      {/* 결제 상태 표시 */}



{/* 첫 줄 */}
<h1 style={{ marginBottom: 8 }}>
  {student.name}님의 수업 루틴 {routineNumber}
</h1>

{/* 둘째 줄 */}
<p style={{ fontSize: 18, marginBottom: 24 }}>
  {paymentStatuses[routineNumber]
    ? "결제완료 되었습니다."
    : "아직 결제전입니다. 수업시작일 전에 결제 부탁드립니다."}
</p>



 

      {/* 표 */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>회차</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>날짜</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>상태</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>시간</th>
          </tr>
        </thead>
        <tbody>
  {currentRoutine.map((s, idx) => (
    <tr key={idx}>
      <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{s.session}</td>
      <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>
        {s.makeupDate ? (
          <div>
            <s>{s.date}</s> ➔ <span>{s.makeupDate}</span>
          </div>
        ) : (
          s.date
        )}
      </td>
      <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{s.status}</td>
      <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{s.time || "-"}</td>
    </tr>
  ))}
  {currentRoutine.length === 0 && (
    <tr>
      <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "#888" }}>
        루틴 데이터가 없습니다.
      </td>
    </tr>
  )}
</tbody>

      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <button
          onClick={() => setCurrentRoutineIndex(prev => Math.max(prev - 1, 0))}
          disabled={currentRoutineIndex === 0}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            background: currentRoutineIndex === 0 ? "#ccc" : "#1565c0",
            color: "white",
            border: "none",
            cursor: currentRoutineIndex === 0 ? "default" : "pointer"
          }}
        >
          이전
        </button>
        <button
          onClick={() => setCurrentRoutineIndex(prev => Math.min(prev + 1, routines.length - 1))}
          disabled={currentRoutineIndex >= routines.length - 1}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            background: currentRoutineIndex >= routines.length - 1 ? "#ccc" : "#1565c0",
            color: "white",
            border: "none",
            cursor: currentRoutineIndex >= routines.length - 1 ? "default" : "pointer"
          }}
        >
          다음
        </button>
      </div>      






      

      {/* 안내문구 */}
      <p style={{ fontSize: 14 }}>
        {nextRoutineFirstDate
          ? `다음 루틴 결제일: ${nextRoutineFirstDate} / 다음 수업시작일입니다. 수업시작일 전에 결제 부탁드립니다.`
          : "다음 루틴 시작일 정보를 불러오지 못했습니다."}
      </p>
    </div>
  );
}
