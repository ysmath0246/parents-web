// src/pages/EnrollPage.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase"; // ✅ 프로젝트 스타일로 가져오기 (CommentsPage와 동일)
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export default function EnrollPage() {
  // 그룹(초등부 / 중등부)
  const [group, setGroup] = useState("elementary"); // "elementary" | "middle"

  // 표에서 클릭한 현재 커서 슬롯
  const [cursor, setCursor] = useState(null); // { day, time } | null

  // 선택 상태
  const [selectedApplied, setSelectedApplied] = useState([]);   // [{day,time}]
  const [selectedWaitlist, setSelectedWaitlist] = useState([]); // [{day,time}]

  // 로그인에서 가져온 studentId로 students/{studentId}에서 자동으로 이름 조회
  const [studentName, setStudentName] = useState("");

  // 인원수 집계 (enrollments 컬렉션 기준)
  const [countsApplied, setCountsApplied] = useState({});   // key: `${day}|${time}` -> number
  const [countsWaitlist, setCountsWaitlist] = useState({}); // key: `${day}|${time}` -> number

  // 저장된 문서 실시간 표시용 (enrollments_by_student/{학생이름})
  const [savedApplied, setSavedApplied] = useState([]);     // [{day,time,group}]
  const [savedWaitlist, setSavedWaitlist] = useState([]);   // [{day,time,group}]
  const [lastUpdated, setLastUpdated] = useState(null);

  // 시간표
  const schedules = useMemo(
    () => ({
      elementary: {
        화: ["2시", "3시", "4시"],
        수: ["2시", "3시", "4시"],
        목: ["2시", "3시", "4시"],
        금: ["3시", "4시"],
      },
      middle: {
        월: ["3시30분", "5시", "6시30분"],
        화: ["5시", "6시30분"],
        수: ["5시", "6시30분"],
        목: ["5시", "6시30분"],
        금: ["5시", "6시30분"],
      },
    }),
    []
  );

  const labelByGroup = { elementary: "초등부", middle: "중등부" };
  const currentTable = schedules[group];

  // (A) studentId로 students/{studentId}에서 이름 1회 조회 (앱 로그인 시 localStorage에 저장된 studentId 사용)
  useEffect(() => {
    const studentId = localStorage.getItem("studentId"); // App.jsx에서 쓰던 것과 동일
    if (!studentId) return;
    getDoc(doc(db, "students", studentId))
      .then((snap) => {
        const data = snap.data();
        if (data?.name) setStudentName(String(data.name));
      })
      .catch(() => {});
  }, []);

  // (B) 신청/대기 인원 수 실시간 구독 (현재 group만)
  useEffect(() => {
    const qAll = query(collection(db, "enrollments"), where("group", "==", group));
    const unsub = onSnapshot(qAll, (snap) => {
      const applied = {};
      const wait = {};
      snap.forEach((d) => {
        const data = d.data();
        const key = `${data.day}|${data.time}`;
        if (data.status === "waitlist") {
          wait[key] = (wait[key] || 0) + 1;
        } else {
          applied[key] = (applied[key] || 0) + 1; // status 없으면 신청으로 간주
        }
      });
      setCountsApplied(applied);
      setCountsWaitlist(wait);
    });
    return () => unsub();
  }, [group]);

  // (C) 학생 이름이 결정되면 enrollments_by_student/{학생이름}를 실시간 구독
 // (C) 학생 이름이 결정되면 enrollments_by_student/{학생이름}를 실시간 구독
useEffect(() => {
  if (!studentName.trim()) {
    setSavedApplied([]);
    setSavedWaitlist([]);
    setSelectedApplied([]);   // 초기화
    setSelectedWaitlist([]);  // 초기화
    setLastUpdated(null);
    return;
  }

  const ref = doc(db, "enrollments_by_student", studentName.trim());
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const appliedList = Array.isArray(data.applied) ? data.applied : [];
      const waitList = Array.isArray(data.waitlist) ? data.waitlist : [];

      // 저장된 값 상태 업데이트
      setSavedApplied(appliedList);
      setSavedWaitlist(waitList);
      setLastUpdated(data.updatedAt?.toDate?.() || null);

      // ✅ 선택 상태에도 자동 반영
      setSelectedApplied(appliedList.map(({ day, time, status }) => ({ day, time, status })));
      setSelectedWaitlist(waitList.map(({ day, time }) => ({ day, time })));
    } else {
      setSavedApplied([]);
      setSavedWaitlist([]);
      setSelectedApplied([]);
      setSelectedWaitlist([]);
      setLastUpdated(null);
    }
  });
  return () => unsub();
}, [studentName]);

  // ====== 헬퍼 ======
  const keyOf = (d, t) => `${d}|${t}`;
  const existsIn = (arr, d, t) => arr.some((s) => s.day === d && s.time === t);

 // 신청 추가(최대 2개, 같은 요일 1개만) — 정원/예비/대기 분기 + 안내 문구
