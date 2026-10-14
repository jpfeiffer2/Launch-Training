(function () {
  'use strict';
  const config = window.LAUNCH_CERTIFICATE_CONFIG;
  if (!config || !config.endpoint) throw Error('Certificate delivery configuration is missing.');
  const key = 'launch_certificate_pending_v1:' + location.pathname;
  let attemptId = null, busy = false, job = null, completed = false;
  let status, retry;
  let automaticRetries = 0, retryTimer;
  const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
  function panel() {
    if (status) return;
    const box = document.createElement('div');
    box.className = 'no-print';box.id = 'launch-certificate-delivery';box.setAttribute('role','status');
    box.style.cssText = 'margin:16px 0;padding:12px 16px;border:1px solid #6cc24a;border-radius:10px;background:#f5faf3;color:#215b20;font:15px Arial,sans-serif';
    status = document.createElement('span');status.setAttribute('aria-live','polite');
    retry = document.createElement('button');retry.type = 'button';retry.textContent = 'Retry saving exam';retry.hidden = true;
    retry.style.cssText = 'margin-left:12px;padding:8px 12px;cursor:pointer';retry.onclick = () => {automaticRetries=0;if(job)deliver(job);};
    box.append(status,retry);
    const result = document.querySelector('#resultBox,#result');
    if (result) result.before(box);else document.body.appendChild(box);
  }
  function say(message,error) {panel();status.textContent = message;status.style.color = error ? '#a32222' : '#215b20';}
  function submitButtons() {return [...document.querySelectorAll('button[type="submit"],button[onclick*="gradeQuiz"],#submit,#submitBtn')];}
  function lockButtons() {submitButtons().forEach(b => b.disabled = true);}
  function snapshot(source) {
    let part = source.cloneNode(true),parent = source.parentElement;
    while(parent && parent !== document.body) {const wrapper = parent.cloneNode(false);wrapper.appendChild(part);part = wrapper;parent = parent.parentElement;}
    return part.outerHTML;
  }
  function certificateSource() {return document.querySelector('#resultBox,#result');}
  function saveJob(value) {try {localStorage.setItem(key,JSON.stringify(value));}catch(_) {say('Keep this page open while your exam is being saved.',true);}}
  function lookup(id) {
    return new Promise((resolve,reject) => {
      const callback = 'launchCertificateStatus_' + crypto.randomUUID().replace(/-/g,'');
      const script = document.createElement('script');let timer;
      function cleanup() {clearTimeout(timer);script.remove();delete window[callback];}
      window[callback] = data => {cleanup();resolve(data);};
      script.onerror = () => {cleanup();reject(Error('The exam save confirmation could not be read.'));};
      timer = setTimeout(() => {cleanup();reject(Error('The exam save confirmation timed out.'));},20000);
      script.src = config.endpoint + '?action=submissionStatus&submissionId=' + encodeURIComponent(id) + '&callback=' + callback + '&_=' + Date.now();
      document.head.appendChild(script);
    });
  }
  async function post(payload) {
    await fetch(config.endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...payload,secret:config.secret})});
  }
  async function confirm(id,pdf) {
    for(let i=0;i<12;i++) {
      const response = await lookup(id);
      if(response.recordsSaved && (!pdf || response.deliveryStatus !== 'Waiting PDF'))return response;
      await pause(2000);
    }
    throw Error(pdf ? 'The exam is saved, but certificate upload is not confirmed.' : 'Saving this exam is not confirmed yet.');
  }
  function base64(bytes) {let text='';for(let i=0;i<bytes.length;i+=16000)text+=String.fromCharCode(...bytes.slice(i,i+16000));return btoa(text);}
  async function deliver(value) {
    if(busy)return;clearTimeout(retryTimer);busy = true;panel();retry.hidden = true;lockButtons();
    try {
      say('Saving your exam result. Please keep this page open.');
      await post(value.payload);await confirm(value.payload.submissionId,false);
      if(value.payload.passed) {
        say('Exam result saved. Preparing your certificate for management.');
        let encoded = value.certificatePdfBase64;
        if (!encoded) {
        const host = document.createElement('div');host.innerHTML = value.certificateHtml;
        const source = host.querySelector('#resultBox,#result');
        const bytes = await window.launchGenerateCertificatePdf(source);
        encoded = base64(bytes);
        if(encoded.length>2800000)throw Error('The exam is saved, but the certificate exceeds the attachment size limit.');
        value.certificatePdfBase64 = encoded;saveJob(value);
        }
        await post({...value.payload,certificatePdfBase64:encoded});
      }
      const response = await confirm(value.payload.submissionId,value.payload.passed);
      const delivery = response.deliveryStatus;
      if(delivery === 'Sent')say('Exam result saved. Management notification sent.');
      else if(delivery === 'Pending' || delivery === 'Sending')say('Exam result saved. Management notification is queued for automatic delivery.');
      else say('Exam result saved. Management notification needs attention (' + delivery + ').',true);
      try {localStorage.removeItem(key);}catch(_) {}
      job = null;completed = true;automaticRetries = 0;
    } catch(error) {
      retry.hidden = false;
      if (automaticRetries < 3) {
        const delay = [5000,15000,30000][automaticRetries++];
        say(error.message + ' Retrying automatically. Please keep this page open.',true);
        retryTimer = setTimeout(() => {if(job)deliver(job);},delay);
      } else say(error.message + ' Click Retry to finish the same attempt.',true);
    }
    finally {busy = false;}
  }
  window.launchTrainingSubmitExamRecord = function (payload) {
    if(busy || job || completed)return;
    attemptId = attemptId || crypto.randomUUID();
    const employee = document.querySelector('#employeeName,#employee');
    const trainer = document.querySelector('#trainerName,#trainer');
    const date = document.querySelector('#quizDate,#date');
    const percent = Number(String(payload.percentage).replace('%',''));
    const enriched = {
      ...payload,submissionId:attemptId,passed:percent>=80,
      trainerName:trainer ? trainer.value.trim() : '',examDate:date ? date.value : new Date().toLocaleDateString()
    };
    if(!enriched.name && employee)enriched.name=employee.value.trim();
    lockButtons();
    // Several original exams report before showing the certificate. Capture it
    // after the grading handler finishes, without changing their grading code.
    setTimeout(() => {
      panel();const source = certificateSource();
      if(!source) {say('Your exam result is shown, but certificate preparation could not start.',true);return;}
      job = {payload:enriched,certificateHtml:snapshot(source)};saveJob(job);deliver(job);
    },0);
  };
  function ready() {
    try {const stored = localStorage.getItem(key);if(stored){job=JSON.parse(stored);attemptId=job.payload.submissionId;panel();retry.hidden=false;lockButtons();say('An unfinished exam submission is saved here. Click Retry to finish it.',true);}}catch(_) {}
    // Existing reset handlers retain their behavior. If they hide the result,
    // start a new attempt ID; do not reset an unfinished delivery.
    document.addEventListener('click',event => {
      const button=event.target.closest('button');if(!button)return;
      const isReset=button.id==='resetBtn' || /resetQuiz/.test(button.getAttribute('onclick')||'');
      if(!isReset)return;
      if(busy || job){event.preventDefault();event.stopImmediatePropagation();say('Finish saving the current exam before starting another attempt.',true);return;}
      setTimeout(() => {const result=certificateSource();if(result && (getComputedStyle(result).display==='none' || !result.textContent.trim())) {attemptId=null;completed=false;submitButtons().forEach(b=>b.disabled=false);if(status)status.parentElement.remove();status=null;retry=null;}},0);
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
