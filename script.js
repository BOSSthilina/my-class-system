// --- මෙන්න ඔයාගේ Google Script ලින්ක් එක ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";

let students = [];
const ADMIN_USER = "admin"; 
const ADMIN_PASS = "123";
let currentMonth = "March"; 

// --- CLOUD SYNC FUNCTIONS ---

// Google Sheet එකෙන් දත්ත ලබා ගැනීම
async function loadDataFromCloud() {
    console.log("Loading data from cloud...");
    try {
        let response = await fetch(SCRIPT_URL);
        let cloudData = await response.json();
        if (Array.isArray(cloudData)) {
            students = cloudData;
            console.log("Data loaded successfully!");
        }
    } catch (e) {
        console.error("Cloud load failed:", e);
        // Cloud එක අවුල් නම් කලින් සේව් කරපු ඒවා ගන්නවා
        students = JSON.parse(localStorage.getItem("students")) || [];
    }
    renderStudents();
}

// Google Sheet එකට දත්ත යැවීම
async function saveData() {
    // Local එකෙත් සේව් කරනවා (Safety එකට)
    localStorage.setItem("students", JSON.stringify(students));
    
    console.log("Saving to cloud...");
    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(students)
        });
        console.log("Saved to cloud!");
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

// --- APP FUNCTIONS ---

function login() {
    const u = document.getElementById("username").value;
    const p = document.getElementById("password").value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
        localStorage.setItem("loggedIn", "true");
        showApp();
    } else { alert("Login Failed!"); }
}

function logout() { localStorage.removeItem("loggedIn"); location.reload(); }

function showApp() {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    loadDataFromCloud(); // ඇප් එක ඕපන් වෙද්දීම ක්ලවුඩ් එකෙන් දත්ත ගන්නවා
}

window.onload = () => { if (localStorage.getItem("loggedIn") === "true") showApp(); };

function changeMonth() { 
    currentMonth = document.getElementById("monthSelect").value; 
    renderStudents(); 
}