const addApplied = () => {
  if (!cursor) return;
  const { day, time } = cursor;
  const k = keyOf(day, time);
  const currentCount = countsApplied[k] || 0; // waitlist 제외(=신청+예비)

  // 이미 신청에 있으면 제거(토글)
  if (existsIn(selectedApplied, day, time)) {
    setSelectedApplied(selectedApplied.filter((s) => !(s.day === day && s.time === time)));
    return;
  }

  // 상태/안내 문구 결정
  let status = "applied";
  let message = "신청되었습니다.";
  if (currentCount >= 6 && currentCount < 8) {
    status = "reserve";
    message = "현재 6명까지 신청되었습니다.\n7,8번째 신청자는 예비신청자입니다.";
  } else if (currentCount >= 8) {
    status = "waitlist";
    message = "현재 정원이 가득 찼습니다. 대기로 신청하세요.";
  }

  // 대기 구간이면 곧장 대기로 보냄
  if (status === "waitlist") {
    alert(message);
    addWaitlist();
    return;
  }

  // 최대 2개 제한
  if (selectedApplied.length >= 2) {
    alert("신청은 최대 2개까지만 선택할 수 있어요.");
    return;
  }

  // 같은 요일은 교체
  const idxSameDay = selectedApplied.findIndex((s) => s.day === day);
  if (idxSameDay !== -1) {
    const next = [...selectedApplied];
    next[idxSameDay] = { day, time, status };
    setSelectedApplied(next);
  } else {
    setSelectedApplied([...selectedApplied, { day, time, status }]);
  }

  // 대기에 같은 슬롯이 있으면 제거
  if (existsIn(selectedWaitlist, day, time)) {
    setSelectedWaitlist(selectedWaitlist.filter((s) => !(s.day === day && s.time === time)));
  }

  alert(message);
};


  // 대기 추가(무제한, 중복 방지)
  const addWaitlist = () => {
    if (!cursor) return;
    const { day, time } = cursor;

    // 이미 대기에 있으면 토글 제거
    if (existsIn(selectedWaitlist, day, time)) {
      setSelectedWaitlist(selectedWaitlist.filter((s) => !(s.day === day && s.time === time)));
      return;
    }

    // 신청에 같은 슬롯 있으면 대기 추가 전에 제거
    if (existsIn(selectedApplied, day, time)) {
      setSelectedApplied(selectedApplied.filter((s) => !(s.day === day && s.time === time)));
    }

    setSelectedWaitlist([...selectedWaitlist, { day, time }]);
  };

  const removeApplied = (day, time) =>
    setSelectedApplied(selectedApplied.filter((s) => !(s.day === day && s.time === time)));
  const removeWaitlist = (day, time) =>
    setSelectedWaitlist(selectedWaitlist.filter((s) => !(s.day === day && s.time === time)));

  // ====== 저장 (학생이름을 문서 ID로, 그리고 counts 집계용 엔트리도 함께 갱신) ======
  const saveSelections = async () => {
    if (!studentName.trim()) {
      alert("학생 정보 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (selectedApplied.length === 0 && selectedWaitlist.length === 0) {
      alert("선택된 시간대가 없습니다.");
      return;
    }

    const batch = writeBatch(db);

    // 1) 학생별 요약문서(enrollments_by_student/{학생이름}) 덮어쓰기
const refStudent = doc(db, "enrollments_by_student", studentName.trim());
batch.set(refStudent, {
  studentName: studentName.trim(),
  applied: selectedApplied.map(({ day, time, status }) => ({
    day,
    time,
    group,
    status,                // applied | reserve
    label: status === "reserve" ? "신청(예비)" : "신청"
  })),
  waitlist: selectedWaitlist.map(({ day, time }) => ({
    day,
    time,
    group,
    status: "waitlist",
    label: "대기"
  })),
  updatedAt: serverTimestamp(),
});


    // 2) counts 집계를 위해 사용하는 원천 컬렉션(enrollments)을 학생 단위로 밀어넣기 전에
    //    먼저 이 학생의 기존 엔트리를 모두 삭제 (applied/waitlist 전체 초기화)
    const qMe = query(collection(db, "enrollments"), where("studentName", "==", studentName.trim()));
    const prev = await getDocs(qMe);
    prev.forEach((snap) => batch.delete(snap.ref));

   // 3) 새 선택을 enrollments에 재기록 (인원수 실시간 집계용)
selectedApplied.forEach(({ day, time, status }) => {
  const safeStatus = status === "reserve" ? "reserve" : "applied";
  const id = `${studentName.trim()}|${group}|${day}|${time}|${safeStatus}`;
  const r = doc(db, "enrollments", id);
  batch.set(r, {
    studentName: studentName.trim(),
    group,
    day,
    time,
    status: safeStatus, // applied | reserve
    createdAt: serverTimestamp(),
  });
});

selectedWaitlist.forEach(({ day, time }) => {
  const id = `${studentName.trim()}|${group}|${day}|${time}|waitlist`;
  const r = doc(db, "enrollments", id);
  batch.set(r, {
    studentName: studentName.trim(),
    group,
    day,
    time,
    status: "waitlist",
    createdAt: serverTimestamp(),
  });
});

  
    await batch.commit();
    alert("저장되었습니다.");
  };

  // ====== 렌더 ======
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>수강신청</h2>

      {/* 그룹 토글 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["elementary", "middle"].map((g) => {
          const active = group === g;
          return (
            <button
              key={g}
              onClick={() => {
                setGroup(g);
                setCursor(null);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${active ? "#0d6efd" : "#ddd"}`,
                background: active ? "#0d6efd" : "#fff",
                color: active ? "#fff" : "#333",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {labelByGroup[g]}
            </button>
          );
        })}
      </div>

      {/* 표 */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 560,
            border: "1px solid #e5e7eb",
          }}
        >
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid #e5e7eb",
                  fontWeight: 700,
                  width: 90,
                  whiteSpace: "nowrap",
                }}
              >
                요일
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid #e5e7eb",
                  fontWeight: 700,
                }}
              >
                시간 (신청 / 대기)
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(currentTable).map(([day, times]) => (
              <tr key={day}>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #f1f5f9",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {day}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {times.map((t) => {
                      const k = keyOf(day, t);
                      const aCnt = countsApplied[k] || 0;
                      const wCnt = countsWaitlist[k] || 0;
                      const isCursor = cursor && cursor.day === day && cursor.time === t;
                      const isAppliedSel = existsIn(selectedApplied, day, t);
                      const isWaitSel = existsIn(selectedWaitlist, day, t);
                      return (
                        <button
                          key={`${day}-${t}`}
                          onClick={() =>
                            setCursor(isCursor ? null : { day, time: t })
                          }
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: `1px solid ${isCursor ? "#0d6efd" : "#d1d5db"}`,
                            background: isCursor ? "#e7f1ff" : "#fff",
                            color: "#111827",
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                          title={`${day} ${t}`}
                        >
                          {t}
                          <span style={{ color: "#6b7280", fontWeight: 500, marginLeft: 6 }}>
                            (신청 {aCnt} / 대기 {wCnt})
                          </span>
                          {isAppliedSel && (
                            <span style={{ marginLeft: 6, fontSize: 12, color: "#0d6efd" }}>
                              • 신청선택됨
                            </span>
                          )}
                          {isWaitSel && (
                            <span style={{ marginLeft: 6, fontSize: 12, color: "#6c757d" }}>
                              • 대기선택됨
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 커서 대상 + 신청/대기 추가 + 저장 버튼 */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 220, color: "#374151" }}>
          {cursor ? (
            <span>
              선택 대상: <b>{cursor.day}</b> <b>{cursor.time}</b>
            </span>
          ) : (
            <span style={{ color: "#6b7280" }}>표에서 시간대를 먼저 선택하세요</span>
          )}
        </div>
        <button
          disabled={!cursor}
          onClick={addApplied}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #0d6efd",
            background: cursor ? "#0d6efd" : "#e5e7eb",
            color: cursor ? "#fff" : "#9ca3af",
            fontWeight: 700,
            cursor: cursor ? "pointer" : "not-allowed",
          }}
        >
          신청 추가(최대 2)
        </button>
        <button
          disabled={!cursor}
          onClick={addWaitlist}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #6c757d",
            background: cursor ? "#6c757d" : "#e5e7eb",
            color: cursor ? "#fff" : "#9ca3af",
            fontWeight: 700,
            cursor: cursor ? "pointer" : "not-allowed",
          }}
        >
          대기 추가(무제한)
        </button>

        {/* 저장 버튼 (학생이름 자동) */}
        <button
          onClick={saveSelections}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #0d6efd",
            background: "#0d6efd",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          저장
        </button>
      </div>

      {/* 현재 선택 목록 */}
      <div style={{ marginTop: 16, display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>신청 선택(최대 2)</div>
          {selectedApplied.length === 0 ? (
            <div style={{ color: "#6b7280" }}>없음</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
             {selectedApplied.map(({ day, time, status }) => (
  <span
    key={`ap-${day}-${time}`}
    style={{
      padding: "6px 10px",
      borderRadius: 999,
      border: `1px solid ${status === "reserve" ? "#6c757d" : "#0d6efd"}`, // 예비=회색
      background: status === "reserve" ? "#f1f1f1" : "#e7f1ff",           // 예비=연회색 배경
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    }}
    title={status === "reserve" ? "신청(예비)" : "신청"}
  >
    {day} {time}{status === "reserve" ? " (예비)" : ""}
    <button
      onClick={() => removeApplied(day, time)}
      title="제거"
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontWeight: 700,
        color: status === "reserve" ? "#6c757d" : "#0d6efd",
      }}
    >
      ×
    </button>
  </span>
))}

            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>대기 선택(무제한)</div>
          {selectedWaitlist.length === 0 ? (
            <div style={{ color: "#6b7280" }}>없음</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selectedWaitlist.map(({ day, time }) => (
                <span
                  key={`wt-${day}-${time}`}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #6c757d",
                    background: "#f1f1f1",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {day} {time}
                  <button
                    onClick={() => removeWaitlist(day, time)}
                    title="제거"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontWeight: 700,
                      color: "#6c757d",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 저장된 내용(실시간 표시) */}
      <div style={{ marginTop: 20, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          저장된 내용 {studentName ? `: ${studentName}` : ""}
        </div>
        {!studentName ? (
          <div style={{ color: "#6b7280" }}>학생 정보 로딩 중…</div>
        ) : (
          <>
           <div style={{ marginBottom: 4 }}>
  <b>신청:</b>{" "}
  {savedApplied.length
    ? savedApplied
        .map((s) => {
          const g = s.group === "elementary" ? "초등부" : "중등부";
          const tag = s.status === "reserve" || s?.label === "신청(예비)" ? " (예비)" : "";
          return `${g} ${s.day} ${s.time}${tag}`;
        })
        .join(", ")
    : <span style={{ color:"#6b7280" }}>없음</span>}
</div>

            <div><b>대기:</b>{" "}
              {savedWaitlist.length
                ? savedWaitlist.map((s) => `${s.group === "elementary" ? "초등부" : "중등부"} ${s.day} ${s.time}`).join(", ")
                : <span style={{ color:"#6b7280" }}>없음</span>}
            </div>
            {lastUpdated && (
              <div style={{ marginTop: 6, fontSize: 12, color:"#6b7280" }}>
                업데이트: {lastUpdated.toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
