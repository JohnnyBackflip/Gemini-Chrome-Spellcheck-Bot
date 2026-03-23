let activeTarget = null;
let savedSelectionRange = null;
let isSelectionOnly = false;
let tooltipContainer = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_and_loading") {
    const data = extractText();
    if (data && data.text) {
      showTooltipLoading();
      sendResponse(data);
    } else {
      sendResponse({ text: null });
    }
  } else if (request.action === "show_result") {
    showTooltipResult(request.correctedText);
  } else if (request.action === "show_error") {
    showTooltipError(request.errorMsg);
  }
});

function extractText() {
  activeTarget = document.activeElement;
  if (!activeTarget) return null;

  if (activeTarget.tagName === 'IFRAME') {
      try { activeTarget = activeTarget.contentDocument.activeElement; } catch(e) {}
  }

  isSelectionOnly = false;
  savedSelectionRange = null;

  if (activeTarget.tagName === 'TEXTAREA' || (activeTarget.tagName === 'INPUT' && activeTarget.type === 'text')) {
    if (activeTarget.selectionStart !== activeTarget.selectionEnd) {
      isSelectionOnly = true;
      return { text: activeTarget.value.substring(activeTarget.selectionStart, activeTarget.selectionEnd), isSelection: true };
    }
    return { text: activeTarget.value, isSelection: false };
  } 
  
  if (activeTarget.isContentEditable) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      isSelectionOnly = true;
      savedSelectionRange = sel.getRangeAt(0).cloneRange();
      return { text: sel.toString(), isSelection: true };
    }
    return { text: activeTarget.innerText, isSelection: false };
  }
  
  return null;
}

function getTooltipContainer() {
  if (!tooltipContainer) {
    tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'gemini-spellcheck-tooltip-wrapper';
    
    const tooltip = document.createElement('div');
    tooltip.id = 'gemini-tooltip';
    tooltipContainer.appendChild(tooltip);
    
    document.body.appendChild(tooltipContainer);
    
    // Close on click outside, wait until the next event loop to avoid closing instantly
    setTimeout(() => {
        document.addEventListener('click', closeTooltipOnClickOutside);
    }, 10);
  }
  return document.getElementById('gemini-tooltip');
}

function closeTooltipOnClickOutside(e) {
    if (tooltipContainer && !tooltipContainer.contains(e.target)) {
        closeTooltip();
    }
}

function positionTooltip() {
  if (!activeTarget || !tooltipContainer) return;
  const rect = activeTarget.getBoundingClientRect();
  tooltipContainer.style.top = `${window.scrollY + rect.bottom + 8}px`;
  tooltipContainer.style.left = `${window.scrollX + rect.left}px`;
}

function showTooltipLoading() {
  const tooltip = getTooltipContainer();
  tooltip.innerHTML = `
    <div class="gemini-content loading-state">
      <div class="gemini-spinner"></div>
      <span>${chrome.i18n.getMessage("uiLoading") || "Correcting..."}</span>
    </div>
  `;
  positionTooltip();
}

function showTooltipError(msg) {
  const tooltip = getTooltipContainer();
  tooltip.innerHTML = `
    <div class="gemini-content error-state">
      <span class="error-msg">${msg}</span>
      <button id="gemini-close-btn" class="gemini-btn outline">${chrome.i18n.getMessage("uiReject") || "Close"}</button>
    </div>
  `;
  document.getElementById('gemini-close-btn').addEventListener('click', closeTooltip);
  positionTooltip();
}

function showTooltipResult(correctedText) {
  const tooltip = getTooltipContainer();
  const displaySafeText = correctedText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  tooltip.innerHTML = `
    <div class="gemini-content result-state">
      <div class="gemini-result-text">${displaySafeText.replace(/\n/g, "<br>")}</div>
      <div class="gemini-actions">
        <button id="gemini-accept-btn" class="gemini-btn primary">${chrome.i18n.getMessage("uiAccept") || "Accept"}</button>
        <button id="gemini-reject-btn" class="gemini-btn outline">${chrome.i18n.getMessage("uiReject") || "Reject"}</button>
      </div>
    </div>
  `;
  
  document.getElementById('gemini-accept-btn').addEventListener('click', () => {
    applyCorrection(correctedText);
    closeTooltip();
  });
  
  document.getElementById('gemini-reject-btn').addEventListener('click', closeTooltip);
  positionTooltip();
}

function closeTooltip() {
  if (tooltipContainer) {
    document.removeEventListener('click', closeTooltipOnClickOutside);
    tooltipContainer.remove();
    tooltipContainer = null;
  }
}

function applyCorrection(correctedText) {
  if (!activeTarget) return;

  activeTarget.focus();

  if (activeTarget.tagName === 'TEXTAREA' || (activeTarget.tagName === 'INPUT' && activeTarget.type === 'text')) {
    if (isSelectionOnly) {
      const start = activeTarget.selectionStart;
      const end = activeTarget.selectionEnd;
      activeTarget.setRangeText(correctedText, start, end, 'end');
    } else {
      activeTarget.value = correctedText;
    }
    // Dispatch input event for frameworks like React
    activeTarget.dispatchEvent(new Event('input', { bubbles: true }));
    activeTarget.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (activeTarget.isContentEditable) {
    if (isSelectionOnly && savedSelectionRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange);
      document.execCommand('insertText', false, correctedText);
    } else {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(activeTarget);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('insertText', false, correctedText);
    }
  }
}
