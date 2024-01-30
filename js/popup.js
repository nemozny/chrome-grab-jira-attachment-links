// Parse the HTML document and find Jira URL and the current ticket ID
// Server Jira not supported
function grab_jira_ticket() {
  let key = null;
  let url = null;

  console.log(document.baseURI);
  if (!document.baseURI.includes("atlassian")) {
    console.log("Jira Attachment Link: Not in Jira");
    return;
  }

  const title = document.title;
  let issue_key = title.match(/\[(.+)\]/i);

  if (!title.includes("Issue navigator") && !!issue_key && !!issue_key.length) {
    key = issue_key[1];
  }

  let base_url = document.baseURI.match(/(https:\/\/[^/]+)/i);
  if (typeof (base_url) != 'undefined' && !!base_url && !!base_url.length) {
    url = base_url[1];
  }

  if (key == null || url == null) {
    console.log("Jira Attachment Link: URL or key not found.");
    return;
  }

  return { "key": key, "url": url }
}

// Parse text received by XHR into JSON
function parse_json(text) {
  let json = null;
  try {
    json = JSON.parse(text);
    return json;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Run the Jira REST API and retrieve the response
function run_query(url, key) {

  let endpoint = `${url}/rest/api/latest/issue/${key}?fields=attachment`;
  console.log(endpoint);

  // Need to promisify and wait for a result
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    // addListeners(xhr);
    xhr.open("GET", endpoint, true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");

    xhr.onreadystatechange = function () {
      if (this.readyState === XMLHttpRequest.DONE) {

        // Request finished. Resolve the promise.
        if (xhr.responseText.length > 0) {
          resolve(xhr.responseText);
        }
      }
    };

    xhr.send(null);
  })
}

// Parse JSON for attachments
function lookup_attachments(json) {
  if (!json || !Object.keys(json).length || !("fields" in json)) { return []; }

  const attachments = json["fields"]["attachment"];
  if (!attachments || !attachments.length) { return []; }

  let result = [];
  attachments.forEach(a => {
    result.push({
      "filename": a["filename"],
      "content": a["content"],
      "created": new Date(a["created"])
    })
  });

  return result;
}

// function copy_to_clipboard(elem) {
//   const url = elem.href;
//   navigator.clipboard.writeText(url);
//   alert("Copied the text: " + url);
// }

function create_element(filename, url) {
  // Violates some CSS policy
  // return `<a href="${url}">${filename}</a> <button onclick="copy_to_clipboard(this)">Copy link</button><br/>`;

  return `[<button class="copy" link="${url}">Copy</button>] <a href="${url}">${filename}</a> <br/>`;
}

window.addEventListener('load', async () => {
  // Div to populate with links
  const div = document.getElementById("attachments");

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Execute chrome scripting to access the active chrome tab. Get Jira endpoint and the Jira issue key.
  let injection_result = null;
  try {
    injection_result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: grab_jira_ticket
    });
  } catch(e) {
    div.innerHTML = "Failed to inject script.";
    return;
  };

  // injection_result returns an array, one item for each tab
  // [{"documentId": "FF5F45E9611F66B1E5B17FAED2D1D2E4",
  // "frameId": 0,
  // "result": {
  //     "key": "FESS-3715",
  //     "url": "https://siemens-sts.atlassian.net"
  // }
  // }]

  if (!injection_result || !injection_result.length) {
    div.innerHTML = "Not in Jira or Jira URL or ticket key not found.";
    return;
  }

  let key = null;
  let url = null;
  const result = injection_result[0]["result"];
  if (typeof (result) != 'undefined' && !!result && !!Object.keys(result).length) {
    key = result["key"];
    url = result["url"];
  } else {
    div.innerHTML = "Not in Jira or Jira URL or ticket key not found.";
    return;
  }

  // Query the Jira REST API for the issue details
  const response = await run_query(url, key);
  if (!!response) {
    const json = parse_json(response);
    if (!json) {
      div.innerHTML = "Failed to parse JSON.";
      return;
    }

    // Parse individual attachments
    let attachment_list = lookup_attachments(json);
    if (!attachment_list.length) {
      div.innerHTML = "No attachments found.";
      return;
    }

    // Sort by created descending
    attachment_list = attachment_list.sort((a, b) => {
      b["created"] - a["created"];
    })

    // Empty the target div and then populate with attachment links
    div.innerHTML = "";
    for (let a = 0; a < attachment_list.length; a++) {
      const attachment = attachment_list[a];

      div.innerHTML += create_element(attachment["filename"], attachment["content"]);
    }

    document.addEventListener("click", e => {
      const link = e.target.getAttribute("link"); 
      navigator.clipboard.writeText(link);
      e.target.innerHTML = "Copied";
    })
  }
});