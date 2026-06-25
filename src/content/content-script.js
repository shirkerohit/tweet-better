// Tweet Better  v0.2.4 — Select text → Generate → Pick reply → Insert
(function () {
  'use strict';
  if (window.__TWITTER_COPILOT_V2__) return;
  window.__TWITTER_COPILOT_V2__ = true;

  var toolbar = null;
  var picker = null;
  var lastSelection = '';
  var lastSelectionRect = null;
  var lastTweetArticle = null;
  var currentGenId = 0;
  var pendingGenId = 0;

  // ─── Styles ───────────────────────────────────────────────
  var CSS = document.createElement('style');
  CSS.textContent = `
    #tac-toolbar, #tac-picker { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; z-index: 2147483646; }
    #tac-toolbar {
      position: fixed; display: none; gap: 4px; padding: 4px;
      background: #15202b; border: 1px solid #38444d; border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,.5);
    }
    #tac-toolbar button {
      background: #1d9bf0; color: #fff; border: none; border-radius: 6px;
      padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    #tac-toolbar button:hover { background: #1a8cd8; }
    #tac-picker {
      position: fixed; width: 360px; max-height: min(70vh, 480px);
      overflow-y: auto; background: #15202b; border: 1px solid #38444d; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,.55); display: none; color: #e7e9ea;
    }
    #tac-picker .tac-head {
      padding: 12px 14px; border-bottom: 1px solid #38444d; display: flex;
      justify-content: space-between; align-items: center; position: sticky; top: 0;
      background: #15202b; border-radius: 12px 12px 0 0; z-index: 1;
    }
    #tac-picker .tac-head h3 { margin: 0; font-size: 14px; color: #1d9bf0; }
    #tac-picker .tac-close { background: none; border: none; color: #71767b; font-size: 20px; cursor: pointer; line-height: 1; }
    #tac-picker .tac-close:hover { color: #e7e9ea; }
    #tac-picker .tac-source { padding: 10px 14px; font-size: 12px; color: #71767b; border-bottom: 1px solid #38444d; }
    #tac-picker .tac-source em { color: #e7e9ea; font-style: normal; }
    #tac-picker .tac-card {
      margin: 10px 12px; padding: 12px; background: #1e2732; border: 1px solid #38444d;
      border-radius: 10px;
    }
    #tac-picker .tac-card .tac-tone { font-size: 11px; color: #1d9bf0; font-weight: 600; margin-bottom: 6px; }
    #tac-picker .tac-card .tac-text { font-size: 14px; line-height: 1.45; margin-bottom: 10px; }
    #tac-picker .tac-insert {
      background: #1d9bf0; color: #fff; border: none; border-radius: 6px;
      padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    #tac-picker .tac-insert:hover { background: #1a8cd8; }
    #tac-picker .tac-insert:disabled { opacity: .6; cursor: default; }
    #tac-picker .tac-status { font-size: 11px; color: #71767b; margin-left: 8px; }
    #tac-picker .tac-loading { padding: 24px; text-align: center; color: #71767b; font-size: 13px; }
    #tac-picker .tac-error { padding: 16px; color: #f4212e; font-size: 13px; }
    #tac-fab {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483645;
      background: #1d9bf0; color: #fff; border: none; border-radius: 999px;
      padding: 12px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 16px rgba(29,155,240,.45); display: flex; align-items: center; gap: 8px;
    }
  `;
  document.documentElement.appendChild(CSS);

  // ─── Helpers ──────────────────────────────────────────────
  function getSelectionText() {
    var sel = window.getSelection();
    return sel ? sel.toString().trim() : '';
  }

  function getSelectionRect() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return sel.getRangeAt(0).getBoundingClientRect();
  }

  function findTweetArticle(node) {
    var el = node && (node.nodeType === 3 ? node.parentElement : node);
    while (el && el !== document.body) {
      if (el.matches && el.matches('article[data-testid="tweet"], article[role="article"]')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function isOurUI(el) {
    return !!(el && el.closest && (el.closest('#tac-picker') || el.closest('#tac-toolbar') || el.closest('#tac-fab')));
  }

  function isEditableElement(el) {
    if (!el || el === document.body || el === document.documentElement || isOurUI(el)) return false;
    var tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') {
      var type = (el.type || 'text').toLowerCase();
      return type === 'text' || type === 'search' || type === 'email' || type === 'url' || type === 'tel' || type === 'password' || type === '';
    }
    return el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox';
  }

  function dispatchInput(el, text) {
    try {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    } catch (e) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setElementText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = text;
      dispatchInput(el, text);
      return;
    }
    try {
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      if (document.execCommand('insertText', false, text)) {
        dispatchInput(el, text);
        return;
      }
    } catch (e) { /* fall through */ }
    el.textContent = text;
    dispatchInput(el, text);
  }

  function findVisibleComposer() {
    var selectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea_1"]',
      'div[data-testid^="tweetTextarea"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][data-testid="dmComposerTextInput"]',
    ];
    for (var s = 0; s < selectors.length; s++) {
      var nodes = document.querySelectorAll(selectors[s]);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (isOurUI(el)) continue;
        var rect = el.getBoundingClientRect();
        if (rect.width > 8 && rect.height > 8) return el;
      }
    }
    return null;
  }

  function rememberTweetContext() {
    var sel = window.getSelection();
    lastTweetArticle = sel ? findTweetArticle(sel.anchorNode) : null;
    if (!lastTweetArticle && lastSelectionRect) {
      var hit = document.elementFromPoint(
        Math.min(lastSelectionRect.left + 12, window.innerWidth - 1),
        Math.min(lastSelectionRect.top + 12, window.innerHeight - 1)
      );
      if (hit) lastTweetArticle = findTweetArticle(hit);
    }
  }

  function openReplyAndInsert(text, article) {
    return new Promise(function (resolve) {
      if (article) {
        var replyBtn = article.querySelector('[data-testid="reply"]');
        if (replyBtn) replyBtn.click();
      }
      var attempts = 0;
      var interval = setInterval(function () {
        attempts++;
        var composer = findVisibleComposer();
        if (composer) {
          clearInterval(interval);
          setElementText(composer, text);
          resolve(true);
          return;
        }
        if (attempts > 40) { clearInterval(interval); resolve(false); }
      }, 100);
    });
  }

  function insertReply(text) {
    return new Promise(function (resolve) {
      var active = document.activeElement;
      if (isEditableElement(active)) {
        setElementText(active, text);
        resolve(true);
        return;
      }
      var composer = findVisibleComposer();
      if (composer) {
        setElementText(composer, text);
        resolve(true);
        return;
      }
      var article = lastTweetArticle;
      if (!article) {
        var sel = window.getSelection();
        article = sel ? findTweetArticle(sel.anchorNode) : null;
      }
      if (!article) article = document.querySelector('article[data-testid="tweet"]');
      openReplyAndInsert(text, article).then(resolve);
    });
  }

  function sendMsg(msg) {
    return chrome.runtime.sendMessage(msg).catch(function (e) {
      console.error('[Copilot]', e);
      showPickerError('Extension error — reload extension from dist/ folder');
    });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function positionPicker(rect) {
    if (!picker) return;
    if (!rect || (!rect.width && !rect.height)) {
      rect = lastSelectionRect || {
        left: window.innerWidth / 2 - 180,
        right: window.innerWidth / 2 + 180,
        top: 120,
        bottom: 140,
        width: 0,
        height: 0,
      };
    }
    lastSelectionRect = rect;
    var width = 360;
    var maxH = Math.min(window.innerHeight * 0.7, 480);
    var left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    var spaceBelow = window.innerHeight - rect.bottom;
    var top;
    if (spaceBelow >= 180 || spaceBelow >= rect.top) {
      top = rect.bottom + 8;
    } else {
      top = Math.max(12, rect.top - maxH - 8);
    }
    picker.style.width = width + 'px';
    picker.style.maxHeight = maxH + 'px';
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
  }

  // ─── Selection toolbar ────────────────────────────────────
  function ensureToolbar() {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.id = 'tac-toolbar';
    toolbar.innerHTML = '<button type="button">✨ Generate Reply</button>';
    toolbar.querySelector('button').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toolbar.style.display = 'none';
      startGenerate(lastSelection);
    });
    document.body.appendChild(toolbar);
  }

  function showToolbarAtSelection() {
    var text = getSelectionText();
    if (text.length < 8) { if (toolbar) toolbar.style.display = 'none'; return; }
    lastSelection = text;
    lastSelectionRect = getSelectionRect();
    ensureToolbar();
    var rect = lastSelectionRect;
    if (!rect) return;
    toolbar.style.display = 'flex';
    toolbar.style.top = (rect.bottom + 6) + 'px';
    toolbar.style.left = Math.min(rect.left, window.innerWidth - 160) + 'px';
  }

  // ─── Reply picker (popup near selection) ──────────────────
  function ensurePicker() {
    if (picker) return;
    picker = document.createElement('div');
    picker.id = 'tac-picker';
    picker.innerHTML =
      '<div class="tac-head"><h3>✨ AI Replies</h3><button class="tac-close" type="button" aria-label="Close">×</button></div>' +
      '<div class="tac-body"></div>';
    picker.querySelector('.tac-close').addEventListener('click', function () {
      picker.style.display = 'none';
    });
    document.body.appendChild(picker);
  }

  function clearPickerBody() {
    ensurePicker();
    var body = picker.querySelector('.tac-body');
    if (body) body.innerHTML = '';
  }

  function showPickerLoading(sourceText, genId) {
    ensurePicker();
    positionPicker(lastSelectionRect || getSelectionRect());
    picker.style.display = 'block';
    var body = picker.querySelector('.tac-body');
    body.innerHTML =
      '<div class="tac-source">Replying to: <em>"' + esc(sourceText.slice(0, 120)) + (sourceText.length > 120 ? '…' : '') + '"</em></div>' +
      '<div class="tac-loading">⏳ Generating replies…</div>';
    if (genId) currentGenId = genId;
  }

  function showPickerError(msg, genId) {
    if (genId && genId !== currentGenId) return;
    ensurePicker();
    positionPicker(lastSelectionRect);
    picker.style.display = 'block';
    picker.querySelector('.tac-body').innerHTML = '<div class="tac-error">' + esc(msg) + '</div>';
  }

  function showPickerReplies(replies, sourceText, genId) {
    if (genId && genId !== currentGenId) return;
    ensurePicker();
    positionPicker(lastSelectionRect);
    picker.style.display = 'block';
    var html = '<div class="tac-source">Replying to: <em>"' + esc((sourceText || '').slice(0, 120)) + '"</em></div>';
    if (!replies || !replies.length) {
      html += '<div class="tac-error">No replies generated. Check Settings → API key.</div>';
    } else {
      replies.forEach(function (r, i) {
        html +=
          '<div class="tac-card" data-idx="' + i + '">' +
          '<div class="tac-tone">' + esc(r.toneLabel || r.tone || 'Reply') + '</div>' +
          '<div class="tac-text">' + esc(r.text) + '</div>' +
          '<div><button class="tac-insert" type="button">Insert</button><span class="tac-status"></span></div></div>';
      });
    }
    var body = picker.querySelector('.tac-body');
    body.innerHTML = html;
    body.querySelectorAll('.tac-insert').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var card = btn.closest('.tac-card');
        var idx = parseInt(card.getAttribute('data-idx'), 10);
        var reply = replies[idx];
        if (!reply) return;
        var status = card.querySelector('.tac-status');
        btn.disabled = true;
        status.textContent = 'Inserting…';
        insertReply(reply.text).then(function (ok) {
          btn.disabled = false;
          status.textContent = ok ? '✓ Inserted — review & post!' : '✗ Could not find reply box';
          if (ok) setTimeout(function () { picker.style.display = 'none'; }, 1200);
        });
      });
    });
  }

  // ─── Generate flow ────────────────────────────────────────
  function startGenerate(text) {
    if (!text || text.length < 8) {
      showPickerError('Select some tweet text first (at least 8 characters).');
      return;
    }
    lastSelection = text;
    lastSelectionRect = getSelectionRect() || lastSelectionRect;
    rememberTweetContext();
    pendingGenId = Date.now();
    currentGenId = pendingGenId;
    clearPickerBody();
    showPickerLoading(text, pendingGenId);
    sendMsg({
      type: 'GENERATE_FROM_SELECTION',
      payload: { text: text, url: location.href, generationId: pendingGenId },
    });
  }

  // ─── Message listener ─────────────────────────────────────
  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg.type === 'PING_CONTENT_SCRIPT') {
      sendResponse({ ok: true, version: '0.2.4', url: location.href });
      return true;
    }
    if (msg.type === 'TRIGGER_GENERATE') {
      var t = msg.payload && msg.payload.text;
      startGenerate(t || getSelectionText());
      sendResponse({ ok: true });
      return true;
    }
    if (msg.type === 'INSERT_REPLY') {
      var insertText = msg.payload && msg.payload.text;
      if (!insertText) {
        sendResponse({ ok: false, message: 'No text to insert' });
        return true;
      }
      insertReply(insertText).then(function (ok) {
        sendResponse({ ok: ok, message: ok ? 'Inserted' : 'No reply box found' });
      });
      return true;
    }
    if (msg.type === 'GENERATION_STARTED') {
      var sp = msg.payload || {};
      if (sp.generationId) currentGenId = sp.generationId;
      showPickerLoading(sp.sourceText || lastSelection, sp.generationId);
      return false;
    }
    if (msg.type === 'GENERATION_RESULT') {
      var p = msg.payload || {};
      showPickerReplies(p.replies, p.sourceText || lastSelection, p.generationId);
      return false;
    }
    if (msg.type === 'GENERATION_ERROR') {
      var ep = msg.payload || {};
      showPickerError(ep.message || 'Generation failed', ep.generationId);
      return false;
    }
    return false;
  });

  // ─── FAB — opens picker / re-generate last selection ─────
  function ensureFab() {
    if (document.getElementById('tac-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'tac-fab';
    fab.innerHTML = '<span>✨</span><span>AI Reply</span>';
    fab.addEventListener('click', function () {
      var text = getSelectionText() || lastSelection;
      if (text) startGenerate(text);
      else {
        ensurePicker();
        positionPicker(lastSelectionRect);
        picker.style.display = 'block';
        picker.querySelector('.tac-body').innerHTML =
          '<div style="padding:20px;font-size:13px;color:#71767b;line-height:1.6">' +
          '<b style="color:#e7e9ea">How to use:</b><br><br>' +
          '1. <b>Select</b> tweet text with your mouse<br>' +
          '2. Click <b>✨ Generate Reply</b> toolbar OR right-click → <b>Generate AI Reply</b><br>' +
          '3. Click <b>Insert</b> on a reply — goes into your focused text box' +
          '</div>';
      }
    });
    document.body.appendChild(fab);
  }

  // ─── Init ─────────────────────────────────────────────────
  function boot() {
    ensureFab();
    document.addEventListener('mouseup', function () {
      setTimeout(showToolbarAtSelection, 10);
    });
    document.addEventListener('mousedown', function (e) {
      if (toolbar && !toolbar.contains(e.target) && picker && !picker.contains(e.target)) {
        toolbar.style.display = 'none';
      }
    });
    console.info('[Tweet Better v0.2.4] Ready — select text to generate replies');
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();