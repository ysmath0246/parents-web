import { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation
} from 'react-router-dom';
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

import LoginPage from "./pages/LoginPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import PointsPage from "./pages/PointsPage.jsx";
import NoticesPage from "./pages/NoticesPage.jsx";
import HolidaysPage from "./pages/HolidaysPage.jsx";
import NoticeDetailPage from "./pages/NoticeDetailPage.jsx";

// ✅ 바깥: 라우터만 감싸는 App
export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

// ✅ 안쪽: 실제 기능 다 있는 AppContent
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("studentId")));
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const location = useLocation();  // ✅ 이제 안전하게 사용 가능

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("studentId")));
    };
    window.addEventListener("storage", checkLogin);
    return () => {
      window.removeEventListener("storage", checkLogin);
    };
  }, []);

  // ✅ 라우터 이동할 때 로그인 상태 다시 확인
  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("studentId")));
  }, [location]);

  async function handlePasswordChange() {
    const studentId = localStorage.getItem("studentId");
    if (!studentId || newPw.length !== 4) {
      alert("PIN은 4자리 숫자로 입력해야 합니다.");
      return;
    }
    try {
      await updateDoc(doc(db, "students", studentId), { pin: newPw });
      alert("PIN이 성공적으로 변경되었습니다.");
      setShowChangePw(false);
      setNewPw("");
    } catch (e) {
      console.error(e);
      alert("PIN 변경 중 오류가 발생했습니다.");
    }
  }

  return (
    <div>
      {isLoggedIn && (
      <nav
        style={{
          position: "sticky",
          top: 0,
          backgroundColor: "#fff",
          padding: "8px 0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 1000,
          textAlign: "center",
        }}
      >
          <NavLink to="/attendance" style={{ marginRight: 10 }}>달력/출석</NavLink>
          <NavLink to="/payment" style={{ marginRight: 10 }}>수업/결제</NavLink>
          <NavLink to="/points" style={{ marginRight: 10 }}>포인트</NavLink>
          <NavLink to="/notices" style={{ marginRight: 10 }}>공지사항</NavLink>
          <NavLink to="/holidays" style={{ marginRight: 10 }}>휴일</NavLink>



                 {/* NavLink 스타일링 (active 시 강조) */}
        {[ "/attendance","/payment","/points","/notices","/holidays" ].map((path, i) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              margin: "0 8px",
              padding: "6px 12px",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#fff" : "#333",
              backgroundColor: isActive ? "#007bff" : "transparent",
            })}
          >
            {{
              "/attendance": "달력/출석",
              "/payment":    "수업/결제",
              "/points":     "포인트",
              "/notices":    "공지사항",
              "/holidays":   "휴일",
            }[path]}
          </NavLink>
        ))}



          <button  onClick={() => setShowChangePw(true)}
          style={{
            marginLeft: 20,
            padding: "6px 12px",
            border: "none",
            borderRadius: 4,
            backgroundColor: "#f0f0f0",
            cursor: "pointer",
          }}>
            PIN 변경
          </button>
          <button onClick={() => {
            localStorage.clear();
            setIsLoggedIn(false);
            window.location.hash = "#/login";
          }} style={{
                        marginLeft: 8,
                        padding: "6px 12px",
                        border: "none",
                        borderRadius: 4,
                        backgroundColor: "#f0f0f0",
                        cursor: "pointer",
                      }}>
            로그아웃
          </button>

          {showChangePw && (
            <div style={{
              position: "fixed", inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{
                background: "#fff", padding: 20,
                borderRadius: 8, width: 300
              }}>
                <h2>PIN 변경</h2>
                <input
                  type="text" maxLength={4}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value.replace(/\D/g, ""))}
                  placeholder="새 PIN (4자리)"
                  style={{ width: "100%", padding: 8, margin: "12px 0" }}
                />
                <div style={{ textAlign: "right" }}>
                  <button onClick={() => setShowChangePw(false)} style={{ marginRight: 8 }}>
                    취소
                  </button>
                  <button onClick={handlePasswordChange}>
                    변경
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />} />
        <Route path="/" element={
          isLoggedIn ? <Navigate to="/notices" replace /> : <Navigate to="/login" replace />
        } />
        <Route path="/attendance" element={isLoggedIn ? <AttendancePage /> : <Navigate to="/login" replace />} />
        <Route path="/payment" element={isLoggedIn ? <PaymentPage /> : <Navigate to="/login" replace />} />
        <Route path="/points" element={isLoggedIn ? <PointsPage /> : <Navigate to="/login" replace />} />
        <Route path="/notices" element={isLoggedIn ? <NoticesPage /> : <Navigate to="/login" replace />} />
        <Route path="/notices/:id" element={isLoggedIn ? <NoticeDetailPage /> : <Navigate to="/login" replace />} />
        <Route path="/holidays" element={isLoggedIn ? <HolidaysPage /> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
