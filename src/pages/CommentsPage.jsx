import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState({}); // 각 코멘트별 답변 텍스트
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState("");
  const studentId = localStorage.getItem("studentId");

  useEffect(() => {
    const ref = collection(db, "comments");
    return onSnapshot(ref, (snapshot) => {
      const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const myComments = all.filter((c) => c.studentId === studentId);
      setComments(myComments.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    });
  }, [studentId]);

  const handleReply = async (commentId) => {
    const replyText = replies[commentId]?.trim();
    if (!replyText) return alert("답변을 입력해주세요!");

    
 // ✅ Firestore에서 학생 이름 조회
  const studentDoc = await getDoc(doc(db, "students", studentId));
  const studentName = studentDoc.exists() ? studentDoc.data().name : "이름없음";


    await addDoc(collection(db, "comments"), {
      studentId,
      name: studentName, // ✅ 학생 이름 저장      
      comment: `답변:${replyText}`,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      parentId: commentId
    });

    setReplies((prev) => ({ ...prev, [commentId]: "" }));
    alert("답변이 저장되었습니다!");
  };

  const handleDeleteReply = async (id) => {
    if (window.confirm("정말 이 답변을 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "comments", id));
    }
  };

  const handleUpdateReply = async (id) => {
    if (!editedReplyText.trim()) return alert("수정할 답변을 입력하세요!");
    await updateDoc(doc(db, "comments", id), {
      comment: `답변:${editedReplyText}`,
    });
    setEditingReplyId(null);
    setEditedReplyText("");
  };

  return (
    <div className="container" style={{ textAlign: "center", marginTop: "40px" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>📝 저장된 코멘트</h2>
      <h3 style={{ fontSize: "15px", marginBottom: "16px" }}>** 한달에 한번정도 코멘트 나갑니다! ** </h3>
      <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
        {comments
          .filter(c => !c.comment.startsWith("답변:"))
          .map((c) => {
            const relatedReplies = comments.filter(r => r.parentId === c.id);

            return (
              <li key={c.id} style={{ marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
                <div>
                  {c.comment} <span style={{ color: "#888", fontSize: "12px" }}>({c.date})</span>
                </div>
                <div style={{ fontSize: "12px", color: "#aaa" }}>
                  저장시간: {c.createdAt?.slice(0, 19).replace("T", " ")}
                </div>

                {relatedReplies.map((r) => (
                  <div key={r.id} style={{ marginTop: 4, marginLeft: 10, background: "#f8f8f8", padding: "4px 8px", borderRadius: 4 }}>
                    {editingReplyId === r.id ? (
                      <>
                        <input
                          value={editedReplyText}
                          onChange={(e) => setEditedReplyText(e.target.value)}
                          style={{ width: "60%", padding: 4 }}
                        />
                        <button onClick={() => handleUpdateReply(r.id)} style={{ marginLeft: 8 }}>저장</button>
                        <button onClick={() => setEditingReplyId(null)} style={{ marginLeft: 4 }}>취소</button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: "13px", color: "#333" }}>💬 {r.comment.replace("답변:", "")}</div>
                        <div style={{ marginTop: 4 }}>
                          <button onClick={() => { setEditingReplyId(r.id); setEditedReplyText(r.comment.replace("답변:", "")); }} style={{ marginRight: 6 }}>수정</button>
                          <button onClick={() => handleDeleteReply(r.id)}>삭제</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <div style={{ marginTop: 8 }}>
                  <input
                    placeholder="답변 입력"
                    value={replies[c.id] || ""}
                    onChange={(e) =>
                      setReplies((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    style={{ width: "70%", padding: 4 }}
                  />
                  <button
                    onClick={() => handleReply(c.id)}
                    style={{ marginLeft: 8, padding: "4px 12px" }}
                  >
                    저장
                  </button>
                </div>
              </li>
            );
          })}
        {comments.filter(c => !c.comment.startsWith("답변:")).length === 0 && (
          <li style={{ color: "#888" }}>등록된 코멘트가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
