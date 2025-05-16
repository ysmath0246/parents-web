// src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function LoginPage({ onLoginSuccess }) {
  const [birthId, setBirthId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [rememberInputs, setRememberInputs] = useState(true); // ✅ 자동입력 기억하기 체크 상태
  const navigate = useNavigate();

  // 🔁 저장된 입력값 불러오기
  useEffect(() => {
    const savedBirth = localStorage.getItem("lastBirthId");
    const savedPin = localStorage.getItem("lastPin");
    if (savedBirth) setBirthId(savedBirth);
    if (savedPin) setPin(savedPin);
  }, []);

  const handleLogin = async () => {
    setError("");
    if (birthId.trim().length !== 6 || pin.trim().length !== 4) {
      setError("생년월일 6자리와 전화번호 뒤 4자리를 입력해주세요.");
      return;
    }

    try {
      const q = query(collection(db, "students"), where("birth", ">=", ""));
      const snap = await getDocs(q);

      const matchedStudent = snap.docs.find(docSnap => {
        const data = docSnap.data();
        const studentBirth = data.birth?.replace(/[^0-9]/g, "");
        const parentPhone = data.parentPhone?.replace(/[^0-9]/g, "");
        const idMatch = studentBirth?.slice(-6) === birthId.trim();
        const expectedPin = parentPhone ? parentPhone.slice(-4) : null;
        const pinMatch = expectedPin === pin.trim();
        return idMatch && pinMatch;
      });

      if (matchedStudent) {
        const data = matchedStudent.data();
        const studentId = matchedStudent.id;

        localStorage.setItem("studentId", studentId);
        localStorage.setItem("studentName", data.name);

        // ✅ 입력값 저장 여부
        if (rememberInputs) {
          localStorage.setItem("lastBirthId", birthId);
          localStorage.setItem("lastPin", pin);
        } else {
          localStorage.removeItem("lastBirthId");
          localStorage.removeItem("lastPin");
        }

        // ✅ 로그인 기록 저장
        await addDoc(collection(db, "parentLogins"), {
          studentName: data.name,
          loginTime: new Date().toISOString()
        });

        if (onLoginSuccess) onLoginSuccess();
        navigate("/attendance");

      } else {
        setError("아이디 또는 비밀번호가 일치하지 않습니다.");
      }
    } catch (e) {
      setError("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="container" style={{ textAlign: "center" }}>
      <h1 style={{ fontSize: "24px" }}>학부모 로그인</h1>
      <input
        style={{ width: "100%", padding: 8, margin: "8px 0" }}
        value={birthId}
        onChange={e => {
          const val = e.target.value.replace(/\D/g, "");
          setBirthId(val);
          if (rememberInputs) localStorage.setItem("lastBirthId", val);
        }}
        placeholder="자녀 생년월일 6자리 (예: 170806)"
        maxLength={6}
      />
      <input
        style={{ width: "100%", padding: 8, margin: "8px 0" }}
        value={pin}
        onChange={e => {
          const val = e.target.value.replace(/\D/g, "");
          setPin(val);
          if (rememberInputs) localStorage.setItem("lastPin", val);
        }}
        placeholder="전화번호 뒤 4자리"
        maxLength={4}
        type="password"
      />
      <div style={{ margin: "8px 0", textAlign: "left" }}>
        <label>
          <input
            type="checkbox"
            checked={rememberInputs}
            onChange={e => setRememberInputs(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          자동입력 기억하기
        </label>
      </div>
      <button
        style={{ width: "100%", padding: 8, margin: "8px 0" }}
        onClick={handleLogin}
      >
        로그인
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
