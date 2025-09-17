// Simple client-side prototype using localStorage
// Data model: reports = [{id, desc, category, urgency, location, imageData, status, agent, beforePhoto, afterPhoto, createdAt}]

const STORAGE_KEY = 'cleancity_reports_v1';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function loadReports(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveReports(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

// --- Tabs
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  showTab(t.dataset.tab);
}));

function showTab(name){
  document.getElementById('citizenTab').style.display = name==='citizen' ? '' : 'none';
  document.getElementById('adminTab').style.display = name==='admin' ? '' : 'none';
  document.getElementById('agentTab').style.display = name==='agent' ? '' : 'none';
  refreshAll();
}

// --- Citizen controls
const cDesc = document.getElementById('c-desc');
const cCategory = document.getElementById('c-category');
const cUrgency = document.getElementById('c-urgency');
const cLocation = document.getElementById('c-location');
const cImage = document.getElementById('c-image');
const cPreview = document.getElementById('c-preview');
const submitReport = document.getElementById('submitReport');
const clearCitizen = document.getElementById('clearCitizen');
const useLocationBtn = document.getElementById('useLocation');

let currentImageData = null;
cImage.addEventListener('change', e => {
  const f = e.target.files[0];
  if(!f) { cPreview.style.display='none'; currentImageData = null; return; }
  const r = new FileReader();
  r.onload = () => {
    currentImageData = r.result;
    cPreview.src = currentImageData;
    cPreview.style.display = 'block';
  };
  r.readAsDataURL(f);
});

useLocationBtn.addEventListener('click', ()=> {
  if(!navigator.geolocation){ alert('Geolocation not available'); return; }
  useLocationBtn.textContent = 'Getting...';
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude, longitude} = pos.coords;
    cLocation.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    useLocationBtn.textContent = 'Use my location';
  }, err => {
    alert('Unable to fetch location');
    useLocationBtn.textContent = 'Use my location';
  });
});

submitReport.addEventListener('click', () => {
  const desc = cDesc.value.trim();
  if(!desc){ alert('Please enter a short description'); return; }
  const reports = loadReports();
  const r = {
    id: uid(),
    desc,
    category: cCategory.value,
    urgency: cUrgency.value,
    location: cLocation.value || '',
    imageData: currentImageData || null,
    status: 'Received',
    agent: null,
    beforePhoto: null,
    afterPhoto: null,
    createdAt: new Date().toISOString()
  };
  reports.unshift(r);
  saveReports(reports);
  // clear inputs
  cDesc.value=''; cLocation.value=''; cImage.value=''; cPreview.style.display='none'; currentImageData=null;
  refreshAll();
  alert('Report submitted (demo). Use Admin tab to assign an agent.');
});

// clear input
clearCitizen.addEventListener('click', ()=> {
  cDesc.value=''; cLocation.value=''; cImage.value=''; cPreview.style.display='none'; currentImageData=null;
});

// --- Admin area
const adminReports = document.getElementById('adminReports');
function renderAdmin(){
  adminReports.innerHTML = '';
  const reports = loadReports();
  if(!reports.length){ adminReports.innerHTML = '<div class="small-muted">No reports yet.</div>'; return; }
  reports.forEach(rep => {
    const wrap = document.createElement('div'); wrap.className='report';
    const left = document.createElement('div');
    const img = document.createElement('img');
    img.src = rep.imageData || '';
    img.style.display = rep.imageData ? '' : 'none';
    left.appendChild(img);
    const right = document.createElement('div'); right.style.flex='1';
    const h = document.createElement('div'); h.innerHTML=`<strong>${rep.desc}</strong>`;
    const meta = document.createElement('div'); meta.className='meta';
    meta.innerHTML = `${rep.category} • ${rep.urgency} • ${new Date(rep.createdAt).toLocaleString()}`;
    const status = document.createElement('div');
    status.innerHTML = `<span class="status ${rep.status==='Received'?'received':rep.status==='In Progress'?'inprogress':'resolved'}">${rep.status}</span>`;
    const loc = document.createElement('div'); loc.className='small-muted'; loc.textContent = rep.location || 'Location not provided';
    // actions
    const actions = document.createElement('div'); actions.style.marginTop='8px';
    const assignBtn = document.createElement('button'); assignBtn.className='small'; assignBtn.textContent = rep.agent ? `Assigned: ${rep.agent}` : 'Assign Agent';
    assignBtn.addEventListener('click', ()=> {
      const name = prompt('Assign agent name (demo):','Agent-'+Math.floor(Math.random()*90+10));
      if(!name) return;
      rep.agent = name;
      rep.status = 'In Progress';
      const list = loadReports().map(r=> r.id===rep.id ? rep : r);
      saveReports(list);
      refreshAll();
    });
    const viewBtn = document.createElement('button'); viewBtn.className='small ghost'; viewBtn.textContent='View';
    viewBtn.addEventListener('click', ()=> { showReportDetails(rep); });
    actions.appendChild(assignBtn); actions.appendChild(viewBtn);
    right.appendChild(h); right.appendChild(meta); right.appendChild(status); right.appendChild(loc); right.appendChild(actions);
    wrap.appendChild(left); wrap.appendChild(right); adminReports.appendChild(wrap);
  });
}

