import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation
} from 'react-router-dom';
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getDocs, collection } from "firebase/firestore";

import LoginPage from "./pages/LoginPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import NoticesPage from "./pages/NoticesPage.jsx";
import NoticeDetailPage from "./pages/NoticeDetailPage.jsx";
import MyClassPage from "./pages/MyClassPage.jsx";
import './App.css';

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("studentId")));
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const location = useLocation();

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("studentId")));
    };
    window.addEventListener("storage", checkLogin);
    return () => {
      window.removeEventListener("storage", checkLogin);
    };
  }, []);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("studentId")));
  }, [location]);

 
useEffect(() => {
  const studentId = localStorage.getItem("studentId");
  if (!studentId) return;

  const checkNewItems = async () => {
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(today.getDate() - 3); // 최근 3일 이내 기준

    const commentsSnap = await getDocs(collection(db, "comments"));
    const booksSnap = await getDocs(collection(db, "books"));

    const recentComment = commentsSnap.docs.some(doc => {
      const data = doc.data();
      return data.studentId === studentId &&
             new Date(data.createdAt || data.date) >= cutoff;
    });

    const recentBook = booksSnap.docs.some(doc => {
      const data = doc.data();
      return data.studentId === studentId &&
             new Date(data.createdAt || data.completedDate) >= cutoff;
    });

    setHasNewCommentOrBook(recentComment || recentBook);
  };

  checkNewItems();
}, []);
  // ✅ 자동 로그아웃 타이머
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.clear();
        setIsLoggedIn(false);
        window.location.hash = "#/login";
        alert("1시간 동안 활동이 없어 자동 로그아웃되었습니다.");
      }, 60 * 60 * 1000); // 1시간 = 3600000ms
    };

    if (isLoggedIn) {
      const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
      events.forEach(event => window.addEventListener(event, resetTimer));
      resetTimer();

      return () => {
        clearTimeout(timer);
        events.forEach(event => window.removeEventListener(event, resetTimer));
      };
    }
  }, [isLoggedIn]);

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
const [hasNewCommentOrBook, setHasNewCommentOrBook] = useState(false);



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
        {[ "/attendance", "/payment", "/notices", "/myclass" ].map((path) => (
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
      position: "relative",
      display: "inline-block"
    })}
  >
    {{
      "/attendance": "출석",
      "/payment": "결제",
      "/notices": "공지사항",
      "/myclass": (
        <>
          내아이수업현황
          {hasNewCommentOrBook && (
           <span className="pulse wiggle"
  style={{
    position: "absolute",
    top: -8,
    right: -12,
    backgroundColor: "red",
    color: "white",
    borderRadius: "12px",
    padding: "2px 6px",
    fontSize: "10px",
    fontWeight: "bold",
    fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', sans-serif",
  }}
>
  🔥 새글
</span>

          )}
        </>
      ),
    }[path]}
  </NavLink>
))}



          <button
            onClick={() => setShowChangePw(true)}
            style={{
              marginLeft: 20,
              padding: "6px 12px",
              border: "none",
              borderRadius: 4,
              backgroundColor: "#f0f0f0",
              cursor: "pointer",
            }}
          >
            PIN 변경
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              setIsLoggedIn(false);
              window.location.hash = "#/login";
            }}
            style={{
              marginLeft: 8,
              padding: "6px 12px",
              border: "none",
              borderRadius: 4,
              backgroundColor: "#f0f0f0",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>

          {showChangePw && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 20,
                  borderRadius: 8,
                  width: 300,
                }}
              >
                <h2>PIN 변경</h2>
                <input
                  type="text"
                  maxLength={4}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value.replace(/\D/g, ""))}
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
  {/* ① 빈 경로(/parents-web/)를 잡아줄 인덱스 라우트 */}
       <Route 
         index 
         element={
           isLoggedIn 
             ? <Navigate to="notices" replace />
             : <Navigate to="login" replace />
         }
       />
    {/* ② 로그인 경로 (슬래시 제거!) */}
      <Route path="login"     element={<LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />} />
  {/* ③ 나머지 경로들도 모두 선행 슬래시(/) 없이 정의 */}
      <Route path="attendance" element={isLoggedIn ? <AttendancePage />   : <Navigate to="login" replace />} />
      <Route path="payment"    element={isLoggedIn ? <PaymentPage />      : <Navigate to="login" replace />} />
      <Route path="notices"    element={isLoggedIn ? <NoticesPage />      : <Navigate to="login" replace />} />
      <Route path="notices/:id"element={isLoggedIn ? <NoticeDetailPage />: <Navigate to="login" replace />} />
      <Route path="myclass"    element={isLoggedIn ? <MyClassPage />      : <Navigate to="login" replace />} />
      {/* ④ 그 외 모든 경로는 루트(index)로 리다이렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
           </Routes>
    </div>
  );
}
