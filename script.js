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

function renderStudents() {
    let list = document.getElementById("studentList");
    let search = document.getElementById("searchBar").value.toLowerCase();
    let month = document.getElementById("monthSelect").value;
    list.innerHTML = "";

    // රෑන්ක් එක හැදීම (ලකුණු අනුව වැඩිම කෙනාගේ සිට අඩුම කෙනාට)
    let rankedStudents = [...students].sort((a, b) => (b.marks?.[month] || 0) - (a.marks?.[month] || 0));

    students.filter(s => s.name.toLowerCase().includes(search)).forEach((s, idx) => {
        let sIdx = students.indexOf(s);
        let rank = rankedStudents.findIndex(rs => rs.name === s.name) + 1;
        
        if(!s.attendance) s.attendance = {};
        if(!s.attendance[month]) s.attendance[month] = ["-","-","-","-"];
        if(!s.fees) s.fees = {};
        if(!s.marks) s.marks = {};

        let isPaid = s.fees[month] === "Paid";
        let score = s.marks[month] || 0;

        let card = document.createElement("div");
        card.className = "student-card";
        card.style.borderLeft = isPaid ? "8px solid #27ae60" : "8px solid #e74c3c";
        
        card.innerHTML = `
            <h3>#${rank} - ${s.name} <span style="font-size:12px;">Rank: ${rank}</span></h3>
            <small>${s.group} | Fee: Rs.${s.fee}</small>
            
            <div style="margin:10px 0;">
                ${s.attendance[month].map((a, i) => `<button class="att-btn ${a==='P'?'present':a==='A'?'absent':''}" onclick="mark(${sIdx},'${month}',${i})">${a}</button>`).join('')}
            </div>

            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <input type="number" id="m-${sIdx}" value="${score}" placeholder="Marks" style="width:70px; margin:0; padding:5px;">
                <button onclick="saveMarks(${sIdx}, '${month}')" style="background:#34495e; width:auto; padding:5px 10px; font-size:12px;">Add Marks</button>
            </div>

            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <button onclick="togglePaid(${sIdx}, '${month}')" style="background:${isPaid?'#95a5a6':'#2ecc71'}; font-size:12px; padding:8px;">
                    ${isPaid ? 'Paid ✅' : 'Mark as Paid'}
                </button>
                
                <button onclick="send3WeekRemind(${sIdx}, '${month}')" style="background:#f39c12; font-size:12px; padding:8px;">⚠️ 3-Week Remind</button>
                
                <button onclick="sendProgress(${sIdx}, '${month}', ${rank})" style="background:#3498db; font-size:12px; padding:8px;">📊 Send Rank</button>
            </div>

            <button onclick="editStudent(${sIdx})" style="background:none; color:gray; border:none; font-size:11px; cursor:pointer;">Edit Details</button>
        `;
        list.appendChild(card);
    });

    updatePendingList();
}

// ලකුණු සේව් කිරීම
function saveMarks(sIdx, month) {
    if(!students[sIdx].marks) students[sIdx].marks = {};
    students[sIdx].marks[month] = document.getElementById(`m-${sIdx}`).value;
    saveData();
    renderStudents(); // රෑන්ක් එක අප්ඩේට් වෙන්න ආයේ රෙන්ඩර් කරනවා
}

// 3 Week Reminder මැසේජ් එක
function send3WeekRemind(idx, month) {
    let s = students[idx];
    let msg = `ඔබගේ දරුවා (${s.name}) සති 3ක් පන්තියට *පැමිණ ඇත* ගාස්තු ගෙවා නැත. කරුණාකර ඒ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

// රෑන්ක් එකත් එක්ක ප්‍රගති වාර්තාව යැවීම
function sendProgress(idx, month, rank) {
    let s = students[idx];
    let att = s.attendance[month].filter(a=>a==='P').length;
    let msg = `*Progress Report - ${month}*\n\nStudent: ${s.name}\nClass Rank: No. ${rank}\nMarks: ${s.marks[month] || 0}\nAttendance: ${att}/4\nFees: ${(s.fees && s.fees[month] === "Paid") ? "Paid ✅" : "Pending"}\n\nKeep it up!`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

// සල්ලි ගෙවපු නැති අයගේ ලිස්ට් එක (Pending List)
function updatePendingList() {
    let month = document.getElementById("monthSelect").value;
    let display = document.getElementById("pendingDisplay");
    display.innerHTML = "";

    let groups = [...new Set(students.map(s => s.group))];

    groups.forEach(groupName => {
        let unpaid = students.filter(s => s.group === groupName && (!s.fees || s.fees[month] !== "Paid"));

        if (unpaid.length > 0) {
            let namesList = unpaid.map((s, i) => `${i+1}. ${s.name}`).join("\n");
            let waMsg = `*${groupName} - ${month} පන්තියට ගාස්තු ගෙවීමට ඇති සිසුන්:*\n\n${namesList}\n\nකරුණාකර ගෙවීම් පියවන්න.`;

            let div = document.createElement("div");
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #ddd";
            div.innerHTML = `
                <small><b>${groupName}</b></small>
                <pre style="font-size:11px;">${namesList}</pre>
                <button onclick="copyToClipboard('${encodeURIComponent(waMsg)}')" style="background:#25D366; font-size:11px; padding:5px;">Copy List</button>
            `;
            display.appendChild(div);
        }
    });
}

// අනිත් සාමාන්‍ය Functions (Edit, Delete, TogglePaid, Mark)
function togglePaid(sIdx, month) {
    if(!students[sIdx].fees) students[sIdx].fees = {};
    students[sIdx].fees[month] = (students[sIdx].fees[month] === "Paid") ? "Unpaid" : "Paid";
    saveData(); renderStudents();
}

function mark(sIdx, month, wIdx) {
    let curr = students[sIdx].attendance[month][wIdx];
    students[sIdx].attendance[month][wIdx] = curr === "P" ? "A" : curr === "A" ? "-" : "P";
    saveData(); renderStudents();
}

function copyToClipboard(encodedMsg) {
    navigator.clipboard.writeText(decodeURIComponent(encodedMsg)).then(() => alert("Copied!"));
}

function editStudent(idx) {
    let s = students[idx];
    document.getElementById("studentName").value = s.name;
    document.getElementById("parentPhone").value = s.phone;
    document.getElementById("group").value = s.group;
    document.getElementById("monthlyFee").value = s.fee;
    document.getElementById("editIdx").value = idx;
    window.scrollTo(0,0);
}

function addOrUpdateStudent() {
    let name = document.getElementById("studentName").value;
    let phone = document.getElementById("parentPhone").value;
    let group = document.getElementById("group").value;
    let fee = document.getElementById("monthlyFee").value;
    let editIdx = document.getElementById("editIdx").value;

    if(editIdx === "") {
        students.push({ name, phone, group, fee, marks: {}, attendance: {}, fees: {} });
    } else {
        students[editIdx] = { ...students[editIdx], name, phone, group, fee };
        document.getElementById("editIdx").value = "";
    }
    saveData(); renderStudents();
}
