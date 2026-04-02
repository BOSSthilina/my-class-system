const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";

let students = [];
const ADMIN_USER = "admin"; 
const ADMIN_PASS = "123";
let currentMonth = "March"; 

// --- CLOUD SYNC FUNCTIONS ---
async function loadDataFromCloud() {
    try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();
        if (Array.isArray(cloudData)) {
            students = cloudData;
        }
    } catch (e) {
        students = JSON.parse(localStorage.getItem("students")) || [];
    }
    renderStudents();
}

async function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(students)
        });
    } catch (e) {
        console.error("Cloud Save Failed");
    }
}

// --- AUTH & SETUP ---
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
    loadDataFromCloud();
}
window.onload = () => { if (localStorage.getItem("loggedIn") === "true") showApp(); };

// --- CORE LOGIC ---
function addStudent() {
    const name = document.getElementById("studentName").value;
    const phone = document.getElementById("parentPhone").value;
    const type = document.getElementById("classType").value;
    const grade = document.getElementById("group").value;
    const fee = document.getElementById("monthlyFee").value || "0";

    if (name && phone) {
        students.push({ name, phone, type, group: grade, fee, marks: {}, fees: {}, attendance: {} });
        saveData(); 
        renderStudents();
        document.getElementById("studentName").value = "";
        document.getElementById("parentPhone").value = "";
        document.getElementById("monthlyFee").value = "";
    } else { alert("Name and Phone are required!"); }
}

function renderStudents() {
    const list = document.getElementById("studentList");
    const search = document.getElementById("searchBar").value.toLowerCase();
    const gradeFilter = document.getElementById("filterGrade").value;
    const typeFilter = document.getElementById("filterType").value;
    currentMonth = document.getElementById("monthSelect").value;
    
    list.innerHTML = "";

    let filtered = students.filter(s => 
        s.name.toLowerCase().includes(search) &&
        (gradeFilter === "All" || s.group === gradeFilter) &&
        (typeFilter === "All" || s.type === typeFilter)
    );

    filtered.forEach(s => {
        let idx = students.indexOf(s);
        if (!s.attendance[currentMonth]) s.attendance[currentMonth] = ["-","-","-","-"];
        let presentCount = s.attendance[currentMonth].filter(a => a === "P").length;
        let isPaid = s.fees[currentMonth] === "Paid";
        
        let card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
            <span class="type-tag ${s.type}-tag">${s.type}</span>
            <h3 style="margin:0;">${s.name}</h3>
            <p style="font-size:12px; color:#666; margin:5px 0;">${s.group} | Monthly Fee: Rs.${s.fee}</p>
            
            <div class="attendance-box">
                ${s.attendance[currentMonth].map((status, i) => `
                    <div style="text-align:center; font-size:10px;">W${i+1}<br>
                    <button class="att-btn ${status === 'P' ? 'present' : status === 'A' ? 'absent' : ''}" 
                    onclick="markAtt(${idx}, ${i})">${status}</button></div>
                `).join('')}
                <div style="text-align:center; font-size:10px;">Total<br><b style="font-size:14px;">${presentCount}</b></div>
            </div>

            <div style="display:flex; gap:8px; margin-bottom:10px;">
                <input type="number" id="m-${idx}" value="${s.marks[currentMonth] || 0}" style="width:70px; padding:8px; border-radius:8px; border:1px solid #ddd;">
                <button onclick="saveMarks(${idx})" style="background:var(--primary); color:white; border:none; border-radius:8px; flex:1; cursor:pointer;">Save Marks</button>
            </div>

            <div class="card-actions">
                <button class="pay-btn" onclick="togglePay(${idx})">
                    ${isPaid ? "✅ Paid (Rs."+s.fee+")" : "💰 Mark Paid (Rs."+s.fee+")"}
                </button>
                <button class="wa-btn" onclick="sendWhatsApp(${idx})">
                    📱 WhatsApp Report
                </button>
                <button class="del-btn" onclick="deleteStudent(${idx})">Remove Student</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function markAtt(idx, week) {
    let current = students[idx].attendance[currentMonth][week];
    students[idx].attendance[currentMonth][week] = (current === "P") ? "A" : (current === "A") ? "-" : "P";
    saveData(); renderStudents();
}

function saveMarks(idx) {
    students[idx].marks[currentMonth] = document.getElementById(`m-${idx}`).value;
    saveData(); renderStudents();
}

function togglePay(idx) {
    students[idx].fees[currentMonth] = (students[idx].fees[currentMonth] === "Paid") ? "Pending" : "Paid";
    saveData(); renderStudents();
}

function deleteStudent(idx) {
    if(confirm("Are you sure you want to delete this student?")) {
        students.splice(idx, 1);
        saveData(); renderStudents();
    }
}

function sendWhatsApp(idx) {
    let s = students[idx];
    let att = s.attendance[currentMonth].filter(a => a === "P").length;
    let mark = s.marks[currentMonth] || 0;
    let status = s.fees[currentMonth] === "Paid" ? "Paid ✅" : "Pending ❌ (Rs." + s.fee + ")";
    
    let msg = `*Class Report - ${currentMonth}*\n\n` +
              `Student: *${s.name}*\n` +
              `Class: ${s.group} (${s.type})\n` +
              `--------------------------\n` +
              `📍 Attendance: ${att}/4 weeks\n` +
              `📝 Exam Marks: ${mark}\n` +
              `💰 Fees Status: ${status}\n` +
              `--------------------------\n` +
              `Thank you!`;

    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}