// --- Agent area
const agentTasks = document.getElementById('agentTasks');
function renderAgent(){
  agentTasks.innerHTML = '';
  const reports = loadReports().filter(r => r.status === 'In Progress');
  if(!reports.length){ agentTasks.innerHTML = '<div class="small-muted">No assigned tasks (In Progress).</div>'; return; }
  reports.forEach(rep => {
    const wrap = document.createElement('div'); wrap.className='report';
    const img = document.createElement('img'); img.src = rep.imageData || ''; img.style.display = rep.imageData ? '' : 'none';
    const right = document.createElement('div'); right.style.flex='1';
    right.innerHTML = `<strong>${rep.desc}</strong><div class="meta">${rep.category} • Assigned to: ${rep.agent || 'Unassigned'}</div>`;
    // verification/upload controls
    const beforeInput = document.createElement('input'); beforeInput.type='file'; beforeInput.accept='image/*';
    const afterInput = document.createElement('input'); afterInput.type='file'; afterInput.accept='image/*';
    const btnVerify = document.createElement('button'); btnVerify.className='small'; btnVerify.textContent='Upload before & after (then mark resolved)';
    btnVerify.addEventListener('click', ()=> {
      // read both files from inputs
      const bfile = beforeInput.files[0];
      const afile = afterInput.files[0];
      if(!bfile || !afile){ alert('Select both before and after photos.'); return; }
      const r1 = new FileReader();
      r1.onload = () => {
        rep.beforePhoto = r1.result;
        const r2 = new FileReader();
        r2.onload = () => {
          rep.afterPhoto = r2.result;
          rep.status = 'Resolved';
          const list = loadReports().map(x => x.id===rep.id ? rep : x);
          saveReports(list);
          refreshAll();
          alert('Marked resolved (demo). Citizen can view proof in Citizen tab.');
        };
        r2.readAsDataURL(afile);
      };
      r1.readAsDataURL(bfile);
    });
    right.appendChild(beforeInput); right.appendChild(afterInput); right.appendChild(btnVerify);
    wrap.appendChild(img); wrap.appendChild(right); agentTasks.appendChild(wrap);
  });
}

// --- Citizen view of own reports
const citizenReports = document.getElementById('citizenReports');
function renderCitizen(){
  citizenReports.innerHTML = '';
  const reports = loadReports();
  if(!reports.length){ citizenReports.innerHTML = '<div class="small-muted">No reports yet.</div>'; return; }
  reports.forEach(rep => {
    const wrap = document.createElement('div'); wrap.className='report';
    const img = document.createElement('img'); img.src = rep.imageData || ''; img.style.display = rep.imageData ? '' : 'none';
    const right = document.createElement('div'); right.style.flex='1';
    right.innerHTML = `<strong>${rep.desc}</strong><div class="meta">${rep.category} • ${new Date(rep.createdAt).toLocaleString()}</div>
      <div style="margin-top:6px"><span class="status ${rep.status==='Received'?'received':rep.status==='In Progress'?'inprogress':'resolved'}">${rep.status}</span></div>`;
    if(rep.beforePhoto || rep.afterPhoto){
      const proof = document.createElement('div'); proof.style.marginTop='8px';
      if(rep.beforePhoto){ const b = document.createElement('img'); b.src = rep.beforePhoto; b.style.width='100px'; b.style.marginRight='6px'; proof.appendChild(b); }
      if(rep.afterPhoto){ const a = document.createElement('img'); a.src = rep.afterPhoto; a.style.width='100px'; proof.appendChild(a); }
      right.appendChild(proof);
    }
    wrap.appendChild(img); wrap.appendChild(right); citizenReports.appendChild(wrap);
  });
}

// --- Helpers
function refreshAll(){
  renderAdmin();
  renderAgent();
  renderCitizen();
}

// show details (simple)
function showReportDetails(rep){
  const html = `
    Report: ${rep.desc}\nCategory: ${rep.category}\nUrgency: ${rep.urgency}\nLocation: ${rep.location || 'N/A'}\nStatus: ${rep.status}\nAssigned: ${rep.agent || 'N/A'}
  `;
  alert(html);
}

// --- Quick controls
document.getElementById('autoAssign').addEventListener('click', ()=> {
  const list = loadReports();
  let changed=false;
  list.forEach(r => { if(!r.agent){ r.agent = 'Agent-'+Math.floor(Math.random()*90+10); r.status='In Progress'; changed=true; }});
  if(changed){ saveReports(list); refreshAll(); alert('Auto-assigned agents to unassigned reports.'); } else alert('No unassigned reports found.');
});

document.getElementById('autoResolve').addEventListener('click', ()=> {
  const list = loadReports().map(r => {
    if(r.status==='In Progress'){ r.status='Resolved'; r.afterPhoto = r.afterPhoto || r.imageData; }
    return r;
  });
  saveReports(list); refreshAll(); alert('Auto-resolved In Progress items (demo).');
});

document.getElementById('resetAll').addEventListener('click', ()=> {
  if(confirm('Clear all demo data?')){ localStorage.removeItem(STORAGE_KEY); refreshAll(); }
});

// init
refreshAll();
