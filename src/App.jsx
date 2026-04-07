import { useState, useEffect, useMemo, useRef } from "react";

const GOOGLE_CLIENT_ID = "1091054006094-57mjgruhj8djhi2s2e81pah1p1demj65.apps.googleusercontent.com";
const DRIVE_SCOPE      = "https://www.googleapis.com/auth/drive.appdata";
const BACKUP_FILE_NAME = "gut-diary-backup.json";
const GTOKEN_KEY       = "gut-diary-gtoken";

const SYMPTOMS = [
  { value: -1, label: "무반응",     emoji: "⚪", color: "#cbd5e1", sev: 0  },
  { value:  4, label: "쾌변",       emoji: "💚", color: "#22c55e", sev: -1 },
  { value:  1, label: "미묘한불편", emoji: "🟡", color: "#facc15", sev: 1  },
  { value:  5, label: "가스참",     emoji: "🫧", color: "#a78bfa", sev: 1  },
  { value:  6, label: "잔변감",     emoji: "😣", color: "#f472b6", sev: 1  },
  { value:  2, label: "아랫배아픔", emoji: "🟠", color: "#fb923c", sev: 2  },
  { value:  3, label: "설사",       emoji: "🔴", color: "#f87171", sev: 2  },
];

const sym   = (v) => SYMPTOMS.find(s => s.value === v) ?? SYMPTOMS[0];
const sevOf = (v) => sym(v).sev;

function worstVal(syms = []) {
  const active = syms.filter(v => v !== -1);
  if (!active.length) return -1;
  return active.reduce((a, b) => sevOf(b) > sevOf(a) ? b : a);
}

function worstSev(entry) {
  const vals = entry.meals.filter(m => !m.isPrev).flatMap(m => m.symptoms ?? [-1]);
  const active = vals.filter(v => v !== -1);
  if (!active.length) return 0;
  return Math.max(...active.map(sevOf));
}

function displayColor(syms = []) {
  const hasGreen = syms.includes(4);
  const hasRed   = syms.some(v => v === 2 || v === 3);
  if (hasGreen && hasRed) return "#eab308";
  return sym(worstVal(syms)).color;
}

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getChosung(str) {
  return str.split('').map(ch => {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return ch;
    return CHOSUNG[Math.floor(code / 588)];
  }).join('');
}
function matchFood(food, query) {
  if (!query) return false;
  return food.toLowerCase().includes(query.toLowerCase()) || getChosung(food).includes(query);
}

const BASE_MEALS = [
  { key: "dinner_prev", label: "어제 저녁", icon: "🌙", isPrev: true,  fixed: true  },
  { key: "breakfast",   label: "아침",      icon: "☀️",  isPrev: false, fixed: false },
  { key: "lunch",       label: "점심",      icon: "🌤️",  isPrev: false, fixed: false },
  { key: "dinner",      label: "저녁",      icon: "🌙",  isPrev: false, fixed: false },
];

function mkMeal(key, label) { return { key, label, icon: "🍬", isPrev: false, fixed: false, food: "", symptoms: [-1] }; }
function mkBaseMeal(m)      { return { ...m, food: "", symptoms: [-1] }; }
function mkForm(entries = []) {
  const meals = BASE_MEALS.map(mkBaseMeal);
  if (entries.length > 0) {
    const lastDinner = entries[0].meals.find(m => m.key === "dinner");
    if (lastDinner?.food) {
      const idx = meals.findIndex(m => m.key === "dinner_prev");
      if (idx !== -1) meals[idx] = { ...meals[idx], food: lastDinner.food };
    }
  }
  return { date: new Date().toISOString().slice(0, 10), meals, note: "" };
}

function toggleSymptom(current = [], val) {
  if (val === -1) return [-1];
  const without = current.filter(v => v !== -1);
  if (without.includes(val)) {
    const next = without.filter(v => v !== val);
    return next.length ? next : [-1];
  }
  return [...without, val];
}

