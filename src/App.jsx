import { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Link,
  Navigate
} from 'react-router-dom';
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';


import LoginPage from "./pages/LoginPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import PointsPage from "./pages/PointsPage.jsx";
import NoticesPage from "./pages/NoticesPage.jsx";
import HolidaysPage from "./pages/HolidaysPage.jsx";
import NoticeDetailPage from "./pages/NoticeDetailPage.jsx";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("studentId")));
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/notices");
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("studentId")));
    };

    window.addEventListener("storage", checkLogin);
    return () => {
      window.removeEventListener("storage", checkLogin);
    };
  }, []);

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
    <HashRouter>
      <div>
        {isLoggedIn && (
          <nav style={{ padding: 10, textAlign: "center" }}>
            <Link to="/attendance" style={{ marginRight: 10 }}>출석</Link>
            <Link to="/payment" style={{ marginRight: 10 }}>결제</Link>
            <Link to="/points" style={{ marginRight: 10 }}>포인트</Link>
            <Link to="/notices" style={{ marginRight: 10 }}>공지사항</Link>
            <Link to="/holidays" style={{ marginRight: 10 }}>휴일</Link>

            <button onClick={() => setShowChangePw(true)} style={{ marginLeft: 10 }}>
              PIN 변경
            </button>
            <button onClick={() => {
              localStorage.clear();
              setIsLoggedIn(false);
              window.location.href = "/parent-web/#/login";
            }} style={{ marginLeft: 10 }}>
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
            isLoggedIn ? <Navigate to="/notices/" /> : <Navigate to="/login" />
          } />
           <Route path="/" element={<Navigate to="/notices" />} />   {/* ✅ 추가 */}
          <Route path="/attendance" element={isLoggedIn ? <AttendancePage /> : <Navigate to="/login" />} />
          <Route path="/payment" element={isLoggedIn ? <PaymentPage /> : <Navigate to="/login" />} />
          <Route path="/points" element={isLoggedIn ? <PointsPage /> : <Navigate to="/login" />} />
          <Route path="/notices" element={isLoggedIn ? <NoticesPage /> : <Navigate to="/login" />} />
          <Route path="/notices/:id" element={isLoggedIn ? <NoticeDetailPage /> : <Navigate to="/login" />} />
          <Route path="/holidays" element={isLoggedIn ? <HolidaysPage /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
