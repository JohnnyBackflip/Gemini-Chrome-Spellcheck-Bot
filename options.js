document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);
document.getElementById('refreshModelsBtn').addEventListener('click', fetchModels);

// Internationalization
document.querySelectorAll('[data-i18n]').forEach(el => {
  const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
  if (msg) el.textContent = msg;
});
document.querySelectorAll('[placeholder]').forEach(el => {
  if (el.getAttribute('placeholder').startsWith('__MSG_')) {
    const key = el.getAttribute('placeholder').replace('__MSG_', '').replace('__', '');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.setAttribute('placeholder', msg);
  }
});

function showStatus(msgKey, type = 'success', isDirectString = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = isDirectString ? msgKey : chrome.i18n.getMessage(msgKey);
  statusEl.className = `status-msg visible ${type}`;
  setTimeout(() => {
    statusEl.className = 'status-msg';
  }, 3000);
}

async function fetchModels() {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) {
    showStatus('optStatusNoKey', 'error');
    return;
  }

  const btn = document.getElementById('refreshModelsBtn');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "...";

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
        if(response.status === 400 || response.status === 403) {
            throw new Error(`Invalid Google Gemini API Key.`);
        }
      throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();
    
    // Filter to only text-generation capable models Let's only list gemini 1.5/2.5 series.
    const validModels = data.models.filter(m => 
      m.name.includes('gemini') && 
      m.supportedGenerationMethods.includes('generateContent')
    );

    populateModelSelect(validModels);
    
    // Save the retrieved models to storage so they don't have to be fetched every time
    chrome.storage.local.set({ cachedModels: validModels });
    showStatus('Models Refreshed Successfully', 'success', true);
  } catch (error) {
    console.error('Model fetch error:', error);
    showStatus(error.message || 'Error fetching models', 'error', true);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function populateModelSelect(models, selectedModel = '') {
  const select = document.getElementById('modelSelect');
  select.innerHTML = '';
  if (!models || models.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No models found';
    select.appendChild(opt);
    return;
  }

  models.forEach(m => {
    const opt = document.createElement('option');
    // Using the full name like 'models/gemini-1.5-flash'
    opt.value = m.name; 
    opt.textContent = m.displayName || m.name.replace('models/', '');
    select.appendChild(opt);
  });
  
  if (selectedModel) {
    select.value = selectedModel;
  } else {
    // defaults to flash if available
    const defaultOpt = models.find(m => m.name.includes('flash'));
    if (defaultOpt) select.value = defaultOpt.name;
  }
}

function saveOptions() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('modelSelect').value;
  const prompt = document.getElementById('customPrompt').value;
  
  chrome.storage.local.set({
    gemini_api_key: apiKey,
    gemini_model: model,
    gemini_prompt: prompt
  }, () => {
    showStatus('optStatusSaved', 'success');
  });
}

function restoreOptions() {
  chrome.storage.local.get(['gemini_api_key', 'gemini_model', 'gemini_prompt', 'cachedModels'], (items) => {
    if (items.gemini_api_key) document.getElementById('apiKey').value = items.gemini_api_key;
    
    if (items.gemini_prompt) {
      document.getElementById('customPrompt').value = items.gemini_prompt;
    } else {
      document.getElementById('customPrompt').value = chrome.i18n.getMessage('promptDefault');
    }

    if (items.cachedModels) {
      populateModelSelect(items.cachedModels, items.gemini_model);
    } else {
      // populate with default dummy until load
      populateModelSelect([{name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash (Default)'}], items.gemini_model);
    }
  });
}
