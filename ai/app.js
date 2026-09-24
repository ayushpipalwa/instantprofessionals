'use strict';
const workflows = {
  gst: ['GST', 'Prepare an input tax credit review checklist', 'Draft a GST notice response outline', 'Explain a GST reconciliation approach'],
  income_tax: ['Income Tax', 'Outline an income tax notice response', 'Create a return preparation checklist', 'Identify facts needed for a tax computation'],
  companies: ['Companies Act / ROC', 'Prepare an annual filing checklist', 'Draft a board resolution outline', 'Plan a company compliance review'],
  audit: ['Audit', 'Build an audit planning checklist', 'Draft an internal control questionnaire', 'Prepare a working paper outline'],
  fema: ['FEMA', 'Identify facts needed for an overseas investment review', 'Create a FEMA documentation checklist', 'Outline an inward remittance review'],
  ip: ['Trademark / IP', 'Draft a trademark examination response outline', 'Prepare a trademark filing checklist', 'Compare trademark and copyright protection'],
  documents: ['Document analysis', 'Summarise the attached text and flag missing facts', 'Extract obligations and deadlines from this text', 'Review this draft for inconsistencies'],
  drafting: ['Drafting', 'Draft a professional client email', 'Prepare an engagement letter outline', 'Draft a response with facts and open questions'],
  calculations: ['Calculations', 'Show a step-by-step calculation using my inputs', 'Check the arithmetic in this working', 'List assumptions needed for this computation'],
  research: ['Live research', 'Find current official guidance for my question', 'Verify an amendment and its effective date', 'Compare current guidance with the previous position']
};
const $ = id => document.getElementById(id);
let mode = 'gst', token = '', history = [], attached = null, controller = null;
const base = (window.IP_AI_CONFIG?.apiBase || '').replace(/\/$/, '');
const validBase = (() => { try { const u = new URL(base); return u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)); } catch { return false; } })();
function selectMode(key) {
  mode = key;
  $('mode-label').textContent = workflows[key][0];
  for (const button of $('modes').children) button.setAttribute('aria-pressed', String(button.dataset.mode === key));
  $('starters').replaceChildren();
  workflows[key].slice(1).forEach((prompt, i) => {
    const button = document.createElement('button');
    const title = document.createElement('strong'); title.textContent = ['Explore a question ↗', 'Create a first draft ↗', 'Review your approach ↗'][i];
    const description = document.createElement('span'); description.textContent = prompt;
    button.append(title, description); button.onclick = () => { $('prompt').value = prompt; $('prompt').focus(); };
    $('starters').append(button);
  });
}
Object.entries(workflows).forEach(([key, value]) => {
  const button = document.createElement('button'); button.textContent = value[0]; button.dataset.mode = key; button.onclick = () => selectMode(key); $('modes').append(button);
});
selectMode(mode);
function status(text) { $('status').textContent = text; }
function message(role, content) {
  const article = document.createElement('article'); article.className = `message ${role}`;
  const title = document.createElement('strong'); title.textContent = role === 'user' ? 'YOU' : 'INSTANT PROFESSIONALS AI';
  article.append(title, document.createTextNode(content)); $('messages').append(article);
  $('welcome').hidden = true;
}
$('connect').onclick = () => { $('endpoint-label').textContent = validBase ? `Service: ${base}` : 'Preview only: your administrator must configure ai/config.js.'; $('settings').showModal(); };
$('save-connection').onclick = () => { token = $('token').value.trim(); $('token').value = ''; status(validBase && token ? 'Ready · Messages will be sent to your team’s AI provider.' : 'Preview mode · Service address and team access token required.'); };
$('settings').addEventListener('close', () => { $('token').value = ''; });
function clearAttachment() { attached = null; $('document').value = ''; $('attachment').replaceChildren(); $('attachment').hidden = true; }
$('document').onchange = async event => {
  const file = event.target.files[0]; clearAttachment(); if (!file) return;
  if (!/\.(txt|md|csv)$/i.test(file.name) || file.size > 24000) { status('Use a TXT, Markdown or CSV document up to 24 KB. PDF and Word support are not enabled in this preview.'); return; }
  let content;
  try { content = await file.text(); } catch { status('This document could not be read. Please try another text file.'); return; }
  if (content.length > 16000 || content.includes('\u0000')) { status('Document must be plain text with at most 16,000 characters.'); return; }
  attached = { name: file.name, content }; $('attachment').hidden = false;
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.onclick = clearAttachment;
  $('attachment').append(document.createTextNode(`${file.name} · Sent with your next message. `), remove);
  status('Document ready. Remove confidential identifiers before sending.');
};
$('stop').onclick = () => controller?.abort();
$('new-chat').onclick = () => {
  controller?.abort(); history = []; $('messages').replaceChildren(); $('welcome').hidden = false; $('prompt').value = ''; clearAttachment(); status('New conversation · Previous messages cleared from this tab.');
};
$('chat-form').onsubmit = async event => {
  event.preventDefault(); if (controller) return;
  const prompt = $('prompt').value.trim(); if (!prompt) return;
  if (!validBase || !token) { status('Connect your team’s service in Connection settings before sending. No message was sent.'); return; }
  const content = prompt + (attached ? `\n\n[User-supplied document: ${attached.name}]\n${attached.content}\n[End document]` : '');
  const pending = [...history, { role: 'user', content }];
  if (pending.length > 20 || pending.reduce((n, m) => n + m.content.length, 0) > 60000) { status('Conversation limit reached. Start a new conversation.'); return; }
  controller = new AbortController(); const current = controller;
  $('send').disabled = true; $('stop').hidden = false; $('new-chat').disabled = true;
  $('prompt').disabled = true; $('document').disabled = true;
  for (const button of $('modes').children) button.disabled = true;
  status('Working on your request…');
  const timeout = setTimeout(() => current.abort(), 55000);
  try {
    const response = await fetch(`${base}/chat`, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mode, messages: pending }), signal: current.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The service could not complete this request.');
    if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('The service returned an empty answer.');
    message('user', content); message('assistant', result.reply); history = [...pending, { role: 'assistant', content: result.reply }];
    $('prompt').value = ''; clearAttachment(); status('Draft ready · Check sources and calculations before use.');
  } catch (error) { status(error.name === 'AbortError' ? 'Request stopped or timed out. Your draft is preserved.' : error.message); }
  finally {
    clearTimeout(timeout); controller = null; $('send').disabled = false; $('stop').hidden = true; $('new-chat').disabled = false;
    $('prompt').disabled = false; $('document').disabled = false;
    for (const button of $('modes').children) button.disabled = false;
  }
};
