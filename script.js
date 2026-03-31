// --- මෙන්න ඔයාගේ Google Script ලින්ක් එක ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";
let students = [];
const ADMIN_USER = "admin"; 
const ADMIN_PASS = "123";
let currentMonth = "March";

const feesList = {
    "Grade 6 Friday": 1000, "Grade 7 Saturday": 1000,
    "Grade 8 Sunday": 2000, "Grade 8 Monday": 1000, "Grade 8 Tuesday": 1000,
    "Grade 9 Saturday": 2000, "Grade 9 Sunday": 2000, "Grade 9 Monday": 1500,
    "Grade 10 Wednesday": 1500, "Grade 10 Thursday": 2000, "Grade 10 Sunday Paper": "N/A",
    "Grade 11 Saturday": 2000, "Grade 11 Friday Paper": "N/A"
};

async function loadDataFromCloud() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        if (Array.isArray(data)) students = data;
    } catch (e) { students = JSON.parse(localStorage.getItem("students")) || []; }
    renderStudents();
}

async function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    try { await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(students) }); } catch (e) {}
}

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
        if(!s.marks) s.marks = {};
        let pCount = s.attendance[currentMonth].filter(x => x === "P").length;
        
        let card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
            <div id="view-${idx}">
                <h3 style="margin:0;">${s.name}</h3>
                <span style="font-size:11px; color:#2c3e50; font-weight:bold;">${s.group}</span>
                
                <div class="attendance-box">
                    ${s.attendance[currentMonth].map((v, i) => `<div class="att-day">W${i+1}<br><button class="att-btn ${v=='P'?'present':v=='A'?'absent':''}" onclick="markAtt(${idx},${i})">${v}</button></div>`).join('')}
                    <div class="att-day">පැමිණීම<br><b style="font-size:16px;">${pCount}</b></div>
                </div>

                <div style="margin-bottom:10px; background:#fffbe6; padding:8px; border-radius:5px; border:1px solid #ffe58f;">
                    <label style="font-size:12px; font-weight:bold;">📝 Exam Score:</label>
                    <input type="number" id="marksInput-${idx}" value="${s.marks[currentMonth] || ''}" placeholder="00" style="width:70px; display:inline-block; margin-left:10px; padding:5px;" onchange="updateMarks(${idx}, this.value)">
                </div>

                <div class="card-actions">
                    <button class="pay-btn" onclick="pay(${idx})" style="background:#f39c12;">${s.fees?.[currentMonth]==='Paid'?'Paid ✅':'Pay Fees'}</button>
                    <button class="rep-btn" onclick="sendReport(${idx})" style="background:#3498db;">📊 Send Result</button>
                    <button class="wa-btn" onclick="sendReceipt(${idx})" style="background:#2ecc71;">💵 Receipt</button>
                    <button class="edit-btn-small" onclick="toggleEdit(${idx})" style="background:#7f8c8d;">📝 Edit</button>
                    <button class="del-btn" onclick="del(${idx})" style="grid-column: span 2; background:#bdc3c7; margin-top:5px;">🗑️ Remove Student</button>
                </div>
            </div>

            <div id="edit-${idx}" style="display:none; background:#f9f9f9; padding:10px; border-radius:8px;">
                <input type="text" id="editName-${idx}" value="${s.name}">
                <input type="text" id="editPhone-${idx}" value="${s.phone}">
                <select id="editGroup-${idx}">
                    ${Object.keys(feesList).map(g => `<option value="${g}" ${g===s.group?'selected':''}>${g}</option>`).join('')}
                </select>
                <div style="display:flex; gap:5px;">
                    <button onclick="updateStudent(${idx})" style="background:#27ae60;">Update</button>
                    <button onclick="toggleEdit(${idx})" style="background:#95a5a6;">Cancel</button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function updateMarks(idx, val) {
    if(!students[idx].marks) students[idx].marks = {};
    students[idx].marks[currentMonth] = val;
    saveData();
}

function sendReport(idx) {
    let s = students[idx];
    let pCount = s.attendance[currentMonth].filter(x => x === "P").length;
    let currentMark = parseFloat(s.marks[currentMonth]) || 0;

    // Rank Logic
    let groupStudents = students.filter(std => std.group === s.group);
    let marksList = groupStudents
        .map(std => parseFloat(std.marks[currentMonth]) || 0)
        .sort((a, b) => b - a);

    let rank = marksList.indexOf(currentMark) + 1;
    let first = marksList[0] || 0;
    let second = marksList[1] || 0;
    let third = marksList[2] || 0;
    let status = (s.fees && s.fees[currentMonth] === "Paid") ? "Paid ✅" : "Pending ⏳";

    let msg = "";

    if (pCount === 3) {
        // සති 3ක් ආවම යන විශේෂ සිංහල මැසේජ් එක
        msg = `ආයුබෝවන්,\nඔබගේ දරුවා වන ${s.name}, ${currentMonth} මාසය සඳහා සති 3ක් පන්තියට 🧑‍🏫සහභාගී වී ඇත.\n\n🏆 Your Child's Score: ${currentMark}\n📊 Class Rank: ${rank}\n\nකරුණාකර ලබන සතියේ පන්ති ගාස්තු 💵පියවීමට කටයුතු කරන්න.\nස්තූතියි!🙏\n- Thilina Bandara -`;
    } else {
        // අනෙක් වෙලාවට යන Rank රිපෝට් එක
        msg = `Student: ${s.name}\nGrade: ${s.group}\n--------------------------\n🏆 Your Child's Score: ${currentMark}\n📊 Class Rank: ${rank}\n\n🔥 Class Performance (${s.group}):\n- 🥇 1st Place: ${first}\n- 🥈 2nd Place: ${second}\n- 🥉 3rd Place: ${third}\n--------------------------\nStatus: ${status}\n\nThank you! 🙏\n- Thilina Bandara -`;
    }

    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function markAtt(idx, w) {
    let cur = students[idx].attendance[currentMonth][w];
    students[idx].attendance[currentMonth][w] = cur === "P" ? "A" : cur === "A" ? "-" : "P";
    saveData(); renderStudents();
}

function pay(idx) {
    if(!students[idx].fees) students[idx].fees = {};
    students[idx].fees[currentMonth] = (students[idx].fees[currentMonth] === "Paid") ? "Pending" : "Paid";
    saveData(); renderStudents();
}

function sendReceipt(idx) {
    let s = students[idx];
    let amt = feesList[s.group];
    let msg = `*Payment Receipt - Thilina Bandara*\n\nStudent: ${s.name}\nAmount: Rs.${amt}\nMonth: ${currentMonth}\nStatus: PAID ✅\n\nThank you! 🙏`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

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
    saveData(); renderStudents();
}

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

function del(idx) { if(confirm("Delete student?")) { students.splice(idx,1); saveData(); renderStudents(); } }
function logout() { localStorage.removeItem("loggedIn"); location.reload(); }
function changeMonth() { currentMonth = document.getElementById("monthSelect").value; renderStudents(); }
window.onload = () => { if (localStorage.getItem("loggedIn") === "true") showApp(); };
