const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";
let students = [];

async function loadData() {
    try {
        const res = await fetch(SCRIPT_URL);
        students = await res.json();
        renderStudents();
    } catch(e) { console.error("Error loading data"); }
}

async function saveData() {
    await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(students) });
}

function login() {
    if(document.getElementById("username").value === "admin" && document.getElementById("password").value === "123") {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        loadData();
    }
}

function addStudent() {
    let name = document.getElementById("studentName").value;
    let phone = document.getElementById("parentPhone").value;
    let group = document.getElementById("group").value;
    let fee = document.getElementById("monthlyFee").value || "0";

    if(name && phone) {
        students.push({ name, phone, group, fee, marks: {}, attendance: {}, fees: {} });
        saveData(); renderStudents();
        document.getElementById("studentName").value = "";
        document.getElementById("parentPhone").value = "";
    }
}

function renderStudents() {
    let list = document.getElementById("studentList");
    let search = document.getElementById("searchBar").value.toLowerCase();
    let filter = document.getElementById("filterGroup").value;
    let month = document.getElementById("monthSelect").value;
    list.innerHTML = "";

    students.filter(s => (filter === "All" || s.group === filter) && s.name.toLowerCase().includes(search)).forEach((s, idx) => {
        let sIdx = students.indexOf(s);
        if(!s.attendance[month]) s.attendance[month] = ["-","-","-","-"];
        
        let card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
            <h3 style="margin:0;">${s.name}</h3>
            <small>${s.group} ${s.fee > 0 ? '| Fee: Rs.'+s.fee : ''}</small>
            <div style="margin-top:10px;">
                ${s.attendance[month].map((a, i) => `<button class="att-btn ${a==='P'?'present':a==='A'?'absent':''}" onclick="mark(${sIdx},'${month}',${i})">${a}</button>`).join('')}
            </div>
            <button class="wa-btn" onclick="sendWA(${sIdx}, '${month}')">📱 Send WhatsApp Report</button>
        `;
        list.appendChild(card);
    });
}

function mark(sIdx, month, wIdx) {
    let curr = students[sIdx].attendance[month][wIdx];
    students[sIdx].attendance[month][wIdx] = curr === "P" ? "A" : curr === "A" ? "-" : "P";
    saveData(); renderStudents();
}

function sendWA(sIdx, month) {
    let s = students[sIdx];
    let att = s.attendance[month].filter(a => a === "P").length;
    let msg = `*Report - ${month}*\nStudent: ${s.name}\nClass: ${s.group}\nAttendance: ${att}/4\nFee: Rs.${s.fee}`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}
