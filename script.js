// script.js (module) - Cleaned & de-duplicated Firestore-backed dashboard
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy, deleteDoc, doc, updateDoc, getDocs, where, writeBatch, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ---------- CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyCMhwCdyBmC3037SScytAYGmiXXnFiwFbI",
  authDomain: "request-materials-4b168.firebaseapp.com",
  projectId: "request-materials-4b168",
  storageBucket: "request-materials-4b168.firebasestorage.app",
  messagingSenderId: "1088278709255",
  appId: "1:1088278709255:web:138e1337bea754b21c16a2",
  measurementId: "G-F4FR8YJD99"
};
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (e) { /* ignore analytics errors */ }
const db = getFirestore(app);

// cloudinary placeholders (ready if you plan to use)
const cloudName = "dtmm8frik";
const uploadPreset = "Crrd2025";

// ---------- COLLECTIONS ----------
const requestsCol = collection(db, "requests");
const deliveredCol = collection(db, "delivered");
const usageCol = collection(db, "usage");

// ---------- UI REFS ----------
const submitRequestBtn = document.getElementById("submitRequestBtn");
const submitModal = document.getElementById("submitModal");
const exitModalBtn = document.getElementById("exitModalBtn");
const submitDataBtn = document.getElementById("submitDataBtn");
const dateEl = document.getElementById("date");
const personnelEl = document.getElementById("personnel");
const particularEl = document.getElementById("particular");
const unitEl = document.getElementById("unit");
const qtyEl = document.getElementById("qty");
const toastEl = document.getElementById("toast");

const viewRequestBtn = document.getElementById("viewRequestBtn");
const viewRequestModal = document.getElementById("viewRequestModal");
const requestsTbody = document.getElementById("requestsTbody");
const closeRequestsBtn = document.getElementById("closeRequestsBtn");
const closeRequestsBtnTop = document.getElementById("closeRequestsBtnTop");
const openAddDeliveredFromRequestsBtn = document.getElementById("openAddDeliveredFromRequestsBtn");
const openAddUsageFromRequestsBtn = document.getElementById("openAddUsageFromRequestsBtn");
const searchRequests = document.getElementById("searchRequests");
const printRequestsBtn = document.getElementById("printRequestsBtn");

const viewDeliveredBtn = document.getElementById("viewDeliveredBtn");
const deliveredModal = document.getElementById("deliveredModal");
const deliveredTbody = document.getElementById("deliveredTbody");
const closeDeliveredBtn = document.getElementById("closeDeliveredBtn");
const closeDeliveredBtnTop = document.getElementById("closeDeliveredBtnTop");
const addDeliveredBtn = document.getElementById("addDeliveredBtn");
const searchDelivered = document.getElementById("searchDelivered");
const printDeliveredBtn = document.getElementById("printDeliveredBtn");

// edit delivered modal
const editDeliveredModal = document.getElementById("editDeliveredModal");
const editDeliveredTitle = document.getElementById("editDeliveredTitle");
const deliveredRequestSelect = document.getElementById("deliveredRequestSelect");
const deliveredRequestSearch = document.getElementById("deliveredRequestSearch");
const editDeliveredParticular = document.getElementById("editDeliveredParticular");
const editDeliveredUnit = document.getElementById("editDeliveredUnit");
const editDeliveredQty = document.getElementById("editDeliveredQty");
const saveDeliveredBtn = document.getElementById("saveDeliveredBtn");
const cancelEditDeliveredBtn = document.getElementById("cancelEditDeliveredBtn");

const viewRemainingBtn = document.getElementById("viewRemainingBtn");
const remainingModal = document.getElementById("remainingModal");
const remainingTbody = document.getElementById("remainingTbody");
const closeRemainingBtn = document.getElementById("closeRemainingBtn");
const closeRemainingBtnTop = document.getElementById("closeRemainingBtnTop");
const searchRemaining = document.getElementById("searchRemaining");
const printRemainingBtn = document.getElementById("printRemainingBtn");