export default function GutDiary() {
  const [entries, setEntries] = useState(() => {
    try { const s = localStorage.getItem("gut-diary"); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [form, setForm]             = useState(() => {
    try {
      const s = localStorage.getItem("gut-diary");
      const saved = s ? JSON.parse(s) : [];
      return mkForm(saved);
    } catch { return mkForm(); }
  });
  const [editId, setEditId]         = useState(null);
  const [view, setView]             = useState("log");
  const [expandedId, setExpandedId] = useState(null);
  const [flash, setFlash]           = useState("");
  const [googleToken, setGoogleToken] = useState(null);
  const [googleEmail, setGoogleEmail] = useState(null);
  const [backupOpen, setBackupOpen]   = useState(false);
  const backupRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("gut-diary", JSON.stringify(entries)); } catch {}
  }, [entries]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src   = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = async () => {
      const saved = localStorage.getItem(GTOKEN_KEY);
      if (!saved) return;
      try {
        const res  = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${saved}`);
        const info = await res.json();
        if (info.error || !info.email) { localStorage.removeItem(GTOKEN_KEY); return; }
        setGoogleToken(saved);
        setGoogleEmail(info.email);
      } catch { localStorage.removeItem(GTOKEN_KEY); }
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!backupOpen) return;
    function onOutside(e) {
      if (backupRef.current && !backupRef.current.contains(e.target)) setBackupOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [backupOpen]);

  const foodHistory = useMemo(() => {
    const set = new Set();
    entries.forEach(e => e.meals.forEach(m => {
      if (m.food) m.food.split(',').forEach(f => { const t = f.trim(); if (t) set.add(t); });
    }));
    return [...set];
  }, [entries]);

  function updateMeal(idx, field, val) {
    setForm(f => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, [field]: val } : m) }));
  }
  function toggleSym(idx, val) {
    setForm(f => {
      const next = toggleSymptom(f.meals[idx].symptoms, val);
      return { ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, symptoms: next } : m) };
    });
  }
  function addSnack() {
    setForm(f => ({ ...f, meals: [...f.meals, mkMeal(`snack_${Date.now()}`, "간식")] }));
  }
  function removeSnack(idx) {
    setForm(f => ({ ...f, meals: f.meals.filter((_, i) => i !== idx) }));
  }
  function moveUp(idx) {
    setForm(f => {
      const meals = [...f.meals];
      const min = meals.findIndex(m => !m.fixed);
      if (idx <= min) return f;
      [meals[idx-1], meals[idx]] = [meals[idx], meals[idx-1]];
      return { ...f, meals };
    });
  }
  function moveDown(idx) {
    setForm(f => {
      const meals = [...f.meals];
      if (idx >= meals.length-1 || meals[idx].fixed) return f;
      [meals[idx], meals[idx+1]] = [meals[idx+1], meals[idx]];
      return { ...f, meals };
    });
  }
  function handleSave() {
    if (!form.date) return;
    let updated;
    if (editId !== null) {
      updated = entries.map(e => e.id === editId ? { ...form, id: editId } : e);
      setEntries(updated);
      setEditId(null);
    } else {
      const ne = { ...form, id: Date.now() };
      updated = [ne, ...entries].sort((a, b) => b.date.localeCompare(a.date));
      setEntries(updated);
    }
    setFlash("✅ 저장됨!");
    setForm(mkForm(updated));
    setTimeout(() => { setFlash(""); setView("history"); }, 700);
  }
  function handleEdit(entry) {
    setForm({ ...entry, meals: entry.meals.map(m => ({ ...m, symptoms: [...(m.symptoms ?? [-1])] })) });
    setEditId(entry.id);
    setView("log");
  }
  function handleDelete(id) {
    setEntries(es => es.filter(e => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  }
  function handleExport() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `gut-diary-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e, mode) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) { alert("❌ 올바른 파일이 아니야"); return; }
        if (mode === "overwrite") {
          setEntries(data);
          alert(`✅ ${data.length}개 기록으로 덮어썼어!`);
        } else {
          // merge: 날짜 기준으로 합치기, 충돌 시 현재 기기 우선
          const dateMap = {};
          data.forEach(e => { dateMap[e.date] = e; });
          entries.forEach(e => { dateMap[e.date] = e; }); // 현재 기기 우선
          const merged = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
          setEntries(merged);
          const added = merged.length - entries.length;
          alert(`✅ 합치기 완료! ${added > 0 ? `${added}개 날짜 추가됨` : "새로 추가된 날짜 없음 (현재 기기 데이터 유지)"}`);
        }
      } catch { alert("❌ 파일 읽기 실패"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function requestGoogleAuth(callback) {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: async (resp) => {
        if (resp.error) { alert("❌ Google 인증 실패"); return; }
        localStorage.setItem(GTOKEN_KEY, resp.access_token);
        try {
          const r    = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${resp.access_token}`);
          const info = await r.json();
          setGoogleEmail(info.email || null);
        } catch {}
        setGoogleToken(resp.access_token);
        callback(resp.access_token);
      },
    });
    tokenClient.requestAccessToken();
  }
  function handleGoogleLogout() {
    if (googleToken) window.google?.accounts.oauth2.revoke(googleToken, () => {});
    localStorage.removeItem(GTOKEN_KEY);
    setGoogleToken(null);
    setGoogleEmail(null);
  }
  async function saveToDrive(token) {
    const content   = JSON.stringify(entries, null, 2);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}'`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { files } = await searchRes.json();
    const metadata  = files?.length
      ? { name: BACKUP_FILE_NAME }
      : { name: BACKUP_FILE_NAME, parents: ["appDataFolder"] };
    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file",     new Blob([content],                  { type: "application/json" }));
    const method = files?.length ? "PATCH" : "POST";
    const url    = files?.length
      ? `https://www.googleapis.com/upload/drive/v3/files/${files[0].id}?uploadType=multipart`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: formData });
    if (!res.ok) throw new Error(await res.text());
    alert(`✅ Google Drive에 저장 완료! (${entries.length}개 기록)`);
  }
  async function loadFromDrive(token, mode) {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}'`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { files } = await searchRes.json();
    if (!files?.length) { alert("❌ Drive에 저장된 기록이 없어"); return; }
    const dataRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await dataRes.json();
    if (!Array.isArray(data)) { alert("❌ 올바른 파일이 아니야"); return; }
    if (mode === "overwrite") {
      setEntries(data);
      alert(`✅ Drive에서 덮어쓰기 완료! (${data.length}개 기록)`);
    } else {
      const dateMap = {};
      data.forEach(e => { dateMap[e.date] = e; });
      entries.forEach(e => { dateMap[e.date] = e; }); // 현재 기기 우선
      const merged = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
      setEntries(merged);
      const added = merged.length - entries.length;
      alert(`✅ Drive 합치기 완료! ${added > 0 ? `${added}개 날짜 추가됨` : "새로 추가된 날짜 없음"}`);
    }
  }
  function handleDriveSave() {
    if (googleToken) saveToDrive(googleToken).catch(() => alert("❌ Drive 저장 실패"));
    else requestGoogleAuth(t => saveToDrive(t).catch(() => alert("❌ Drive 저장 실패")));
  }
  function handleDriveLoad(mode) {
    if (googleToken) loadFromDrive(googleToken, mode).catch(() => alert("❌ Drive 불러오기 실패"));
    else requestGoogleAuth(t => loadFromDrive(t, mode).catch(() => alert("❌ Drive 불러오기 실패")));
  }

  const total     = entries.length;
  const isMixed   = e => { const s = e.meals.filter(m=>!m.isPrev).flatMap(m=>m.symptoms??[-1]); return s.includes(4) && s.some(v=>v===2||v===3); };
  const goodDays  = entries.filter(e => worstSev(e) === -1).length;
  const mildDays  = entries.filter(e => worstSev(e) === 1).length;
  const mixedDays = entries.filter(isMixed).length;
  const badDays   = entries.filter(e => !isMixed(e) && worstSev(e) === 2).length;
  return (
    <div style={{ minHeight:"100vh", background:"#faf7f4", fontFamily:"Georgia,serif", padding:"24px 32px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:3, color:"#a8927a", textTransform:"uppercase", marginBottom:4 }}>장 건강 기록장</div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#3d2b1f", margin:0 }}>내 배 일기 🫙</h1>
        </div>
        <div ref={backupRef} style={{ position:"relative", marginTop:4 }}>
          <button onClick={() => setBackupOpen(o => !o)}
            style={{ ...ioBtn, background: backupOpen ? "#f0ebe6" : "#fff" }}>
            💾 백업·복원 {backupOpen ? "▲" : "▼"}
          </button>
          {backupOpen && (
            <div style={{
              position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200,
              background:"#fff", border:"1px solid #e8ddd5", borderRadius:12,
              boxShadow:"0 6px 20px rgba(0,0,0,.12)", padding:"10px 0", minWidth:210,
            }}>
              <div style={dropLabel}>로컬 파일</div>
              <button onClick={() => { handleExport(); setBackupOpen(false); }} style={dropItem}
                onMouseEnter={e=>e.currentTarget.style.background="#faf7f4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                ⬇ 내보내기
              </button>
              <label style={dropItem}
                onMouseEnter={e=>e.currentTarget.style.background="#faf7f4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                🔀 합치기 (가져오기)
                <input type="file" accept=".json" style={{ display:"none" }} onChange={e => { handleImport(e,"merge"); setBackupOpen(false); }} />
              </label>
              <label style={{ ...dropItem, color:"#f87171" }}
                onMouseEnter={e=>e.currentTarget.style.background="#faf7f4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                ⬆ 덮어쓰기 (가져오기)
                <input type="file" accept=".json" style={{ display:"none" }} onChange={e => { handleImport(e,"overwrite"); setBackupOpen(false); }} />
              </label>
              <div style={{ height:1, background:"#f0ebe6", margin:"8px 0" }} />
              <div style={dropLabel}>☁️ Google Drive</div>
              {googleToken ? (
                <>
                  <button onClick={() => { handleDriveSave(); setBackupOpen(false); }} style={dropItem}
                    onMouseEnter={e=>e.currentTarget.style.background="#faf7f4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    ⬆ Drive에 저장
                  </button>
                  <button onClick={() => { handleDriveLoad("merge"); setBackupOpen(false); }} style={dropItem}
                    onMouseEnter={e=>e.currentTarget.style.background="#faf7f4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    🔀 Drive에서 합치기
                  </button>
                  <button onClick={() => { handleDriveLoad("overwrite"); setBackupOpen(false); }} style={{ ...dropItem, color:"#f87171" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#faf7f4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    ⬆ Drive로 덮어쓰기
                  </button>
                  <div style={{ height:1, background:"#f0ebe6", margin:"8px 0" }} />
                  <div style={{ padding:"4px 14px 6px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, color:"#22c55e" }}>● {googleEmail || "연결됨"}</span>
                    <button onClick={() => { handleGoogleLogout(); setBackupOpen(false); }}
                      style={{ border:"none", background:"transparent", color:"#94a3b8", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                      로그아웃
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => { requestGoogleAuth(()=>{}); setBackupOpen(false); }} style={dropItem}
                  onMouseEnter={e=>e.currentTarget.style.background="#faf7f4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  Google 로그인
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div style={{ display:"flex", marginBottom:18, background:"#fff", borderRadius:12, padding:"12px", border:"1px solid #e8ddd5" }}>
          <Stat label="기록" value={`${total}일`} color="#3d2b1f" />
          <SD /><Stat label="쾌변" value={`${goodDays}일`} color="#22c55e" />
          <SD /><Stat label="불편" value={`${mildDays}일`} color="#d97706" />
          <SD /><Stat label="복합" value={`${mixedDays}일`} color="#eab308" />
          <SD /><Stat label="심함" value={`${badDays}일`} color="#dc2626" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:18, background:"#ede8e3", borderRadius:10, padding:4 }}>
        {[["log","✏️ 오늘 기록"],["history",`📋 히스토리 (${total})`]].map(([t,lbl]) => (
          <button key={t} onClick={() => setView(t)} style={{
            flex:1, padding:"8px 0", border:"none", borderRadius:8,
            background: view===t ? "#fff" : "transparent",
            color: view===t ? "#3d2b1f" : "#a8927a",
            fontFamily:"inherit", fontSize:13, fontWeight: view===t ? 700 : 400,
            cursor:"pointer", boxShadow: view===t ? "0 1px 3px rgba(0,0,0,.08)" : "none",
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── LOG ── */}
      {view === "log" && (
        <div style={{ background:"#fff", borderRadius:16, padding:20, border:"1px solid #e8ddd5" }}>
            <Label>날짜</Label>
            <input type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ ...iStyle, marginBottom:16 }} />

            {form.meals.map((meal, idx) => {
              const isSnack    = meal.key.startsWith("snack");
              const isLast     = idx === form.meals.length - 1;
              const minMovable = form.meals.findIndex(m => !m.fixed);
              const syms       = meal.symptoms ?? [-1];
              const dotColor   = meal.isPrev ? "#cbd5e1" : displayColor(syms);
              const glow       = !meal.isPrev && sym(worstVal(syms)).sev >= 1;
              return (
                <div key={meal.key} style={{ marginBottom:16, paddingBottom:16, borderBottom:"1px dashed #f0ebe6" }}>
                  <div style={{ display:"flex", alignItems:"center", marginBottom:6, gap:6 }}>
                    <div style={{
                      width:10, height:10, borderRadius:"50%", flexShrink:0,
                      background: dotColor,
                      boxShadow: glow ? `0 0 0 3px ${dotColor}33` : "none",
                    }} />
                    <span style={{ fontSize:14 }}>{meal.icon}</span>
                    {isSnack ? (
                      <input value={meal.label} onChange={e => updateMeal(idx, "label", e.target.value)}
                        style={{ flex:1, border:"none", background:"transparent", fontFamily:"inherit", fontSize:12, fontWeight:600, color:"#a8927a", outline:"none" }} />
                    ) : (
                      <span style={{ flex:1, fontSize:12, fontWeight:600, color:"#a8927a" }}>
                        {meal.label}{meal.isPrev ? " (어제)" : ""}
                      </span>
                    )}
                    {!meal.fixed && !meal.isPrev && (
                      <div style={{ display:"flex", gap:2 }}>
                        <MoveBtn disabled={idx <= minMovable} onClick={() => moveUp(idx)}>▲</MoveBtn>
                        <MoveBtn disabled={isLast} onClick={() => moveDown(idx)}>▼</MoveBtn>
                      </div>
                    )}
                    {isSnack && (
                      <button onClick={() => removeSnack(idx)} style={{ border:"none", background:"transparent", color:"#f87171", cursor:"pointer", fontSize:14, padding:"0 2px" }}>✕</button>
                    )}
                  </div>

                  <FoodInput
                    value={meal.food}
                    onChange={val => updateMeal(idx, "food", val)}
                    placeholder={meal.isPrev ? "어제 저녁에 뭐 먹었어?" : `${meal.label}에 뭐 먹었어?`}
                    foodHistory={foodHistory}
                  />

                  {!meal.isPrev && (
                    <>
                      <div style={{ fontSize:10, color:"#b8a898", marginBottom:4 }}>복수 선택 가능</div>
                      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                        {SYMPTOMS.map(s => {
                          const active = syms.includes(s.value);
                          return (
                            <button key={s.value} onClick={() => toggleSym(idx, s.value)} style={{
                              flex:"1 1 0", minWidth:0, padding:"6px 1px", border:"2px solid",
                              borderColor: active ? s.color : "#e8ddd5", borderRadius:7,
                              background: active ? s.color+"22" : "#faf7f4",
                              cursor:"pointer", fontFamily:"inherit", fontSize:9,
                              color: active ? "#3d2b1f" : "#a8927a",
                              fontWeight: active ? 700 : 400, lineHeight:1.5, transition:"all .12s",
                            }}>{s.emoji}<br />{s.label}</button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <button onClick={addSnack} style={{
              width:"100%", padding:"8px 0", border:"1px dashed #e8ddd5",
              borderRadius:10, background:"transparent", color:"#a8927a",
              fontFamily:"inherit", fontSize:13, cursor:"pointer", marginBottom:16,
            }}>＋ 간식 추가</button>

            <Label>메모 (선택)</Label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="스트레스, 수면, 특이사항..."
              style={{ ...iStyle, height:52, resize:"vertical", marginBottom:14 }} />

            {flash && <div style={{ textAlign:"center", fontSize:14, color:"#22c55e", marginBottom:8 }}>{flash}</div>}

            <button onClick={handleSave} style={{
              width:"100%", padding:"12px 0", background:"#3d2b1f", color:"#fff",
              border:"none", borderRadius:12, fontSize:14, fontFamily:"inherit", fontWeight:700, cursor:"pointer",
            }}>{editId !== null ? "수정 저장" : "기록 저장"}</button>

            {editId !== null && (
              <button onClick={() => { setEditId(null); setForm(mkForm(entries)); }} style={{
                width:"100%", padding:"9px 0", background:"transparent", color:"#a8927a",
                border:"1px solid #e8ddd5", borderRadius:12, fontSize:13, fontFamily:"inherit", cursor:"pointer", marginTop:8,
              }}>취소</button>
            )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {view === "history" && (
        <div>
          {entries.length === 0 && (
            <div style={{ textAlign:"center", color:"#a8927a", padding:40, fontSize:14, lineHeight:2 }}>
              아직 기록이 없어.<br />오늘 것부터 써보자 👆
            </div>
          )}
          {(() => {
            const groups = [];
            let curKey = null;
            entries.forEach(entry => {
              const mk = entry.date.slice(0, 7);
              if (mk !== curKey) { curKey = mk; groups.push({ mk, items: [] }); }
              groups[groups.length-1].items.push(entry);
            });
            return groups.map(({ mk, items }, gi) => {
              const [y, mo] = mk.split("-");
              return (
                <div key={mk}>
                  <div style={{
                    fontSize:11, fontWeight:700, color:"#a8927a", letterSpacing:2,
                    padding:"4px 2px 8px", borderBottom:"1px solid #e8ddd5",
                    marginBottom:10, marginTop: gi === 0 ? 0 : 16,
                  }}>
                    {y}년 {parseInt(mo,10)}월
                  </div>
                  {items.map(entry => {
                    const allSyms    = entry.meals.filter(m=>!m.isPrev).flatMap(m=>m.symptoms??[-1]);
                    const worst      = worstVal(allSyms);
                    const s          = sym(worst);
                    const entryColor = displayColor(allSyms);
                    const isOpen     = expandedId === entry.id;
                    const nonPrev    = entry.meals.filter(m => !m.isPrev);
                    return (
                      <div key={entry.id} style={{
                        background:"#fff", borderRadius:14, marginBottom:12,
                        border:"1px solid #e8ddd5", borderLeft:`4px solid ${entryColor}`, overflow:"hidden",
                      }}>
                        <div onClick={() => setExpandedId(isOpen ? null : entry.id)}
                          style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", cursor:"pointer" }}>
                          <div style={{ fontWeight:700, color:"#3d2b1f", fontSize:15 }}>{entry.date}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ display:"flex", gap:3 }}>
                              {nonPrev.map(m => (
                                <div key={m.key} title={`${m.label}: ${sym(worstVal(m.symptoms??[-1])).label}`}
                                  style={{ width:10, height:10, borderRadius:"50%", background:displayColor(m.symptoms??[-1]) }} />
                              ))}
                            </div>
                            <div style={{ background:entryColor+"22", padding:"3px 10px", borderRadius:20, fontSize:12, color:"#3d2b1f", fontWeight:600 }}>
                              {entryColor === "#eab308" ? "🟡 복합" : `${s.emoji} ${s.label}`}
                            </div>
                            <span style={{ color:"#a8927a", fontSize:11 }}>{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {isOpen && (
                          <div style={{ borderTop:"1px solid #f0ebe6" }}>
                            <div style={{ padding:"12px 16px" }}>
                              {entry.meals.map((m, i) => {
                                const syms       = m.symptoms ?? [-1];
                                const ms         = sym(worstVal(syms));
                                const activeSyms = syms.filter(v => v !== -1).map(sym);
                                if (!m.food && (m.isPrev || (syms.length === 1 && syms[0] === -1))) return null;
                                const isLast = i === entry.meals.length - 1;
                                return (
                                  <div key={m.key} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                                      <div style={{ width:10, height:10, borderRadius:"50%", background: m.isPrev ? "#cbd5e1" : displayColor(syms), flexShrink:0, marginTop:3 }} />
                                      {!isLast && <div style={{ width:2, minHeight:20, background:"#f0ebe6", margin:"2px 0" }} />}
                                    </div>
                                    <div style={{ flex:1, paddingBottom: isLast ? 0 : 6 }}>
                                      <div style={{ fontSize:11, color:"#a8927a", marginBottom:2 }}>
                                        {m.icon} {m.label}{m.isPrev ? " (어제)" : ""}
                                      </div>
                                      {!m.isPrev && activeSyms.length > 0 && (
                                        <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:3 }}>
                                          {activeSyms.map(s => (
                                            <span key={s.value} style={{ fontSize:10, padding:"1px 6px", borderRadius:8, background:s.color+"33", color:"#3d2b1f" }}>
                                              {s.emoji} {s.label}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {m.food && <div style={{ fontSize:12, color:"#3d2b1f" }}>{m.food}</div>}
                                    </div>
                                  </div>
                                );
                              })}
                              {entry.note && <div style={{ fontSize:12, color:"#6b7280", marginTop:8 }}>📝 {entry.note}</div>}
                            </div>
                            <div style={{ display:"flex", gap:8, padding:"0 16px 14px" }}>
                              <button onClick={() => handleEdit(entry)} style={sBtn("#3d2b1f")}>수정</button>
                              <button onClick={() => handleDelete(entry.id)} style={sBtn("#dc2626")}>삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

function FoodInput({ value, onChange, placeholder, foodHistory }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug]         = useState(false);

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    const token = val.split(',').pop().trim();
    if (token.length >= 1) {
      const filtered = foodHistory.filter(f => matchFood(f, token)).slice(0, 8);
      setSuggestions(filtered);
      setShowSug(filtered.length > 0);
    } else {
      setShowSug(false);
    }
  }

  function selectSug(food) {
    const parts = value.split(',');
    parts[parts.length - 1] = ' ' + food;
    onChange(parts.join(',').replace(/^\s*,\s*/, '') + ', ');
    setShowSug(false);
  }

  return (
    <div style={{ position:"relative", marginBottom:8 }}>
      <textarea
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowSug(false), 150)}
        placeholder={placeholder}
        style={{ ...iStyle, height:52, resize:"vertical" }}
      />
      {showSug && (
        <div style={{
          position:"absolute", top:"calc(100% - 2px)", left:0, right:0, zIndex:100,
          background:"#fff", border:"1px solid #e8ddd5", borderRadius:"0 0 10px 10px",
          boxShadow:"0 4px 12px rgba(0,0,0,.1)", overflow:"hidden",
        }}>
          {suggestions.map((f, i) => (
            <div key={i} onMouseDown={() => selectSug(f)} style={{
              padding:"8px 12px", fontSize:13, color:"#3d2b1f", cursor:"pointer",
              borderTop: i > 0 ? "1px solid #f0ebe6" : "none", background:"#fff",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#faf7f4"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >{f}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function MoveBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:20, height:20, border:"1px solid #e8ddd5", borderRadius:4,
      background: disabled ? "#f5f0eb" : "#faf7f4", color: disabled ? "#d4c4b8" : "#a8927a",
      fontSize:9, cursor: disabled ? "default" : "pointer", padding:0,
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>{children}</button>
  );
}
function Stat({ label, value, color }) {
  return (
    <div style={{ flex:1, textAlign:"center" }}>
      <div style={{ fontSize:16, fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:10, color:"#a8927a" }}>{label}</div>
    </div>
  );
}
function SD() { return <div style={{ width:1, background:"#e8ddd5", margin:"0 4px" }} />; }
function Label({ children }) {
  return <div style={{ fontSize:12, color:"#a8927a", marginBottom:6, fontWeight:600 }}>{children}</div>;
}
const iStyle = {
  width:"100%", padding:"10px 12px", border:"1px solid #e8ddd5", borderRadius:10,
  fontSize:14, fontFamily:"inherit", background:"#faf7f4", color:"#3d2b1f",
  boxSizing:"border-box", outline:"none",
};
const sBtn = color => ({
  padding:"5px 14px", border:`1px solid ${color}`, borderRadius:8,
  background:"transparent", color, fontSize:12, fontFamily:"inherit", cursor:"pointer",
});
const ioBtn = {
  padding:"6px 12px", border:"1px solid #e8ddd5", borderRadius:8,
  background:"#fff", color:"#a8927a", fontSize:12, fontFamily:"Georgia,serif",
  cursor:"pointer", whiteSpace:"nowrap",
};
const dropItem = {
  display:"block", width:"100%", padding:"8px 14px", border:"none",
  background:"transparent", textAlign:"left", color:"#3d2b1f",
  fontSize:13, fontFamily:"Georgia,serif", cursor:"pointer", whiteSpace:"nowrap",
};
const dropLabel = {
  fontSize:10, color:"#a8927a", letterSpacing:1,
  padding:"2px 14px 6px", textTransform:"uppercase",
};