// --- මෙන්න ඔයාගේ Google Script ලින්ක් එක ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";
let students = [];
const ADMIN_USER = "admin"; 
const ADMIN_PASS = "123";
let currentMonth = "March";

// පන්ති සහ ගාස්තු විස්තර
const feesList = {
    "Grade 6 Friday": 1000, "Grade 7 Saturday": 1000,
    "Grade 8 Sunday": 2000, "Grade 8 Monday": 1000, "Grade 8 Tuesday": 1000,
    "Grade 9 Saturday": 2000, "Grade 9 Sunday": 2000, "Grade 9 Monday": 1500,
    "Grade 10 Wednesday": 1500, "Grade 10 Thursday": 2000, "Grade 10 Sunday Paper": "N/A",
    "Grade 11 Saturday": 2000, "Grade 11 Friday Paper": "N/A"
};

// දත්ත ලබාගැනීම
async function loadDataFromCloud() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        if (Array.isArray(data)) students = data;
    } catch (e) { students = JSON.parse(localStorage.getItem("students")) || []; }
    renderStudents();
}

// දත්ත සේව් කිරීම
async function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    try { await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(students) }); } catch (e) {}
}

// Login System
function login() {
    if (document.getElementById("username").value === ADMIN_USER && document.getElementById("password").value === ADMIN_PASS) {
        localStorage.setItem("loggedIn", "true"); showApp();
    } else { alert("Login Failed!"); }
}

function showApp() {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    loadDataFromCloud();
}

