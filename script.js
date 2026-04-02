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
        students.push({ name, phone, group, fee, marks: {}, attendance: {}, fees: {} });
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
    document.getElementById("monthlyFee").value = "";
}

function renderStudents() {
    let list = document.getElementById("studentList");
    let search = document.getElementById("searchBar").value.toLowerCase();
    let month = document.getElementById("monthSelect").value;
    list.innerHTML = "";

    students.filter(s => s.name.toLowerCase().includes(search)).forEach((s, idx) => {
        let sIdx = students.indexOf(s);
        if(!s.attendance) s.attendance = {};
        if(!s.attendance[month]) s.attendance[month] = ["-","-","-","-"];
        if(!s.fees) s.fees = {};
        
        let isPaid = s.fees[month] === "Paid";
        let score = s.marks?.[month] || 0;

        let card = document.createElement("div");
        card.className = "student-card";
        card.style.borderLeft = isPaid ? "8px solid #27ae60" : "8px solid #e74c3c";
        
        card.innerHTML = `
            <h3>${s.name} <span style="font-size:12px; color:${isPaid?'#27ae60':'#e74c3c'}">${isPaid?'(Paid)':'(Unpaid)'}</span></h3>
            <small>${s.group} | Fee: Rs.${s.fee}</small>
            
            <div style="margin:10px 0;">
                ${s.attendance[month].map((a, i) => `<button class="att-btn ${a==='P'?'present':a==='A'?'absent':''}" onclick="mark(${sIdx},'${month}',${i})">${a}</button>`).join('')}
            </div>

            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <button onclick="togglePaid(${sIdx}, '${month}')" style="background:${isPaid?'#95a5a6':'#2ecc71'}; width:auto; padding:5px 15px;">
                    ${isPaid ? 'Mark as Unpaid' : '✅ Mark as Paid'}
                </button>
                <button onclick="editStudent(${sIdx})" style="background:#34495e; width:auto; padding:5px 15px;">Edit</button>
            </div>

            <button class="wa-btn" onclick="sendProgress(${sIdx}, '${month}')">📊 Send Progress Report</button>
            <button onclick="del(${sIdx})" style="color:red; background:none; border:none; margin-top:10px; cursor:pointer; font-size:12px;">Remove Student</button>
        `;
        list.appendChild(card);
    });

    updatePendingList();
}

function togglePaid(sIdx, month) {
    if(!students[sIdx].fees) students[sIdx].fees = {};
    students[sIdx].fees[month] = (students[sIdx].fees[month] === "Paid") ? "Unpaid" : "Paid";
    saveData();
    renderStudents();
}

function updatePendingList() {
    let month = document.getElementById("monthSelect").value;
    let display = document.getElementById("pendingDisplay");
    display.innerHTML = "";

    let groups = [...new Set(students.map(s => s.group))];

    groups.forEach(groupName => {
        let unpaid = students.filter(s => s.group === groupName && (!s.fees || s.fees[month] !== "Paid"));

        if (unpaid.length > 0) {
            let groupDiv = document.createElement("div");
            groupDiv.className = "card";
            groupDiv.style.border = "1px solid #ddd";
            
            let namesList = unpaid.map((s, i) => `${i+1}. ${s.name}`).join("\n");
            let waMsg = `*${groupName} - ${month} මාසය සඳහා ගාස්තු ගෙවීමට ඇති සිසුන්:*\n\n${namesList}\n\nකරුණාකර හැකි ඉක්මනින් ගාස්තු පියවීමට කටයුතු කරන්න. ස්තූතියි!`;

            groupDiv.innerHTML = `
                <strong style="color:#c0392b;">${groupName}</strong>
                <pre style="background:#fdfefe; padding:8px; border-radius:5px; font-size:12px;">${namesList}</pre>
                <button onclick="copyToClipboard('${encodeURIComponent(waMsg)}')" style="background:#25D366; color:white; padding:8px; border-radius:5px; border:none; width:100%;">Copy Group Message</button>
            `;
            display.appendChild(groupDiv);
        }
    });
}

function copyToClipboard(encodedMsg) {
    let msg = decodeURIComponent(encodedMsg);
    navigator.clipboard.writeText(msg).then(() => {
        alert("ලිස්ට් එක Copy වුණා! දැන් WhatsApp Group එකට පේස්ට් කරන්න.");
    });
}

function mark(sIdx, month, wIdx) {
    let curr = students[sIdx].attendance[month][wIdx];
    students[sIdx].attendance[month][wIdx] = curr === "P" ? "A" : curr === "A" ? "-" : "P";
    saveData(); renderStudents();
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

function sendProgress(idx, month) {
    let s = students[idx];
    let att = s.attendance[month].filter(a=>a==='P').length;
    let msg = `*Progress Report - ${month}*\nStudent: ${s.name}\nAttendance: ${att}/4\nFees: ${s.fees[month] || 'Pending'}`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

function del(idx) { if(confirm("Delete this student?")) { students.splice(idx,1); saveData(); renderStudents(); } }
