const logOutput = document.getElementById("log-output");
const requestCount = document.getElementById("request-count");
let actionCount = 0;

function writeLog(label, payload) {
  actionCount += 1;
  requestCount.textContent = `${actionCount} action${actionCount > 1 ? "s" : ""}`;
  logOutput.textContent = `[${new Date().toLocaleTimeString()}] ${label}\n${payload}\n\n${logOutput.textContent}`;
}

async function runFetchGet() {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
  const data = await response.json();
  writeLog("fetch GET", JSON.stringify(data, null, 2));
}

async function runFetchPost() {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "detector-apis",
      body: "post payload",
      userId: 1,
    }),
  });
  const data = await response.json();
  writeLog("fetch POST", JSON.stringify(data, null, 2));
}

async function runGraphQLPost() {
  const response = await fetch("https://graphqlzero.almansi.me/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "query GetPost($id: ID!) { post(id: $id) { id title body } }",
      variables: {
        id: 1,
      },
    }),
  });
  const data = await response.json();
  writeLog("GraphQL POST", JSON.stringify(data, null, 2));
}

async function runXhrGet() {
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://jsonplaceholder.typicode.com/comments?postId=1");
    xhr.responseType = "json";
    xhr.onload = function () {
      writeLog("XMLHttpRequest GET", JSON.stringify(xhr.response, null, 2));
      resolve();
    };
    xhr.onerror = reject;
    xhr.send();
  });
}

async function runBatch() {
  await runFetchGet();
  await runFetchPost();
  await runGraphQLPost();
  await runXhrGet();
}

const actions = {
  "fetch-get": runFetchGet,
  "fetch-post": runFetchPost,
  graphql: runGraphQLPost,
  xhr: runXhrGet,
  batch: runBatch,
};

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", async function () {
    const actionName = button.dataset.action;
    try {
      await actions[actionName]();
    } catch (error) {
      writeLog(`${actionName} failed`, String(error));
      console.error(error);
    }
  });
});