// සිසුන් පෙන්වීම සහ සෙවීම
function renderStudents() {
    const list = document.getElementById("studentList");
    const filter = document.getElementById("filterGroup").value;
    const search = document.getElementById("searchInput").value.toLowerCase();
    list.innerHTML = "";

    let filtered = students.filter(s => (filter === "All" || s.group === filter) && s.name.toLowerCase().includes(search));
    
    document.getElementById("totalCount").innerText = students.length;
    document.getElementById("paidCount").innerText = students.filter(s => s.fees?.[currentMonth] === "Paid").length;

    filtered.forEach((s) => {
        let idx = students.indexOf(s);
        if(!s.attendance[currentMonth]) s.attendance[currentMonth] = ["-","-","-","-"];
        let pCount = s.attendance[currentMonth].filter(x => x === "P").length;
        
        let card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
            <div id="view-${idx}">
                <h3 style="margin:0;">${s.name}</h3>
                <span style="font-size:11px; color:#2c3e50; font-weight:bold;">${s.group}</span> | 
                <span style="font-size:11px; color:#666;">${s.phone}</span>
                <div class="attendance-box">
                    ${s.attendance[currentMonth].map((v, i) => `<div class="att-day">W${i+1}<br><button class="att-btn ${v=='P'?'present':v=='A'?'absent':''}" onclick="markAtt(${idx},${i})">${v}</button></div>`).join('')}
                    <div class="att-day">පැමිණීම<br><b style="font-size:16px;">${pCount}</b></div>
                </div>
                <div class="card-actions">
                    <button class="pay-btn" onclick="pay(${idx})">${s.fees?.[currentMonth]==='Paid'?'Paid ✅':'Pay Rs.'+(feesList[s.group]||'')}</button>
                    <button class="wa-btn" onclick="sendReceipt(${idx})">💵 Receipt</button>
                    <button class="rep-btn" onclick="sendReport(${idx})">📊 Report</button>
                    <button class="edit-btn-small" onclick="toggleEdit(${idx})">📝 Edit</button>
                    <button class="del-btn" onclick="del(${idx})">🗑️ Remove</button>
                </div>
            </div>
            <div id="edit-${idx}" style="display:none;">
                <input type="text" id="editName-${idx}" value="${s.name}">
                <input type="text" id="editPhone-${idx}" value="${s.phone}">
                <select id="editGroup-${idx}">
                    ${Object.keys(feesList).map(g => `<option value="${g}" ${g===s.group?'selected':''}>${g}</option>`).join('')}
                </select>
                <div style="display:flex; gap:5px;">
                    <button onclick="updateStudent(${idx})" style="background:var(--accent);">Update</button>
                    <button onclick="toggleEdit(${idx})" style="background:#95a5a6;">Cancel</button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

// පැමිණීම සලකුණු කිරීම
function markAtt(idx, w) {
    let cur = students[idx].attendance[currentMonth][w];
    students[idx].attendance[currentMonth][w] = cur === "P" ? "A" : cur === "A" ? "-" : "P";
    saveData(); renderStudents();
}

// ගාස්තු සලකුණු කිරීම
function pay(idx) {
    if(!students[idx].fees) students[idx].fees = {};
    students[idx].fees[currentMonth] = (students[idx].fees[currentMonth] === "Paid") ? "Pending" : "Paid";
    saveData(); renderStudents();
}

// WhatsApp රිසිට් එක
function sendReceipt(idx) {
    let s = students[idx];
    let amt = feesList[s.group];
    let msg = `*Payment Receipt - Boss Thilina*\n\nදරුවාගේ නම: ${s.name}\nපන්තිය: ${s.group}\nමාසය: ${currentMonth}\nගෙවූ මුදල: Rs.${amt}\nතත්වය: PAID ✅\n\nස්තූතියි!`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// WhatsApp Report (සති 3 විශේෂ පණිවිඩය සමඟ)
function sendReport(idx) {
    let s = students[idx];
    let pCount = s.attendance[currentMonth].filter(x => x === "P").length;
    let msg = "";

    if (pCount === 3) {
        msg = `ආයුබෝවන්,\nඔබගේ දරුවා වන ${s.name}, ${currentMonth} මාසය සඳහා සති 3ක් පන්තියට 🧑‍🏫සහභාගී වී ඇත. කරුණාකර ලබන සතියේ පන්ති ගාස්තු 💵පියවීමට කටයුතු කරන්න.\nස්තූතියි!🙏`;
    } else {
        msg = `*පැමිණීමේ වාර්තාව - Boss Thilina*\n\nදරුවාගේ නම: ${s.name}\nපන්තිය: ${s.group}\nමාසය: ${currentMonth}\nපැමිණීම: සති ${pCount}/4 කි. ✅\n\nස්තූතියි!`;
    }
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Edit පහසුකම
function toggleEdit(idx) {
    const v = document.getElementById(`view-${idx}`);
    const e = document.getElementById(`edit-${idx}`);
    v.style.display = v.style.display === 'none' ? 'block' : 'none';
    e.style.display = e.style.display === 'none' ? 'block' : 'none';
}

function updateStudent(idx) {
    students[idx].name = document.getElementById(`editName-${idx}`).value;
    students[idx].phone = document.getElementById(`editPhone-${idx}`).value;
    students[idx].group = document.getElementById(`editGroup-${idx}`).value;
    saveData();
    renderStudents();
}

// නව සිසුවෙකු ඇතුළත් කිරීම
function addStudent() {
    let n = document.getElementById("studentName").value;
    let p = document.getElementById("parentPhone").value;
    let g = document.getElementById("newStudentGroup").value;
    if(n && p) {
        students.push({ name: n, phone: p, group: g, attendance: {}, fees: {}, marks: {} });
        saveData(); renderStudents();
        document.getElementById("studentName").value = ""; document.getElementById("parentPhone").value = "";
    }
}

// ඉවත් කිරීම සහ අනෙකුත්
function del(idx) { if(confirm("Delete student?")) { students.splice(idx,1); saveData(); renderStudents(); } }
function logout() { localStorage.removeItem("loggedIn"); location.reload(); }
function changeMonth() { currentMonth = document.getElementById("monthSelect").value; renderStudents(); }
window.onload = () => { if (localStorage.getItem("loggedIn") === "true") showApp(); };