function renderStudents() {
    let list = document.getElementById("studentList");
    let filter = document.getElementById("filterGroup").value;
    if(!list) return;
    list.innerHTML = "";

    let filtered = students.filter(s => filter === "All" || s.group === filter);
    let ranked = [...filtered].sort((a,b) => (parseInt(b.marks?.[currentMonth]) || 0) - (parseInt(a.marks?.[currentMonth]) || 0));

    filtered.forEach((s) => {
        let realIndex = students.indexOf(s);
        if (!s.attendance) s.attendance = {};
        if (!s.attendance[currentMonth]) s.attendance[currentMonth] = ["-", "-", "-", "-"];
        
        let score = parseInt(s.marks?.[currentMonth]) || 0;
        let rank = ranked.findIndex(r => r.name === s.name && r.phone === s.phone) + 1;
        let presentCount = s.attendance[currentMonth].filter(a => a === "P").length;
        let showAttButton = presentCount >= 3 ? "block" : "none";

        let card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
            ${score > 0 ? `<div class="rank-badge">Rank: ${rank}</div>` : ""}
            <h3 style="margin:0;">${s.name}</h3>
            <span style="color:#666; font-size:12px;">${s.group}</span>
            
            <div class="attendance-box">
                ${s.attendance[currentMonth].map((status, wIdx) => `
                    <div class="att-day">W${wIdx+1}<br>
                    <button class="att-btn ${status === 'P' ? 'present' : status === 'A' ? 'absent' : ''}" 
                    onclick="markAtt(${realIndex}, ${wIdx})">${status}</button></div>
                `).join('')}
                <div class="att-day">Total<br><b>${presentCount}</b></div>
            </div>

            <div style="margin-bottom:15px; display:flex; gap:5px;">
                <input type="number" id="m-${realIndex}" value="${score}" style="width:70px; padding:5px; border-radius:5px; border:1px solid #ddd;">
                <button onclick="addMarks(${realIndex})" style="background:#2c3e50; color:white; border-radius:5px; padding:5px; flex:1;">Save Marks</button>
            </div>

            <div class="card-actions">
                <button class="pay-btn" onclick="pay(${realIndex})">${s.fees?.[currentMonth] === "Paid" ? "Paid ✅" : "Mark Fee Paid"}</button>
                <button class="whatsapp-att-btn" style="display: ${showAttButton}" onclick="sendAttendanceWA(${realIndex})">📱 Attendance Report</button>
                <button class="whatsapp-marks-btn" onclick="sendMarksWA(${realIndex})">📝 Marks Report</button>
                <button class="del-btn" onclick="del(${realIndex})">Remove Student</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function markAtt(idx, wIdx) {
    students[idx].attendance[currentMonth][wIdx] = (students[idx].attendance[currentMonth][wIdx] === "P") ? "A" : (students[idx].attendance[currentMonth][wIdx] === "A") ? "-" : "P";
    saveData(); renderStudents();
}

function addMarks(idx) {
    let val = document.getElementById(`m-${idx}`).value;
    if(!students[idx].marks) students[idx].marks = {};
    students[idx].marks[currentMonth] = val;
    saveData(); renderStudents();
}

function pay(idx) { 
    if(!students[idx].fees) students[idx].fees = {};
    students[idx].fees[currentMonth] = (students[idx].fees[currentMonth] === "Paid") ? "Pending" : "Paid";
    saveData(); renderStudents(); 
}

function del(idx) { if(confirm("Are you sure?")) { students.splice(idx,1); saveData(); renderStudents(); } }

function addStudent() {
    let n = document.getElementById("studentName").value;
    let p = document.getElementById("parentPhone").value;
    let g = document.getElementById("group").value;
    if(n && p) {
        students.push({ name: n, phone: p, group: g, marks: {}, fees: {}, attendance: {} });
        saveData(); renderStudents();
        document.getElementById("studentName").value = ""; 
        document.getElementById("parentPhone").value = "";
    } else { alert("Enter Name and Phone!"); }
}

function sendAttendanceWA(idx) {
    let s = students[idx];
    let count = s.attendance[currentMonth].filter(a => a === "P").length;
    let msg = `ආයුබෝවන්, ඔබගේ දරුවා වන ${s.name}, ${currentMonth} මාසය සඳහා සති ${count}ක් පන්තියට සහභාගී වී ඇත. කරුණාකර පන්ති ගාස්තු පියවීමට කටයුතු කරන්න. ස්තූතියි!`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function sendMarksWA(idx) {
    let s = students[idx];
    let grade = s.group;
    let score = parseInt(s.marks?.[currentMonth]) || 0;
    let classMates = students.filter(st => st.group === grade);
    let allScores = classMates.map(st => parseInt(st.marks?.[currentMonth]) || 0).sort((a, b) => b - a);
    let rank = allScores.indexOf(score) + 1;
    
    let msg = `*Student Progress Report - ${currentMonth}*\n\n` +
              `Student: ${s.name}\nGrade: ${grade}\n` +
              `--------------------------\n` +
              `📍 Your Child's Score: ${score}\n🏆 Class Rank: ${rank}\n\n` +
              `📊 Class Performance (${grade}):\n` +
              `- 🥇 1st Place: ${allScores[0] || 0}\n` +
              `- 🥈 2nd Place: ${allScores[1] || 0}\n` +
              `- 🥉 3rd Place: ${allScores[2] || 0}\n` +
              `--------------------------\n` +
              `Status: ${s.fees?.[currentMonth] === "Paid" ? "Fees Paid ✅" : "Pending ❌"}\n\nThank you!`;

    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function sendAllReports() {
    let filter = document.getElementById("filterGroup").value;
    let target = students.filter(s => filter === "All" || s.group === filter);
    if (confirm(`Send reports to ${target.length} students?`)) {
        for(let i=0; i<target.length; i++) {
            sendMarksWA(students.indexOf(target[i]));
            await new Promise(r => setTimeout(r, 3500)); // එකක් යවලා තත්පර 3.5ක් ඉන්නවා
        }
    }
}