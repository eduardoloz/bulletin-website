// src/components/Chatbot.jsx
import { useState, useEffect } from "react";
import "./Chatbot.css";
import ApiService from "../api/apiService";

export default function Chatbot() {
  const [profList,  setProfList]  = useState([]); 
  const [profId,    setProfId]    = useState("");
  const [question,  setQuestion]  = useState("");
  const [answer,    setAnswer]    = useState("");
  const [loading,   setLoading]   = useState(false);

  // Fetch the professor list on mount
  useEffect(() => {
    const loadProfessors = async () => {
      try {
        const data = await ApiService.getProfessors();
        const sortedData = data.sort((a, b) => a.prof_name.localeCompare(b.prof_name));
        setProfList(sortedData);
      } catch (err) {
      }
    };
    
    loadProfessors();
  }, []);

  const ask = async (e) => {
    e.preventDefault();
    if (!profId) {
      setAnswer("Please select a professor.");
      return;
    }
    setLoading(true);
    setAnswer("");

    try {
      const data = await ApiService.sendChatMessage(profId, question);
      setAnswer(data.answer || data.error);
    } catch (err) {
      setAnswer("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot">
      <h2>Professor Chat</h2>
      <form onSubmit={ask}>
        <label>
          Select Professor:
          <select
            value={profId}
            onChange={e => setProfId(e.target.value)}
            required
          >
            <option value="">-- choose one --</option>
            {profList.map(p => (
              <option key={p.prof_id} value={p.prof_id}>
                {p.prof_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Your Question:
          <textarea
            placeholder="e.g. Is grading tough?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={4} // you can adjust this
            required
            />

        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {answer && (
        <div className="answer">
          {answer}
        </div>
      )}
    </div>
  );
}
