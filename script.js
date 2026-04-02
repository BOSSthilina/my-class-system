const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";
let students = [];

async function loadData() {
    const res = await fetch(SCRIPT_URL);
    students = await res.json();
    renderStudents();
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

function addOrUpdateStudent() {
    let name = document.getElementById("studentName").value;
    let phone = document.getElementById("parentPhone").value;
    let group = document.getElementById("group").value;
    let fee = document.getElementById("monthlyFee").value || "0";
    let editIdx = document.getElementById("editIdx").value;

    if(editIdx === "") {
        students.push({ name, phone, group, fee, marks: {}, attendance: {} });
    } else {
        students[editIdx].name = name;
        students[editIdx].phone = phone;
        students[editIdx].group = group;
        students[editIdx].fee = fee;
        document.getElementById("editIdx").value = "";
        document.getElementById("formTitle").innerText = "+ Add Student";
    }
    saveData(); renderStudents();
    document.getElementById("studentName").value = "";
    document.getElementById("parentPhone").value = "";
}

function editStudent(idx) {
    let s = students[idx];
    document.getElementById("studentName").value = s.name;
    document.getElementById("parentPhone").value = s.phone;
    document.getElementById("group").value = s.group;
    document.getElementById("monthlyFee").value = s.fee;
    document.getElementById("editIdx").value = idx;
    document.getElementById("formTitle").innerText = "📝 Edit Student";
    window.scrollTo(0,0);
}

function renderStudents() {
    let list = document.getElementById("studentList");
    let search = document.getElementById("searchBar").value.toLowerCase();
    let month = document.getElementById("monthSelect").value;
    list.innerHTML = "";

    students.filter(s => s.name.toLowerCase().includes(search)).forEach((s, idx) => {
        let sIdx = students.indexOf(s);
        if(!s.attendance[month]) s.attendance[month] = ["-","-","-","-"];
        let attCount = s.attendance[month].filter(a => a === "P").length;
        let score = s.marks?.[month] || 0;

        let card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
            <h3>${s.name} <button onclick="editStudent(${sIdx})" style="width:auto; padding:2px 8px; font-size:10px;">Edit</button></h3>
            <small>${s.group} | Fee: Rs.${s.fee}</small>
            <div style="margin:10px 0;">
                ${s.attendance[month].map((a, i) => `<button class="att-btn ${a==='P'?'present':a==='A'?'absent':''}" onclick="mark(${sIdx},'${month}',${i})">${a}</button>`).join('')}
            </div>
            
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <input type="number" id="m-${sIdx}" value="${score}" style="width:70px; margin:0; padding:5px;">
                <button onclick="saveMarks(${sIdx}, '${month}')" style="margin:0; padding:5px; font-size:12px;">Add Marks</button>
            </div>

            <button class="wa-btn" onclick="sendProgress(${sIdx}, '${month}')">📊 Send Marks Report</button>
            <button class="wa-btn" style="background:#f39c12;" onclick="sendFeeReminder(${sIdx}, '${month}')">⚠️ 3 Weeks Unpaid/Absent Message</button>
            <button class="wa-btn" style="background:#3498db;" onclick="sendThanks(${sIdx}, '${month}')">🙏 Thank You (Paid)</button>
            <button onclick="del(${sIdx})" style="color:red; background:none; border:none; margin-top:10px; cursor:pointer;">Remove</button>
        `;
        list.appendChild(card);
    });
}

function mark(sIdx, month, wIdx) {
    let curr = students[sIdx].attendance[month][wIdx];
    students[sIdx].attendance[month][wIdx] = curr === "P" ? "A" : curr === "A" ? "-" : "P";
    saveData(); renderStudents();
}

function saveMarks(sIdx, month) {
    if(!students[sIdx].marks) students[sIdx].marks = {};
    students[sIdx].marks[month] = document.getElementById(`m-${sIdx}`).value;
    saveData(); alert("Marks Saved!");
}

function sendProgress(idx, month) {
    let s = students[idx];
    let msg = `*Progress Report - ${month}*\nStudent: ${s.name}\nMarks: ${s.marks[month] || 0}\nAttendance: ${s.attendance[month].filter(a=>a==='P').length}/4`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

function sendFeeReminder(idx, month) {
    let s = students[idx];
    let msg = `ඔබගේ දරුවා (${s.name}) සති 3ක් පන්තියට පැමිණ නැත/ගාස්තු ගෙවා නැත. කරුණාකර ඒ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

function sendThanks(idx, month) {
    let s = students[idx];
    let msg = `දරුවාගේ (${s.name}) ${month} මස සඳහා රු. ${s.fee} ක ගාස්තුව ලැබුණි. ස්තූතියි!`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

function del(idx) { if(confirm("Delete?")) { students.splice(idx,1); saveData(); renderStudents(); } }
