// Init context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "gemini-spellcheck",
    title: chrome.i18n.getMessage("contextMenuTitle") || "Correct Spelling",
    contexts: ["editable", "selection"]
  });
});

// Listen for context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "gemini-spellcheck") {
    triggerSpellcheck(tab.id);
  }
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "correct_spelling") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        triggerSpellcheck(tabs[0].id);
      }
    });
  }
});

// Also open options on action click
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

async function triggerSpellcheck(tabId) {
  try {
    // Tell content script to start process (show loading, extract text)
    const response = await chrome.tabs.sendMessage(tabId, { action: "extract_and_loading" });
    
    if (!response || !response.text) {
      console.warn("No text extracted or content script not ready");
      return;
    }

    const { text, isSelection } = response;
    
    // Call Gemini API
    const correctedText = await callGeminiAPI(text);
    
    // Send back to content script to show Accept/Reject UI
    chrome.tabs.sendMessage(tabId, { 
      action: "show_result", 
      originalText: text,
      correctedText: correctedText
    });

  } catch (error) {
    console.error("Spellcheck error:", error);
    // Try to notify content script of the error (might fail if content script itself threw the error above)
    try {
        chrome.tabs.sendMessage(tabId, { 
          action: "show_error", 
          errorMsg: error.message || chrome.i18n.getMessage("uiError") || "Error correcting text."
        });
    } catch(e) {}
  }
}

async function callGeminiAPI(text) {
  // Get settings
  const items = await chrome.storage.local.get(['gemini_api_key', 'gemini_model', 'gemini_prompt']);
  const apiKey = items.gemini_api_key;
  
  if (!apiKey) {
    throw new Error(chrome.i18n.getMessage("optStatusNoKey") || "No API Key configured. Please check Options.");
  }
  
  const model = items.gemini_model || "models/gemini-3.1-flash-lite-preview";
  const systemPrompt = items.gemini_prompt || chrome.i18n.getMessage("promptDefault") || "Correct the spelling and grammar of the following text. Only return the corrected text, no conversational filler or explanation.";
  
  // Clean up the model string in case it doesn't have the models/ prefix
  const finalModel = model.startsWith('models/') ? model : `models/${model}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${finalModel}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: `System Instruction: ${systemPrompt}\n\nText to correct:\n${text}` }]
    }],
    generationConfig: {
      temperature: 0.1, // Keep it deterministic for spelling
      topK: 1,
      topP: 1
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API Error details:", errorData);
    if(response.status === 400 || response.status === 403) {
      throw new Error(`Invalid Google Gemini API Key, Model, or Prompt.`);
    }
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
    let resultText = data.candidates[0].content.parts[0].text;
    // Strip possible markdown code blocks if the model wrapped it (e.g., ```text ... ```)
    resultText = resultText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    return resultText.trim();
  } else {
    throw new Error("Invalid response format from Gemini API.");
  }
}