const viewUsageBtn = document.getElementById("viewUsageBtn");
const usageModal = document.getElementById("usageModal");
const usageTbody = document.getElementById("usageTbody");
const closeUsageBtn = document.getElementById("closeUsageBtn");
const closeUsageBtnTop = document.getElementById("closeUsageBtnTop");
const addUsageBtn = document.getElementById("addUsageBtn");
const searchUsage = document.getElementById("searchUsage");
const printUsageBtn = document.getElementById("printUsageBtn");

// edit usage modal
const editUsageModal = document.getElementById("editUsageModal");
const editUsageTitle = document.getElementById("editUsageTitle");
const usageRequestSelect = document.getElementById("usageRequestSelect");
const usageRequestSearch = document.getElementById("usageRequestSearch");
const editUsageParticular = document.getElementById("editUsageParticular");
const editUsageUnit = document.getElementById("editUsageUnit");
const editUsageQty = document.getElementById("editUsageQty");
const editUsageRemarks = document.getElementById("editUsageRemarks");
const saveUsageBtn = document.getElementById("saveUsageBtn");
const cancelEditUsageBtn = document.getElementById("cancelEditUsageBtn");

const viewHistoryBtn = document.getElementById("viewHistoryBtn");
const historyModal = document.getElementById("historyModal");
const historyTbody = document.getElementById("historyTbody");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const closeHistoryBtnTop = document.getElementById("closeHistoryBtnTop");
const searchHistory = document.getElementById("searchHistory");
const printHistoryBtn = document.getElementById("printHistoryBtn");

// editing state
let editingDeliveredId = null;
let editingUsageId = null;

