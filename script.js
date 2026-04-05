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
    let selectedGrade = document.getElementById("gradeFilter").value;
    list.innerHTML = "";

    // 1. මුලින්ම Filter කරගන්නවා
    let filteredList = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade) || (!s.grade && selectedGrade === "All");
        return matchesSearch && matchesGrade;
    });

    // 2. රෑන්ක් එක හැදීම
    let rankedStudents = [...students].sort((a, b) => (b.marks?.[month] || 0) - (a.marks?.[month] || 0));

    // 3. දැන් ලිස්ට් එක පෙන්වනවා
    filteredList.forEach((s) => {
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
        
        // 🥇 🥈 🥉 Top 3 Badge එක තීරණය කිරීම
        let badge = "";
        if (score > 0) {
            if (rank === 1) badge = "🥇 1st Place";
            else if (rank === 2) badge = "🥈 2nd Place";
            else if (rank === 3) badge = "🥉 3rd Place";
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>#${rank} - ${s.name} <span style="font-size:12px; color:#3498db;">(${s.grade || 'N/A'})</span></h3>
                ${badge ? `<span style="background:#f1c40f; color:black; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold;">${badge}</span>` : ""}
            </div>
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
                <button onclick="send3WeekRemind(${sIdx}, '${month}')" style="background:#f39c12; font-size:12px; padding:8px;">⚠️ Remind</button>
                <button onclick="sendProgress(${sIdx}, '${month}', ${rank})" style="background:#3498db; font-size:12px; padding:8px;">📊 Rank</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 8px;">
                <button onclick="editStudent(${sIdx})" style="background:none; color:gray; border:none; font-size:11px; cursor:pointer;">📝 Edit Details</button>
                <button onclick="deleteStudent(${sIdx})" style="background:none; color:#e74c3c; border:none; font-size:11px; cursor:pointer; font-weight:bold;">🗑️ Remove Student</button>
            </div>
        `;
        list.appendChild(card);
    });

    updatePendingList();
    updateIncomeSummary();
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
    
    // මැසේජ් එකට මාසය එකතු කරලා තියෙන්නේ මෙතනින්
    let msg = `දෙමාපියන්ගේ අවධානය පිණිසයි,\n\n` +
              `ඔබගේ දරුවා (*${s.name}*) *${month}* මාසයේ සති 3ක් පන්තියට පැමිණ ඇතත්, අදාළ මාසය සඳහා ගාස්තු ගෙවා ඇති බව පද්ධතියේ සටහන්ව නොමැත.\n\n` +
              `කරුණාකර ඒ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;

    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

// රෑන්ක් එකත් එක්ක ප්‍රගති වාර්තාව යැවීම
function sendProgress(idx, month, rank) {
    let s = students[idx];
    let att = s.attendance[month].filter(a => a === 'P').length;
    let score = s.marks[month] || 0;
    let paidStatus = (s.fees && s.fees[month] === "Paid") ? "Paid ✅" : "Pending ❌";

    // ලකුණු අනුව මුළු පන්තියම පිළිවෙලට සකස් කිරීම (Top 3 හොයාගන්න)
    let rankedAll = [...students]
        .filter(st => st.group === s.group) // ඒ පන්තියේ ළමයි විතරක් ගන්නවා
        .sort((a, b) => (b.marks?.[month] || 0) - (a.marks?.[month] || 0));

    let first = rankedAll[0] ? `${rankedAll[0].marks[month] || 0}` : "0";
    let second = rankedAll[1] ? `${rankedAll[1].marks[month] || 0}` : "0";
    let third = rankedAll[2] ? `${rankedAll[2].marks[month] || 0}` : "0";

    // WhatsApp මැසේජ් එකේ අලුත් පෙනුම
    let msg = `Student: *${s.name}*\n` +
              `Grade: *${s.grade || 'N/A'}*\n` +
              `--------------------------\n` +
              `🏆 Your Child's Score: *${score}*\n` +
              `📊 Class Rank: *${rank}*\n\n` +
              `📈 Class Performance (${s.group}):\n` +
              `- 🥇 1st Place: ${first}\n` +
              `- 🥈 2nd Place: ${second}\n` +
              `- 🥉 3rd Place: ${third}\n` +
              `--------------------------\n` +
              
              `Thank you!`;

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
    let grade = document.getElementById("studentGrade").value; // Grade එක ගන්නවා
    let group = document.getElementById("group").value;
    let fee = document.getElementById("monthlyFee").value;
    let editIdx = document.getElementById("editIdx").value;

    if(name === "" || phone === "") { alert("සම්පූර්ණ විස්තර ඇතුළත් කරන්න"); return; }

    if(editIdx === "") {
        students.push({ name, phone, grade, group, fee, marks: {}, attendance: {}, fees: {} });
    } else {
        // පරණ දත්ත වලට grade එක එකතු කරනවා
        students[editIdx].name = name;
        students[editIdx].phone = phone;
        students[editIdx].grade = grade;
        students[editIdx].group = group;
        students[editIdx].fee = fee;
        document.getElementById("editIdx").value = "";
        document.getElementById("formTitle").innerText = "+ Add Student";
    }
    saveData(); 
    renderStudents();
    
    // ලිස්ට් එක හිස් කරනවා
    document.getElementById("studentName").value = "";
    document.getElementById("parentPhone").value = "";
    document.getElementById("monthlyFee").value = "";
    document.getElementById("studentGrade").value = "Grade 6";
}
function updateIncomeSummary() {
    let month = document.getElementById("monthSelect").value;
    let summaryMonthLabel = document.getElementById("summaryMonth");
    if(summaryMonthLabel) summaryMonthLabel.innerText = month;

    let totalExpected = 0;
    let totalCollected = 0;
    
    // Grade Counts තියාගන්න Object එකක්
    let counts = {}; 

    students.forEach(s => {
        // 1. මුදල් ගණනය කිරීම
        let fee = parseFloat(s.fee) || 0;
        totalExpected += fee;
        if (s.fees && s.fees[month] === "Paid") {
            totalCollected += fee;
        }

        // 2. Grade එක අනුව ළමයි ගණන් කිරීම
        let g = s.grade || "N/A";
        counts[g] = (counts[g] || 0) + 1;
    });

    let totalPending = totalExpected - totalCollected;

    // --- HTML එකට දත්ත යැවීම ---
    document.getElementById("totalExpected").innerText = `Rs. ${totalExpected.toLocaleString()}`;
    document.getElementById("totalCollected").innerText = `Rs. ${totalCollected.toLocaleString()}`;
    document.getElementById("totalPending").innerText = `Rs. ${totalPending.toLocaleString()}`;
    
    // මුළු ළමයි ගණන පෙන්වීම
    document.getElementById("totalStudentsCount").innerText = students.length;

    // Grade අනුව විස්තරය ලස්සනට පෙන්වීම
    let gradeHtml = Object.keys(counts)
        .sort() // Grade ටික පිළිවෙලට සකස් කිරීම
        .map(g => `<span>${g}: ${counts[g]}</span>`)
        .join("");
    
    document.getElementById("gradeCounts").innerHTML = gradeHtml;
}

function deleteStudent(idx) {
    let s = students[idx];
    if(confirm(`ඔබට "${s.name}" ශිෂ්‍යයාව පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍ය බව සහතිකද?`)) {
        students.splice(idx, 1);
        saveData(); 
        renderStudents(); 
    }
}
