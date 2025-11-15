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
  // 상단 탭: "elementary" | "middle" | "middleClinic" | "operation"
  const [group, setGroup] = useState("elementary");

  // studentId / 이름
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");

  // 표에서 클릭한 현재 커서 슬롯
  const [cursor, setCursor] = useState(null); // { day, time } | null

  // 선택 상태 (화면 아래 "신청 선택 / 대기 선택" 칩)
  const [selectedApplied, setSelectedApplied] = useState([]); // [{day,time, status?}]
  const [selectedWaitlist, setSelectedWaitlist] = useState([]); // [{day,time}]

  // 인원수 집계 (enrollments 컬렉션 기준)
  const [countsApplied, setCountsApplied] = useState({}); // key: `${day}|${time}` -> number
  const [countsWaitlist, setCountsWaitlist] = useState({}); // key: `${day}|${time}` -> number

  // 저장된 문서 실시간 표시용 (enrollments_by_student/{학생이름})
  const [savedApplied, setSavedApplied] = useState([]); // [{day,time,group,status,label}]
  const [savedWaitlist, setSavedWaitlist] = useState([]); // [{day,time,group,status,label}]
  const [lastUpdated, setLastUpdated] = useState(null);

  // ✅ 연산반 희망조사 상태
  const operationOptions = [
    {
      id: "opt1",
      label: "연산반(화·수·목) + 수업 1번(주 1회) 13 + 13 = 26만원",
    },
    {
      id: "opt2",
      label: "연산반(화·수·목) + 수업 2번(주 2회) 13 + 25 = 38만원",
    },
    {
      id: "opt3",
      label: "연산반(화·수·목)만 : 15만원",
    },
  ];
  const labelByOperationId = operationOptions.reduce((acc, o) => {
    acc[o.id] = o.label;
    return acc;
  }, {});

  const [operationChoice, setOperationChoice] = useState(""); // 현재 선택
  const [savedOperation, setSavedOperation] = useState(null); // {studentId, studentName, choice, updatedAt}

  // ✅ 중등부 클리닉 추가 요일 상태
  const weekdays = ["월", "화", "수", "목", "금"];
  const [clinicDaysChoice, setClinicDaysChoice] = useState([]); // ["월", ...]
  const [savedClinic, setSavedClinic] = useState(null); // {studentId, studentName, days, updatedAt}

  // 시간표
  const schedules = useMemo(
    () => ({
      elementary: {
        월: ["2시30분"],
        화: ["3시", "4시"],
        수: ["2시", "3시", "4시"],
        목: ["3시", "4시"],
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

  const labelByGroup = {
    elementary: "초등부",
    middle: "중등부",
    middleClinic: "중등부 클리닉 추가요일",
    operation: "연산반 희망조사",
  };

  // 연산반/클리닉 탭일 때는 시간표를 사용하지 않음
  const currentTable =
    group === "elementary" || group === "middle" ? schedules[group] : null;

  // (A) studentId로 students/{studentId}에서 이름 1회 조회
  useEffect(() => {
    const sid = localStorage.getItem("studentId"); // App.jsx에서 쓰던 것과 동일
    if (!sid) return;
    setStudentId(sid);
    getDoc(doc(db, "students", sid))
      .then((snap) => {
        const data = snap.data();
        if (data?.name) setStudentName(String(data.name));
      })
      .catch(() => {});
  }, []);

  // (B) 신청/대기 인원 수 실시간 구독 (현재 group이 elementary/middle일 때만 의미 있음)
  useEffect(() => {
    if (group === "operation" || group === "middleClinic") {
      // 연산반/클리닉 탭에서는 인원 집계 필요 없음
      setCountsApplied({});
      setCountsWaitlist({});
      return;
    }

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
  useEffect(() => {
    if (!studentName.trim()) {
      setSavedApplied([]);
      setSavedWaitlist([]);
      setSelectedApplied([]);
      setSelectedWaitlist([]);
      setLastUpdated(null);
      return;
    }

    const ref = doc(db, "enrollments_by_student", studentName.trim());
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const appliedList = Array.isArray(data.applied) ? data.applied : [];
        const waitList = Array.isArray(data.waitlist) ? data.waitlist : [];

        setSavedApplied(appliedList);
        setSavedWaitlist(waitList);
        setLastUpdated(data.updatedAt?.toDate?.() || null);

        // ✅ 아래 선택 칸에 바로 반영 (재접속해도 보이게)
        setSelectedApplied(
          appliedList.map(({ day, time, status }) => ({ day, time, status }))
        );
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

  // (D) 연산반 희망조사: operation_survey/{studentId} 구독
  useEffect(() => {
    if (!studentId) {
      setSavedOperation(null);
      setOperationChoice("");
      return;
    }

    const ref = doc(db, "operation_survey", studentId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSavedOperation(data);
        setOperationChoice(data.choice || "");
      } else {
        setSavedOperation(null);
        setOperationChoice("");
      }
    });

    return () => unsub();
  }, [studentId]);

  // (E) 중등부 클리닉 추가요일: middle_clinic_days/{studentId} 구독
  useEffect(() => {
    if (!studentId) {
      setSavedClinic(null);
      setClinicDaysChoice([]);
      return;
    }

    const ref = doc(db, "middle_clinic_days", studentId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const days = Array.isArray(data.days) ? data.days : [];
        setSavedClinic(data);
        setClinicDaysChoice(days);
      } else {
        setSavedClinic(null);
        setClinicDaysChoice([]);
      }
    });

    return () => unsub();
  }, [studentId]);

  // ====== 헬퍼 ======
  const keyOf = (d, t) => `${d}|${t}`;
  const existsIn = (arr, d, t) => arr.some((s) => s.day === d && s.time === t);

  // 초등부: 표에서 직접 두 개까지 선택 + 조합(월/수, 화/목, 수/금) 강제
  const toggleElementarySlot = (day, time) => {
    const validPairs = [
      ["월", "수"],
      ["화", "목"],
      ["수", "금"],
    ];

    // 이미 선택되어 있으면 제거
    if (existsIn(selectedApplied, day, time)) {
      setSelectedApplied(
        selectedApplied.filter((s) => !(s.day === day && s.time === time))
      );
      return;
    }

    // ⭐ 0개 선택된 상태 → 첫 번째 선택은 항상 허용
    if (selectedApplied.length === 0) {
      setSelectedApplied([{ day, time }]);
      return;
    }

    // ⭐ 1개 선택된 상태
    if (selectedApplied.length === 1) {
      const first = selectedApplied[0];

      // 같은 요일이면 시간만 교체
      if (first.day === day) {
        setSelectedApplied([{ day, time }]);
        return;
      }

      // 두 요일 조합이 유효한지 검사
      const sortedDays = [first.day, day].sort().join("");
      const isValid = validPairs.some(
        (pair) => pair.slice().sort().join("") === sortedDays
      );

      if (!isValid) {
        alert("초등부는 '월/수', '화/목', '수/금' 조합만 선택할 수 있습니다.");
        return;
      }

      // 유효하면 두 번째 요일 추가
      setSelectedApplied([first, { day, time }]);
      return;
    }

    // ⭐ 이미 2개 선택된 상태
    if (selectedApplied.length >= 2) {
      // 같은 요일이면 시간만 교체 허용
      const idxSameDay = selectedApplied.findIndex((s) => s.day === day);
      if (idxSameDay !== -1) {
        const next = [...selectedApplied];
        next[idxSameDay] = { day, time };
        setSelectedApplied(next);
        return;
      }

      // 제3의 요일을 추가하려는 경우 → 허용 안 함
      alert("초등부는 한 번에 '월/수', '화/목', '수/금' 한 조합만 선택할 수 있습니다.");
      return;
    }
  };

  // 중등부: 요일 제한 없이 최대 2개까지 선택 (표 클릭만으로 토글)
  const toggleMiddleSlot = (day, time) => {
    // 이미 선택되어 있으면 제거
    if (existsIn(selectedApplied, day, time)) {
      setSelectedApplied(
        selectedApplied.filter((s) => !(s.day === day && s.time === time))
      );
      return;
    }

    // 최대 2개 제한
    if (selectedApplied.length >= 2) {
      alert("중등부는 신청 시간대를 최대 2개까지만 선택할 수 있습니다.");
      return;
    }

    // 그냥 추가 (요일 제한 없음)
    setSelectedApplied([...selectedApplied, { day, time }]);
  };

  // 중등부 클리닉: 월~금 중 요일만 선택 (최대 1개)
  const toggleClinicDay = (day) => {
    if (clinicDaysChoice.includes(day)) {
      setClinicDaysChoice(clinicDaysChoice.filter((d) => d !== day));
      return;
    }

    if (clinicDaysChoice.length >= 1) {
      alert("중등부 클리닉 추가 요일은 1개까지만 선택할 수 있습니다.");
      return;
    }

    setClinicDaysChoice([day]);
  };

  // 신청 추가 버튼: 이제 초/중은 안내만 (선택은 전부 표 클릭으로)
  const addApplied = () => {
    if (group === "elementary" || group === "middle") {
      alert(
        "초등부와 중등부는 시간표에서 원하는 시간대를 클릭하여 선택하신 후,\n아래 '저장' 버튼만 눌러 주시면 됩니다."
      );
      return;
    }

    // 연산반/클리닉 탭에서는 사용 안 함
    if (group === "operation" || group === "middleClinic") return;
  };

  // 대기 추가(무제한, 중복 방지) — (지금은 중등에서만 사실상 유효)
  const addWaitlist = () => {
    if (group === "operation" || group === "middleClinic") return;
    if (!cursor) return;
    const { day, time } = cursor;

    // 이미 대기에 있으면 토글 제거
    if (existsIn(selectedWaitlist, day, time)) {
      setSelectedWaitlist(
        selectedWaitlist.filter((s) => !(s.day === day && s.time === time))
      );
      return;
    }

    // 신청에 같은 슬롯 있으면 대기 추가 전에 제거
    if (existsIn(selectedApplied, day, time)) {
      setSelectedApplied(
        selectedApplied.filter((s) => !(s.day === day && s.time === time))
      );
    }

    setSelectedWaitlist([...selectedWaitlist, { day, time }]);
  };

  const removeApplied = (day, time) =>
    setSelectedApplied(
      selectedApplied.filter((s) => !(s.day === day && s.time === time))
    );
  const removeWaitlist = (day, time) =>
    setSelectedWaitlist(
      selectedWaitlist.filter((s) => !(s.day === day && s.time === time))
    );

  // ====== 수강신청 저장 (enrollments / enrollments_by_student) ======
  const saveSelections = async () => {
    if (group === "operation" || group === "middleClinic") return; // 연산/클리닉 탭에서는 사용 안 함

    if (!studentName.trim()) {
      alert("학생 정보 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (selectedApplied.length === 0 && selectedWaitlist.length === 0) {
      alert("선택된 시간대가 없습니다.");
      return;
    }

    // 저장용 변수 (초등/중등 공통 틀)
    let appliedForSave = [...selectedApplied];
    let waitlistForSave = [...selectedWaitlist];

    // ⭐ 초등부 요일 개수 & 인원에 따른 status 자동 배정
    if (group === "elementary") {
      const selectedDays = selectedApplied.map((s) => s.day); // ex: ["월","수"]

      if (selectedDays.length !== 2) {
        alert(
          "초등부는 요일 2개를 선택해 주세요. (월/수, 화/목, 수/금 중 한 조합)"
        );
        return;
      }

      const nextApplied = [];
      const nextWaitlist = [...waitlistForSave];

      selectedApplied.forEach(({ day, time }) => {
        const k = keyOf(day, time);
        const currentCount = countsApplied[k] || 0; // 기존 신청+예비 인원

        if (currentCount >= 8) {
          // 이미 8명 이상이면 → 대기
          nextWaitlist.push({ day, time });
        } else {
          const status = currentCount >= 6 ? "reserve" : "applied"; // 6~7 → 예비
          nextApplied.push({ day, time, status });
        }
      });

      appliedForSave = nextApplied;
      waitlistForSave = nextWaitlist;
    }
    // ⭐ 중등부: 요일 제한 없이 인원에 따라 status 자동 배정
    else if (group === "middle") {
      const nextApplied = [];
      const nextWaitlist = [...waitlistForSave];

      selectedApplied.forEach(({ day, time }) => {
        const k = keyOf(day, time);
        const currentCount = countsApplied[k] || 0; // 기존 신청+예비 인원

        if (currentCount >= 8) {
          // 이미 8명 이상이면 → 대기
          nextWaitlist.push({ day, time });
        } else {
          const status = currentCount >= 6 ? "reserve" : "applied"; // 6~7 → 예비
          nextApplied.push({ day, time, status });
        }
      });

      appliedForSave = nextApplied;
      waitlistForSave = nextWaitlist;
    }

    const batch = writeBatch(db);

    // 1) 학생별 요약문서(enrollments_by_student/{학생이름}) 덮어쓰기
    const refStudent = doc(db, "enrollments_by_student", studentName.trim());
    batch.set(refStudent, {
      studentName: studentName.trim(),
      applied: appliedForSave.map(({ day, time, status }) => ({
        day,
        time,
        group,
        status: status === "reserve" ? "reserve" : "applied", // applied | reserve
        label: status === "reserve" ? "신청(예비)" : "신청",
      })),
      waitlist: waitlistForSave.map(({ day, time }) => ({
        day,
        time,
        group,
        status: "waitlist",
        label: "대기",
      })),
      updatedAt: serverTimestamp(),
    });

    // 2) 이 학생의 기존 enrollments 엔트리 모두 삭제
    const qMe = query(
      collection(db, "enrollments"),
      where("studentName", "==", studentName.trim())
    );
    const prev = await getDocs(qMe);
    prev.forEach((snap) => batch.delete(snap.ref));

    // 3) 새 선택을 enrollments에 재기록 (인원수 실시간 집계용)
    appliedForSave.forEach(({ day, time, status }) => {
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

    waitlistForSave.forEach(({ day, time }) => {
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

    // ✅ 저장 직후, 아래 선택칸에도 바로 반영
    setSelectedApplied(appliedForSave);
    setSelectedWaitlist(waitlistForSave);

    alert("저장되었습니다.");
  };

  // ====== 연산반 희망조사 저장 (operation_survey/{studentId}) ======
  const saveOperationSurvey = async () => {
    if (!studentId || !studentName.trim()) {
      alert("학생 정보 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!operationChoice) {
      alert("연산반 희망 옵션을 선택해 주세요.");
      return;
    }

    const batch = writeBatch(db);
    const ref = doc(db, "operation_survey", studentId);

    batch.set(ref, {
      studentId,
      studentName: studentName.trim(),
      choice: operationChoice,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    alert("연산반 희망 조사가 저장되었습니다.");
  };

  // ====== 중등부 클리닉 추가요일 저장 (middle_clinic_days/{studentId}) ======
  const saveClinicDays = async () => {
    if (!studentId || !studentName.trim()) {
      alert("학생 정보 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!clinicDaysChoice.length) {
      alert("클리닉 추가 요일을 선택해 주세요.");
      return;
    }

    const batch = writeBatch(db);
    const ref = doc(db, "middle_clinic_days", studentId);

    batch.set(ref, {
      studentId,
      studentName: studentName.trim(),
      days: clinicDaysChoice, // 현재는 1개 기준
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    alert("중등부 클리닉 추가 요일이 저장되었습니다.");
  };

  // ====== 렌더 ======
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>수강신청</h2>

      {/* 📌 안내문 영역 */}
            {/* 📌 안내문 영역 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          fontSize: 13,
          lineHeight: 1.5,
          color: "#374151",
        }}
      >
        <p style={{ marginBottom: 6 }}>
          이번 신청은 당장 다음 달이 아닌, <b>2026년 3월 진급 이후</b> 시간표입니다.
        </p>
        <p style={{ marginBottom: 6 }}>
          <b>초등부</b>는 <b>월/수, 화/목, 수/금</b> 중에서 한 조합을 선택해 주시면 됩니다.
          (시간표에서 요일 2개를 선택하신 뒤, 아래 <b>저장</b> 버튼을 눌러 주세요.)
        </p>
        <p style={{ marginBottom: 8 }}>
          전체 정원은 여유가 있으나 <b>각 반 정원은 6명</b>으로 제한되며, 특정 시간에
          신청이 몰릴 경우 시간 조정 요청을 드릴 수 있음을 미리 양해 부탁드립니다.
        </p>

        <hr
          style={{
            border: "none",
            borderTop: "1px dashed #e5e7eb",
            margin: "8px 0",
          }}
        />

        <p style={{ marginBottom: 6 }}>
          <b>📚 중등 정규 수업 및 클리닉(추가 학습) 안내</b>
        </p>
        <p style={{ marginBottom: 6 }}>
          중등반의 <b>정규 수업</b>은 위 시간표에서 요일과 시간을 선택해 신청해 주시면 됩니다.
        </p>
        <p style={{ marginBottom: 6 }}>
          정규 수업과 별도로, 숙제 미이행 보완·학습 태도 보완·개념 반복 및 문제풀이 강화를 위해{" "}
          <b>추가로 등원하는 클리닉(추가 학습) 시간</b>이 있습니다.
          이 클리닉 시간은 <b>정원 제한 없이</b> 운영되므로,
          <b> 나중에 필요하실 때 추가로 신청</b>해 주셔도 괜찮습니다.
        </p>
        <p style={{ marginBottom: 8 }}>
          클리닉(추가 학습) 요일은 상단 탭의{" "}
          <b>‘중등부 클리닉 추가요일’</b> 메뉴에서
          <b> 정규 수업 신청과는 별도로</b> 신청해 주시면 됩니다.
        </p>

        <p style={{ marginBottom: 6 }}>
          <b>🧠 연산반 운영 및 수요조사 안내</b>
        </p>
        <p style={{ marginBottom: 6 }}>
          연산반은 별도로 <b>추가 운영되는 반</b>으로,
          수요 파악을 위해 상단 탭의 <b>‘연산반 희망조사’</b> 메뉴를 통해
          희망하시는 구성을 선택해 주시면 큰 도움이 됩니다.
        </p>
        <p style={{ marginBottom: 0 }}>
          항상 자녀의 성장을 함께 고민하고 노력하겠습니다.
        </p>
      </div>


      {/* 상단 탭: 초등부 / 중등부 / 중등부 클리닉 / 연산반 희망조사 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["elementary", "middle", "middleClinic", "operation"].map((g) => {
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

      {/* ====== 연산반 희망조사 탭 ====== */}
      {group === "operation" ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            background: "#fdfdfd",
          }}
        >
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>연산반 희망조사</h3>
          <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 6 }}>
            아래에서 희망하시는 연산반 수업 방식을 선택해 주세요.
          </p>
          <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 10 }}>
            연산반은 <b>추가로 운영</b>되며, <b>화·수·목 주 3회</b> 진행됩니다.
            각 수업은 <b>50분 수업</b>으로, <b>3시 타임 / 4시 타임</b> 중에서 편성되며{" "}
            <b>최대 정원은 8명</b>입니다.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {operationOptions.map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    operationChoice === opt.id
                      ? "1px solid #0d6efd"
                      : "1px solid #e5e7eb",
                  background: operationChoice === opt.id ? "#e7f1ff" : "#ffffff",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#111827",
                }}
              >
                <input
                  type="radio"
                  name="operation_choice"
                  value={opt.id}
                  checked={operationChoice === opt.id}
                  onChange={() => setOperationChoice(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <button
            onClick={saveOperationSurvey}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #0d6efd",
              background: "#0d6efd",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            연산반 희망 저장
          </button>

          <div
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              저장된 연산반 희망 {studentName ? `: ${studentName}` : ""}
            </div>
            {savedOperation ? (
              <>
                <div style={{ marginBottom: 4 }}>
                  선택:{" "}
                  <b>
                    {labelByOperationId[savedOperation.choice] || "알 수 없는 옵션"}
                  </b>
                </div>
                {savedOperation.updatedAt?.toDate && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    업데이트:{" "}
                    {savedOperation.updatedAt.toDate().toLocaleString()}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "#6b7280" }}>
                아직 저장된 연산반 희망이 없습니다.
              </div>
            )}
          </div>
        </div>
      ) : group === "middleClinic" ? (
        /* ====== 중등부 클리닉 추가요일 탭 ====== */
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            background: "#fdfdfd",
          }}
        >
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>중등부 클리닉 추가요일</h3>
          <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 6 }}>
            중등반 정규 수업과 별도로, <b>추가로 등원하여 공부할 요일</b>을 선택해 주세요.
          </p>
          <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 10 }}>
            이 시간은 <b>숙제 미이행 보완, 개념/문제풀이 클리닉</b>을 위한 시간이며,
            <b> 월·화·수·목·금 중 1일</b>을 선택하실 수 있습니다.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            {weekdays.map((day) => {
              const active = clinicDaysChoice.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleClinicDay(day)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: active ? "1px solid #0d6efd" : "1px solid #e5e7eb",
                    background: active ? "#e7f1ff" : "#ffffff",
                    cursor: "pointer",
                    fontSize: 13,
                    minWidth: 48,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            onClick={saveClinicDays}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #0d6efd",
              background: "#0d6efd",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            클리닉 추가요일 저장
          </button>

          <div
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              저장된 클리닉 추가 요일 {studentName ? `: ${studentName}` : ""}
            </div>
            {savedClinic && Array.isArray(savedClinic.days) && savedClinic.days.length ? (
              <>
                <div style={{ marginBottom: 4 }}>
                  선택 요일: <b>{savedClinic.days.join(", ")}</b>
                </div>
                {savedClinic.updatedAt?.toDate && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    업데이트: {savedClinic.updatedAt.toDate().toLocaleString()}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "#6b7280" }}>
                아직 저장된 클리닉 추가 요일이 없습니다.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ====== 일반 수강신청 탭(초등/중등) ====== */}

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
                {currentTable &&
                  Object.entries(currentTable).map(([day, times]) => (
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
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          {times.map((t) => {
                            const k = keyOf(day, t);
                            const aCnt = countsApplied[k] || 0;
                            const wCnt = countsWaitlist[k] || 0;
                            const isCursor =
                              cursor && cursor.day === day && cursor.time === t;
                            const isAppliedSel = existsIn(
                              selectedApplied,
                              day,
                              t
                            );
                            const isWaitSel = existsIn(
                              selectedWaitlist,
                              day,
                              t
                            );

                            return (
                              <button
                                key={`${day}-${t}`}
                                onClick={() => {
                                  setCursor({ day, time: t });

                                  // 초등부: 조합 제한 + 최대 2개
                                  if (group === "elementary") {
                                    toggleElementarySlot(day, t);
                                  }
                                  // 중등부: 요일 제한 없이 최대 2개
                                  else if (group === "middle") {
                                    toggleMiddleSlot(day, t);
                                  }
                                }}
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 8,
                                  border: `1px solid ${
                                    isAppliedSel ||
                                    isWaitSel ||
                                    isCursor
                                      ? "#0d6efd"
                                      : "#d1d5db"
                                  }`,
                                  background: isAppliedSel
                                    ? "#e7f1ff"
                                    : isWaitSel
                                    ? "#f1f1f1"
                                    : isCursor
                                    ? "#f3f4ff"
                                    : "#fff",
                                  color: "#111827",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                                title={`${day} ${t}`}
                              >
                                {t}
                                <span
                                  style={{
                                    color: "#6b7280",
                                    fontWeight: 500,
                                    marginLeft: 6,
                                  }}
                                >
                                  (신청 {aCnt} / 대기 {wCnt})
                                </span>
                                {isAppliedSel && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      fontSize: 12,
                                      color: "#0d6efd",
                                    }}
                                  >
                                    • 신청선택됨
                                  </span>
                                )}
                                {isWaitSel && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      fontSize: 12,
                                      color: "#6c757d",
                                    }}
                                  >
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
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 220, color: "#374151" }}>
              {cursor ? (
                <span>
                  선택 대상: <b>{cursor.day}</b> <b>{cursor.time}</b>
                </span>
              ) : (
                <span style={{ color: "#6b7280" }}>
                  표에서 시간대를 먼저 선택하세요
                </span>
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
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                신청 선택(최대 2)
              </div>
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
                        border: `1px solid ${
                          status === "reserve" ? "#6c757d" : "#0d6efd"
                        }`, // 예비=회색
                        background:
                          status === "reserve" ? "#f1f1f1" : "#e7f1ff", // 예비=연회색
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      title={status === "reserve" ? "신청(예비)" : "신청"}
                    >
                      {day} {time}
                      {status === "reserve" ? " (예비)" : ""}
                      <button
                        onClick={() => removeApplied(day, time)}
                        title="제거"
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontWeight: 700,
                          color:
                            status === "reserve" ? "#6c757d" : "#0d6efd",
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
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                대기 선택(무제한)
              </div>
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
          <div
            style={{
              marginTop: 20,
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              저장된 내용 {studentName ? `: ${studentName}` : ""}
            </div>
            {!studentName ? (
              <div style={{ color: "#6b7280" }}>학생 정보 로딩 중…</div>
            ) : (
              <>
                <div style={{ marginBottom: 4 }}>
                  <b>신청:</b>{" "}
                  {savedApplied.length ? (
                    savedApplied
                      .map((s) => {
                        const g =
                          s.group === "elementary" ? "초등부" : "중등부";
                        const tag =
                          s.status === "reserve" ||
                          s?.label === "신청(예비)"
                            ? " (예비)"
                            : "";
                        return `${g} ${s.day} ${s.time}${tag}`;
                      })
                      .join(", ")
                  ) : (
                    <span style={{ color: "#6b7280" }}>없음</span>
                  )}
                </div>

                <div>
                  <b>대기:</b>{" "}
                  {savedWaitlist.length ? (
                    savedWaitlist
                      .map(
                        (s) =>
                          `${s.group === "elementary" ? "초등부" : "중등부"} ${
                            s.day
                          } ${s.time}`
                      )
                      .join(", ")
                  ) : (
                    <span style={{ color: "#6b7280" }}>없음</span>
                  )}
                </div>
                {lastUpdated && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    업데이트: {lastUpdated.toLocaleString()}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