// ---------- small UI helpers ----------
function openModal(el){
  if(!el) return;
  el.classList.add("fullscreen");
  el.style.display = "flex";
  el.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeModal(el){
  if(!el) return;
  el.style.display = "none";
  el.classList.remove("fullscreen");
  el.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}
function showToast(msg){ 
  if(!toastEl) {
    // fallback: SweetAlert2 toast
    try{ Swal.fire({ toast:true, position:'top-end', icon:'info', title: msg, showConfirmButton:false, timer:2000 }); } catch(e){}
    return;
  }
  toastEl.textContent = msg; 
  toastEl.className = "show"; 
  setTimeout(()=> toastEl.className = "", 3000); 
}
function showAlertSuccess(title = "Success", text = "") {
  try{ Swal.fire({ icon: "success", title, text }); } catch(e){ showToast(`${title} ${text}`); }
}
function showAlertError(title = "Error", text = "") {
  try{ Swal.fire({ icon: "error", title, text }); } catch(e){ showToast(`${title} ${text}`); }
}
function fmtDate(ts){ try{ return ts?.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString(); } catch(e){ return ""; } }
function escapeHtml(s){ if(!s) return ""; return s.toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
function normKey(s){ return (s||"").toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }

// compute remaining helpers
function remainingForDelivered(req) {
  if(req?.remainingForDelivered != null) return Number(req.remainingForDelivered);
  return Number(req.qty ?? 0);
}
function remainingForUsage(req) {
  if(req?.remainingForUsage != null) return Number(req.remainingForUsage);
  return Number(req.qty ?? 0);
}

// ---------- Modal button centering helper (add .modal-footer or .modal-actions in HTML) ----------
(function centerModalActions(){
  // if you place modal bottom buttons in container with class 'modal-footer' or 'modal-actions', this will center them
  const footers = document.querySelectorAll(".modal-footer, .modal-actions");
  footers.forEach(f => {
    f.style.display = "flex";
    f.style.justifyContent = "center";
    f.style.gap = "8px";
    f.style.flexWrap = "wrap";
    f.style.padding = "12px";
  });
})();

// ---------- Submit Request ----------
submitRequestBtn?.addEventListener("click", ()=>{
  dateEl.value = new Date().toLocaleString();
  openModal(submitModal);
});
exitModalBtn?.addEventListener("click", ()=> closeModal(submitModal));

submitDataBtn?.addEventListener("click", async ()=>{
  const personnel = personnelEl.value.trim();
  const particular = particularEl.value.trim();
  const unit = unitEl.value.trim();
  const qty = Number(qtyEl.value);
  if(!personnel || !particular || !unit || !qty || qty <= 0){ showToast("⚠️ Fill all fields"); return; }
  try{
    await addDoc(requestsCol, {
      personnel, particular, unit, qty,
      remainingForDelivered: qty,
      remainingForUsage: qty,
      deliveredFulfilled: false,
      usageFulfilled: false,
      createdAt: serverTimestamp()
    });
    showAlertSuccess("Request submitted");
    personnelEl.value = ""; particularEl.value = ""; unitEl.value = ""; qtyEl.value = "";
    closeModal(submitModal);
  } catch(e){ console.error(e); showAlertError("Submit failed", e.message || ""); }
});

// ---------- Requests live listener ----------
const requestsQ = query(requestsCol, orderBy("createdAt","desc"));
let latestRequestsArray = []; // keep a local snapshot for quick filtering / selects

onSnapshot(requestsQ, snapshot=>{
  requestsTbody.innerHTML = "";
  const deliveredSelectList = [];
  const usageSelectList = [];
  latestRequestsArray = [];

  snapshot.forEach(docSnap=>{
    const d = docSnap.data(); const id = docSnap.id;
    const remD = remainingForDelivered(d);
    const remU = remainingForUsage(d);
    const date = fmtDate(d.createdAt);
    const remLabel = `D:${remD} | U:${remU}`;

    // push into local arr for selects & filtering
    latestRequestsArray.push({ id, ...d, remainingForDelivered: remD, remainingForUsage: remU, createdAt: d.createdAt });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:left;padding-left:10px">${escapeHtml(d.personnel)}</td>
      <td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
      <td>${escapeHtml(d.unit)}</td>
      <td>${d.qty ?? 0}</td>
      <td>${remLabel}</td>
      <td>${date}</td>
      <td>
        <button class="table-btn small-edit" data-id="${id}" data-action="delete">Delete</button>
      </td>
    `;
    requestsTbody.appendChild(tr);

    if(!d.deliveredFulfilled && remD > 0) {
      deliveredSelectList.push({ id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForDelivered: remD, createdAt: d.createdAt });
    }
    if(!d.usageFulfilled && remU > 0) {
      usageSelectList.push({ id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForUsage: remU, createdAt: d.createdAt });
    }
  });

  // bind delete buttons
  requestsTbody.querySelectorAll("button[data-action='delete']").forEach(btn=>{
    btn.onclick = async () => {
      const id = btn.dataset.id;
      try{
        const confirmed = await Swal.fire({
          title: 'Delete request?',
          text: "This will delete the request and all related Delivered & Usage records.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, delete',
        });
        if(!confirmed.isConfirmed) return;
      } catch(e){}
      if(!confirm("Delete this request and all related Delivered & Usage records?")) return;
      try{
        await cascadeDeleteRequest(id);
        showAlertSuccess("Request deleted");
      } catch(err){ console.error(err); showAlertError("Delete failed", err.message || ""); }
    };
  });

  // fill selects with alphabetized items
  fillDeliveredSelect(deliveredSelectList);
  fillUsageSelect(usageSelectList);
});

// open/close request modal
viewRequestBtn?.addEventListener("click", ()=> openModal(viewRequestModal));
closeRequestsBtn?.addEventListener("click", ()=> closeModal(viewRequestModal));
closeRequestsBtnTop?.addEventListener("click", ()=> closeModal(viewRequestModal));

// search requests (filter table rows)
searchRequests?.addEventListener("input", ()=> filterTableRows(requestsTbody, searchRequests.value));

// print requests
printRequestsBtn?.addEventListener("click", ()=> printTable("Requests", document.getElementById("requestsTable")));

// open add delivered/usage from requests
openAddDeliveredFromRequestsBtn?.addEventListener("click", ()=> {
  editingDeliveredId = null;
  editDeliveredTitle.textContent = "Add Delivered (select request)";
  editDeliveredParticular.value = ""; editDeliveredUnit.value = ""; editDeliveredQty.value = 1;
  deliveredRequestSelect.value = "";
  openModal(editDeliveredModal);
});
openAddUsageFromRequestsBtn?.addEventListener("click", ()=> {
  editingUsageId = null;
  editUsageTitle.textContent = "Add Usage (select request)";
  editUsageParticular.value = ""; editUsageUnit.value = ""; editUsageQty.value = 1; editUsageRemarks.value = "";
  usageRequestSelect.value = "";
  openModal(editUsageModal);
});

// cascade delete
async function cascadeDeleteRequest(requestId){
  const batch = writeBatch(db);
  const reqRef = doc(db, "requests", requestId);
  batch.delete(reqRef);
  const delQ = query(deliveredCol, where("fromRequestId", "==", requestId));
  const delSnap = await getDocs(delQ);
  delSnap.forEach(s => batch.delete(doc(db, "delivered", s.id)));
  const usageQ = query(usageCol, where("fromRequestId", "==", requestId));
  const usageSnap = await getDocs(usageQ);
  usageSnap.forEach(s => batch.delete(doc(db, "usage", s.id)));
  await batch.commit();
}

// ---------- Delivered add/edit/toggle ----------
viewDeliveredBtn?.addEventListener("click", ()=> openModal(deliveredModal));
closeDeliveredBtn?.addEventListener("click", ()=> closeModal(deliveredModal));
closeDeliveredBtnTop?.addEventListener("click", ()=> closeModal(deliveredModal));
addDeliveredBtn?.addEventListener("click", ()=>{
  editingDeliveredId = null;
  editDeliveredTitle.textContent = "Add Delivered";
  deliveredRequestSelect.value = "";
  editDeliveredParticular.value = ""; editDeliveredUnit.value = ""; editDeliveredQty.value = 1;
  openModal(editDeliveredModal);
});
cancelEditDeliveredBtn?.addEventListener("click", ()=> closeModal(editDeliveredModal));

saveDeliveredBtn?.addEventListener("click", async ()=>{
  const particular = editDeliveredParticular.value.trim();
  const unit = editDeliveredUnit.value.trim();
  const qty = Number(editDeliveredQty.value);
  const linkedRequestId = deliveredRequestSelect.value || null;
  if(!particular || !unit || !qty || qty <= 0){ showToast("⚠️ Fill delivered fields"); return; }
  try{
    if(editingDeliveredId){
      await updateDoc(doc(db, "delivered", editingDeliveredId), { particular, unit, qty, updatedAt: serverTimestamp() });
      showAlertSuccess("Delivered updated");
    } else {
      await addDoc(deliveredCol, {
        particular, unit, qty,
        status: "pending",
        deliveredAt: serverTimestamp(),
        fromRequestId: linkedRequestId ?? null
      });
      showAlertSuccess("Delivered added");
      if(linkedRequestId){
        await decrementDeliveredRemaining(linkedRequestId, qty);
      }
    }
    closeModal(editDeliveredModal);
  } catch(e){ console.error(e); showAlertError("Save failed", e.message || ""); }
});

// delivered live listener
const deliveredQ = query(deliveredCol, orderBy("deliveredAt","desc"));
onSnapshot(deliveredQ, snapshot=>{
  deliveredTbody.innerHTML = "";
  snapshot.forEach(docSnap=>{
    const d = docSnap.data(); const id = docSnap.id;
    const date = fmtDate(d.deliveredAt);
    const status = d.status || "pending";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
      <td>${escapeHtml(d.unit)}</td>
      <td>${d.qty}</td>
      <td>${escapeHtml(status)}</td>
      <td>${date}</td>
      <td>
        <button class="table-btn small-mark" data-id="${id}" data-action="toggle">${ status === "completed" ? "Mark Pending" : "Mark Completed" }</button>
        <button class="table-btn small-edit" data-id="${id}" data-action="edit">Edit</button>
      </td>
    `;
    deliveredTbody.appendChild(tr);
  });

  deliveredTbody.querySelectorAll("button").forEach(btn=>{
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if(action === "toggle"){
        try{
          const ref = doc(db, "delivered", id);
          const snap = await getDoc(ref);
          if(!snap.exists()) return showToast("Record missing");
          const current = snap.data().status || "pending";
          const next = (current === "completed") ? "pending" : "completed";
          await updateDoc(ref, { status: next, updatedAt: serverTimestamp() });
          showToast(`Status set to ${next}`);
        } catch(e){ console.error(e); showAlertError("Toggle failed", e.message || ""); }
      } else if(action === "edit"){
        try{
          const ref = doc(db, "delivered", id);
          const snap = await getDoc(ref);
          if(!snap.exists()) return showToast("Record missing");
          const data = snap.data();
          editingDeliveredId = id;
          editDeliveredTitle.textContent = "Edit Delivered";
          deliveredRequestSelect.value = data.fromRequestId || "";
          editDeliveredParticular.value = data.particular || "";
          editDeliveredUnit.value = data.unit || "";
          editDeliveredQty.value = data.qty || 1;
          openModal(editDeliveredModal);
        } catch(e){ console.error(e); showAlertError("Fetch failed", e.message || ""); }
      }
    };
  });
});

// decrement delivered remaining only (and mark deliveredFulfilled if <=0)
async function decrementDeliveredRemaining(requestId, delta){
  try{
    const reqRef = doc(db, "requests", requestId);
    const snap = await getDoc(reqRef);
    if(!snap.exists()) return;
    const data = snap.data();
    const cur = Number(data.remainingForDelivered ?? data.qty ?? 0);
    const newRem = cur - Number(delta || 0);
    if(newRem <= 0){
      await updateDoc(reqRef, { remainingForDelivered: 0, deliveredFulfilled: true, updatedAt: serverTimestamp() });
      showToast("✅ Request fulfilled for Delivered (removed from Delivered select)");
    } else {
      await updateDoc(reqRef, { remainingForDelivered: newRem, updatedAt: serverTimestamp() });
      showToast(`✅ Delivered remaining updated: ${newRem}`);
    }
  } catch(err){ console.error("decrementDeliveredRemaining error:", err); }
}

// ---------- Usage add/edit ----------
viewUsageBtn?.addEventListener("click", ()=> { renderUsage(); openModal(usageModal); });
closeUsageBtn?.addEventListener("click", ()=> closeModal(usageModal));
closeUsageBtnTop?.addEventListener("click", ()=> closeModal(usageModal));

addUsageBtn?.addEventListener("click", ()=>{
  editingUsageId = null;
  editUsageTitle.textContent = "Add Usage";
  usageRequestSelect.value = "";
  editUsageParticular.value = ""; editUsageUnit.value = ""; editUsageQty.value = 1; editUsageRemarks.value = "";
  openModal(editUsageModal);
});
cancelEditUsageBtn?.addEventListener("click", ()=> closeModal(editUsageModal));

saveUsageBtn?.addEventListener("click", async ()=>{
  const particular = editUsageParticular.value.trim();
  const unit = editUsageUnit.value.trim();
  const qty = Number(editUsageQty.value);
  const remarks = editUsageRemarks.value.trim();
  const linkedRequestId = usageRequestSelect.value || null;
  if(!particular || !unit || !qty || qty <= 0){ showToast("⚠️ Fill usage fields"); return; }
  try{
    if(editingUsageId){
      await updateDoc(doc(db, "usage", editingUsageId), { particular, unit, qty, remarks, updatedAt: serverTimestamp() });
      showAlertSuccess("Usage updated");
    } else {
      await addDoc(usageCol, { particular, unit, qty, remarks, usedAt: serverTimestamp(), fromRequestId: linkedRequestId ?? null });
      showAlertSuccess("Usage added");
      if(linkedRequestId){
        await decrementUsageRemaining(linkedRequestId, qty);
      }
    }
    closeModal(editUsageModal);
  } catch(e){ console.error(e); showAlertError("Save failed", e.message || ""); }
});

// usage listener & render
function renderUsage(){
  const q = query(usageCol, orderBy("usedAt","desc"));
  onSnapshot(q, snapshot=>{
    usageTbody.innerHTML = "";
    snapshot.forEach(docSnap=>{
      const d = docSnap.data(); const id = docSnap.id;
      const date = fmtDate(d.usedAt);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
        <td>${escapeHtml(d.unit)}</td><td>${d.qty}</td><td>${date}</td><td>${escapeHtml(d.remarks || "")}</td>
        <td><button class="table-btn small-edit" data-id="${id}" data-action="edit">Edit</button></td>`;
      usageTbody.appendChild(tr);
    });

    usageTbody.querySelectorAll("button[data-action='edit']").forEach(btn=>{
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try{
          const snap = await getDoc(doc(db,"usage",id));
          if(!snap.exists()) return showToast("Record missing");
          const data = snap.data();
          editingUsageId = id;
          editUsageTitle.textContent = "Edit Usage Remarks";
          usageRequestSelect.value = data.fromRequestId || "";
          editUsageParticular.value = data.particular || "";
          editUsageUnit.value = data.unit || "";
          editUsageQty.value = data.qty || 1;
          editUsageRemarks.value = data.remarks || "";
          openModal(editUsageModal);
        } catch(e){ console.error(e); showAlertError("Fetch failed", e.message || ""); }
      };
    });
  });
}

// decrement usage remaining only (and mark usageFulfilled if <=0)
async function decrementUsageRemaining(requestId, delta){
  try{
    const reqRef = doc(db, "requests", requestId);
    const snap = await getDoc(reqRef);
    if(!snap.exists()) return;
    const data = snap.data();
    const cur = Number(data.remainingForUsage ?? data.qty ?? 0);
    const newRem = cur - Number(delta || 0);
    if(newRem <= 0){
      await updateDoc(reqRef, { remainingForUsage: 0, usageFulfilled: true, updatedAt: serverTimestamp() });
      showToast("✅ Request fulfilled for Usage (removed from Usage select)");
    } else {
      await updateDoc(reqRef, { remainingForUsage: newRem, updatedAt: serverTimestamp() });
      showToast(`✅ Usage remaining updated: ${newRem}`);
    }
  } catch(err){ console.error("decrementUsageRemaining error:", err); }
}

// ---------- Remaining: compute and show ----------
viewRemainingBtn?.addEventListener("click", ()=> { computeAndRenderRemaining(); openModal(remainingModal); });
closeRemainingBtn?.addEventListener("click", ()=> closeModal(remainingModal));
closeRemainingBtnTop?.addEventListener("click", ()=> closeModal(remainingModal));
searchRemaining?.addEventListener("input", ()=> filterTableRows(remainingTbody, searchRemaining.value));
printRemainingBtn?.addEventListener("click", ()=> printTable("Remaining Inventory", document.getElementById("remainingTable")));

async function computeAndRenderRemaining(){
  const reqSnap = await getDocs(requestsCol);
  const delSnap = await getDocs(deliveredCol);
  const usSnap = await getDocs(usageCol);
  const totals = {}; // key -> {particular, requested, delivered, used}
  reqSnap.forEach(s => {
    const d = s.data();
    const k = normKey(d.particular);
    totals[k] = totals[k] || { particular: d.particular, requested:0, delivered:0, used:0 };
    totals[k].requested += Number(d.qty || 0);
  });
  delSnap.forEach(s => {
    const d = s.data();
    const k = normKey(d.particular);
    totals[k] = totals[k] || { particular: d.particular, requested:0, delivered:0, used:0 };
    totals[k].delivered += Number(d.qty || 0);
  });
  usSnap.forEach(s => {
    const d = s.data();
    const k = normKey(d.particular);
    totals[k] = totals[k] || { particular: d.particular, requested:0, delivered:0, used:0 };
    totals[k].used += Number(d.qty || 0);
  });

  remainingTbody.innerHTML = "";
  const keys = Object.keys(totals).sort();
  if(keys.length === 0){ remainingTbody.innerHTML = `<tr><td colspan="5">No data</td></tr>`; return; }
  keys.forEach(k=>{
    const it = totals[k];
    const remaining = (it.delivered || 0) - (it.used || 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(it.particular)}</td>
      <td>${it.requested || 0}</td><td>${it.delivered || 0}</td><td>${it.used || 0}</td><td>${remaining}</td>`;
    remainingTbody.appendChild(tr);
  });
}

// ---------- History (monthly totals) ----------
viewHistoryBtn?.addEventListener("click", async ()=> { await renderHistory(); openModal(historyModal); });
closeHistoryBtn?.addEventListener("click", ()=> closeModal(historyModal));
closeHistoryBtnTop?.addEventListener("click", ()=> closeModal(historyModal));
searchHistory?.addEventListener("input", ()=> filterTableRows(historyTbody, searchHistory.value));
printHistoryBtn?.addEventListener("click", ()=> printTable("History Usage", document.getElementById("historyTable")));

async function renderHistory(){
  const snaps = await getDocs(usageCol);
  const totals = {};
  snaps.forEach(s=>{
    const d = s.data();
    const dt = d.usedAt?.toDate ? d.usedAt.toDate() : (d.usedAt ? new Date(d.usedAt) : new Date());
    const month = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    const key = `${d.particular}||${month}`;
    totals[key] = (totals[key]||0) + Number(d.qty || 0);
  });
  historyTbody.innerHTML = "";
  const keys = Object.keys(totals).sort();
  if(keys.length === 0){ historyTbody.innerHTML = `<tr><td colspan="3">No history</td></tr>`; return; }
  keys.forEach(k=>{
    const [particular, month] = k.split("||");
    const [y,m] = month.split("-");
    const monthLabel = new Date(Number(y), Number(m)-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"});
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(particular)}</td><td>${monthLabel}</td><td>${totals[k]}</td>`;
    historyTbody.appendChild(tr);
  });
}

// ---------- Helpers to populate selects ----------
function fillDeliveredSelect(requests){
  // requests: array of {id, personnel, particular, unit, remainingForDelivered, createdAt}
  deliveredRequestSelect.innerHTML = `<option value="">-- Select a submitted request --</option>`;
  // alphabetize by particular then personnel
  requests.sort((a,b)=> {
    const ka = (a.particular||"").toLowerCase();
    const kb = (b.particular||"").toLowerCase();
    if(ka < kb) return -1;
    if(ka > kb) return 1;
    return (a.personnel||"").toLowerCase().localeCompare((b.personnel||"").toLowerCase());
  });
  requests.forEach(r=>{
    const label = `${r.personnel} — ${r.particular} (remain D:${r.remainingForDelivered})`;
    const opt = document.createElement("option"); opt.value = r.id; opt.textContent = label;
    deliveredRequestSelect.appendChild(opt);
  });

  // when selecting a request, clear personnel selector (per requirement) and fill fields
  deliveredRequestSelect.onchange = () => {
    const rid = deliveredRequestSelect.value;
    const sel = latestRequestsArray.find(x=> x.id === rid);
    // clear personnel selection
    personnelEl.value = "";
    if(sel){ editDeliveredParticular.value = sel.particular; editDeliveredUnit.value = sel.unit; editDeliveredQty.value = sel.remainingForDelivered || sel.qty; }
    else { editDeliveredParticular.value=""; editDeliveredUnit.value=""; editDeliveredQty.value=1; }
  };

  // request-search filter for options
  deliveredRequestSearch.oninput = () => {
    const q = deliveredRequestSearch.value.toLowerCase().trim();
    Array.from(deliveredRequestSelect.options).forEach(opt=>{
      if(!opt.value){ opt.hidden = false; return; } // keep placeholder visible
      opt.hidden = !(opt.text.toLowerCase().includes(q));
    });
  };
}

function fillUsageSelect(requests){
  usageRequestSelect.innerHTML = `<option value="">-- Select a submitted request --</option>`;
  requests.sort((a,b)=> {
    const ka = (a.particular||"").toLowerCase();
    const kb = (b.particular||"").toLowerCase();
    if(ka < kb) return -1;
    if(ka > kb) return 1;
    return (a.personnel||"").toLowerCase().localeCompare((b.personnel||"").toLowerCase());
  });
  requests.forEach(r=>{
    const label = `${r.personnel} — ${r.particular} (remain U:${r.remainingForUsage})`;
    const opt = document.createElement("option"); opt.value = r.id; opt.textContent = label;
    usageRequestSelect.appendChild(opt);
  });

  usageRequestSelect.onchange = () => {
    const rid = usageRequestSelect.value;
    const sel = latestRequestsArray.find(x=> x.id === rid);
    personnelEl.value = "";
    if(sel){ editUsageParticular.value = sel.particular; editUsageUnit.value = sel.unit; editUsageQty.value = sel.remainingForUsage || sel.qty; }
    else { editUsageParticular.value=""; editUsageUnit.value=""; editUsageQty.value=1; }
  };

  usageRequestSearch.oninput = () => {
    const q = usageRequestSearch.value.toLowerCase().trim();
    Array.from(usageRequestSelect.options).forEach(opt=>{
      if(!opt.value){ opt.hidden = false; return; }
      opt.hidden = !(opt.text.toLowerCase().includes(q));
    });
  };
}

// Boot - initial fill of selects (one-shot)
(async function boot(){
  const reqSnap = await getDocs(requestsCol);
  const arrD = [];
  const arrU = [];
  reqSnap.forEach(s=>{
    const d = s.data();
    const remD = remainingForDelivered(d);
    const remU = remainingForUsage(d);
    if(!d.deliveredFulfilled && remD > 0){
      arrD.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForDelivered: remD, createdAt: d.createdAt });
    }
    if(!d.usageFulfilled && remU > 0){
      arrU.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForUsage: remU, createdAt: d.createdAt });
    }
  });
  fillDeliveredSelect(arrD);
  fillUsageSelect(arrU);
})();

// convenience loaders
async function loadDeliveredRecords() {
  const tbody = deliveredTbody;
  tbody.innerHTML = "";
  const snap = await getDocs(deliveredCol);
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const date = fmtDate(d.deliveredAt);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
      <td>${escapeHtml(d.unit)}</td><td>${d.qty}</td><td>${escapeHtml(d.status||"pending")}</td><td>${date}</td><td></td>`;
    tbody.appendChild(tr);
  });
}

async function loadUsageRecords() {
  const tbody = usageTbody;
  tbody.innerHTML = "";
  const snap = await getDocs(usageCol);
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const date = fmtDate(d.usedAt);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
      <td>${escapeHtml(d.unit)}</td><td>${d.qty}</td><td>${date}</td><td>${escapeHtml(d.remarks||"")}</td><td></td>`;
    tbody.appendChild(tr);
  });
}

async function loadRemainingRecords() { await computeAndRenderRemaining(); }
async function loadMaterialHistory() { await renderHistory(); }

// initial load
window.addEventListener("load", () => {
  loadDeliveredRecords();
  loadUsageRecords();
  loadRemainingRecords();
  loadMaterialHistory();
});

// ---------- Table filter helper ----------
function filterTableRows(tbodyEl, queryText){
  const q = (queryText || "").toString().toLowerCase().trim();
  Array.from(tbodyEl.querySelectorAll("tr")).forEach(tr=>{
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(q) ? "" : "none";
  });
}

// ---------- Print helper (prints table with title & timestamp) ----------
function printTable(title, tableEl){
  const html = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body{ font-family: Arial, Helvetica, sans-serif; padding:20px; color:#000 }
          h1{ font-size:18px; margin-bottom:8px }
          table{ width:100%; border-collapse:collapse; margin-top:10px }
          th,td{ border:1px solid #ddd; padding:8px; text-align:left; font-size:12px }
          th{ background:#f4f4f4; font-weight:700 }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div>Printed: ${new Date().toLocaleString()}</div>
        ${tableEl.outerHTML}
      </body>
    </html>
  `;
  const w = window.open("", "_blank", "width=900,height=700");
  if(!w) { showToast("⚠️ Popup blocked. Allow popups to print."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=> w.print(), 350);
}

// ---------- Utility: search input hookup for delivered/usage/request tables ----------
searchDelivered?.addEventListener("input", ()=> filterTableRows(deliveredTbody, searchDelivered.value));
searchUsage?.addEventListener("input", ()=> filterTableRows(usageTbody, searchUsage.value));
searchRequests?.addEventListener("input", ()=> filterTableRows(requestsTbody, searchRequests.value));

// ---------- Boot note: ensure selects update when requests change ----------
onSnapshot(requestsQ, snapshot=>{
  // rebuild selectable arrays for delivered/usage selects
  const arrD = [];
  const arrU = [];
  snapshot.forEach(s=>{
    const d = s.data();
    const remD = remainingForDelivered(d);
    const remU = remainingForUsage(d);
    if(!d.deliveredFulfilled && remD > 0){
      arrD.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForDelivered: remD, createdAt: d.createdAt });
    }
    if(!d.usageFulfilled && remU > 0){
      arrU.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForUsage: remU, createdAt: d.createdAt });
    }
  });
  fillDeliveredSelect(arrD);
  fillUsageSelect(arrU);
});
