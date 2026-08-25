function grabJiraTicket() {
  const pageUrl = new URL(document.baseURI);
  if (!pageUrl.hostname.includes("atlassian")) {
    return null;
  }

  const issueKey = document.title.match(/\[([^\]]+)\]/)?.[1];
  if (document.title.includes("Issue navigator") || !issueKey) {
    return null;
  }

  return { key: issueKey, url: pageUrl.origin };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Jira Attachment Link: Failed to parse response.", error);
    return null;
  }
}

function runQuery(url, key) {
  const endpoint = `${url}/rest/api/latest/issue/${encodeURIComponent(key)}?fields=attachment`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", endpoint, true);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        resolve(xhr.responseText);
        return;
      }

      reject(new Error(`Jira request failed with status ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error("Jira request failed due to a network error."));
    xhr.send();
  });
}

function lookupAttachments(json) {
  const attachments = json?.fields?.attachment;
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter(({ filename, content }) => filename && content)
    .map(({ filename, content, created }) => ({
      filename,
      content,
      created: new Date(created),
    }));
}

function setStatus(container, message) {
  container.textContent = message;
}

function createAttachmentElement({ filename, content }) {
  const item = document.createElement("div");
  const copyButton = document.createElement("button");
  const link = document.createElement("a");

  copyButton.className = "copy";
  copyButton.type = "button";
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      copyButton.textContent = "Copied";
    } catch (error) {
      console.error("Jira Attachment Link: Failed to copy attachment URL.", error);
      copyButton.textContent = "Copy failed";
    }
  });

  link.href = content;
  link.textContent = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  item.append(copyButton, document.createTextNode(" "), link);
  return item;
}

window.addEventListener("load", async () => {
  const attachmentsContainer = document.getElementById("attachments");
  if (!attachmentsContainer) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus(attachmentsContainer, "Unable to find the active tab.");
    return;
  }

  let injectionResult;
  try {
    injectionResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: grabJiraTicket,
    });
  } catch (error) {
    console.error("Jira Attachment Link: Failed to inspect active tab.", error);
    setStatus(attachmentsContainer, "Failed to inspect the active tab.");
    return;
  }

  const ticket = injectionResult?.[0]?.result;
  if (!ticket) {
    setStatus(attachmentsContainer, "Not a Jira issue page.");
    return;
  }

  try {
    const response = await runQuery(ticket.url, ticket.key);
    const json = parseJson(response);
    if (!json) {
      setStatus(attachmentsContainer, "Failed to parse Jira's response.");
      return;
    }

    const attachments = lookupAttachments(json)
      .sort((firstAttachment, secondAttachment) => secondAttachment.created - firstAttachment.created);
    if (!attachments.length) {
      setStatus(attachmentsContainer, "No attachments found.");
      return;
    }

    attachmentsContainer.replaceChildren(...attachments.map(createAttachmentElement));
  } catch (error) {
    console.error("Jira Attachment Link: Failed to load attachments.", error);
    setStatus(attachmentsContainer, "Failed to load attachments.");
  }
});