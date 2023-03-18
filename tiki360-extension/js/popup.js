function addCopyEventListener(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  button.addEventListener("click", () => {
    copyText(inputId).then((result) => {
      console.log(result);
    });
  });
}

addCopyEventListener("button-token", "input-token");
addCopyEventListener("button-customer-id", "input-customer-id");
addCopyEventListener("button-order-code", "input-order-code");
addCopyEventListener("button-policy-id", "input-policy-id");
addCopyEventListener("button-booking-code", "input-booking-code");

addCopyEventListener("button-product-id", "input-product-id");
addCopyEventListener("button-product-sku", "input-product-sku");
addCopyEventListener("button-product-name", "input-product-name");
addCopyEventListener("button-add-on-id", "input-add-on-id");
addCopyEventListener("button-add-on-name", "input-add-on-name");

window.addEventListener("load", async (event) => {
  console.log(event);

  // check URL
  const currentURL = await getCurrentTabUrl();
  if (
    !(
      currentURL.includes(PREFIX_URL_DEV) ||
      currentURL.includes(PREFIX_URL_PROD)
    )
  ) {
    alert(INVALID_WEBSITE_MSG);
    return;
  }

  const prefixURL = currentURL.includes(PREFIX_URL_DEV)
    ? PREFIX_URL_DEV
    : PREFIX_URL_PROD;
  const prefixAPI = currentURL.includes(PREFIX_URL_DEV)
    ? PREFIX_API_DEV
    : PREFIX_API_PROD;
  const prefixAPIProductInfo = currentURL.includes(PREFIX_URL_DEV)
    ? PREFIX_API_DEV
    : PREFIX_API_PROD_STORE_FRONT;

  // storefront area
  const urlParams = new URLSearchParams(currentURL.split("?")[1]);
  let spID = urlParams.get("spid");

  if (!!spID) {
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";

    let slugTileProduct = currentURL.split("/")[3].split(".html")[0].split("-");
    let id = slugTileProduct[slugTileProduct.length - 1].split("p")[1];

    const productInfo = await getProductInfo(prefixAPIProductInfo, id, spID);
    document
      .getElementById("input-product-id")
      .setAttribute("value", productInfo.product_id);
    document
      .getElementById("input-product-sku")
      .setAttribute("value", productInfo.product_sku);
    document
      .getElementById("input-product-name")
      .setAttribute("value", productInfo.product_name);
    document
      .getElementById("input-add-on-id")
      .setAttribute("value", productInfo.add_on_id);
    document
      .getElementById("input-add-on-name")
      .setAttribute("value", productInfo.add_on_name);
  } else {
    document.getElementById("store-front-area").style.display = "none";
  }

  /* global chrome */
  await chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    async function (tabs) {
      await chrome.tabs.sendMessage(
        tabs[0].id,
        {
          from: POPUP_SCREEN,
          subject: HANDLE_LOAD_EXTENSION,
          currentURL: currentURL,
        },
        async function (response) {
          if (response === "" || response == null) {
            alert(DATA_EMPTY_MSG);
          } else {
            // set value for the input
            document
              .getElementById("input-token")
              .setAttribute("value", response.access_token);
            document
              .getElementById("input-customer-id")
              .setAttribute("value", response.customer_id);

            if (
              currentURL.includes(
                PREFIX_URL_DEV + "/bao-hiem-so/thong-tin-hop-dong"
              ) ||
              currentURL.includes(
                PREFIX_URL_PROD + "/bao-hiem-so/thong-tin-hop-dong"
              )
            ) {
              const bookingCode = currentURL.split("/")[5].split("?")[0];
              const orderCode = await getOrderCode(
                bookingCode,
                response,
                prefixURL,
                prefixAPI
              );
              document
                .getElementById("input-order-code")
                .setAttribute("value", orderCode);
              document
                .getElementById("input-booking-code")
                .setAttribute("value", bookingCode);
              document
                .getElementById("input-policy-id")
                .setAttribute("value", response.policy_id);
            } else {
              document
                .getElementById("input-order-code")
                .setAttribute("value", NOT_FOUND_MSG);
              document
                .getElementById("input-booking-code")
                .setAttribute("value", NOT_FOUND_MSG);
              document
                .getElementById("input-policy-id")
                .setAttribute("value", NOT_FOUND_MSG);
            }
          }
        }
      );
    }
  );

  // set value list apis request
  await chrome.storage.local.get(null, async function (items) {
    let trContent = "";
    for (let element of Object.keys(items)) {
      for (const element2 of Object.keys(items)) {
        if (items[element] === element2) {
          let curlCommand = items[element] + "-curl";
          let statusAndRequestID = items[element2].split("|");
          trContent += `<tr><td><button type="button" class="btn btn-info" id=${curlCommand}>Copy</button></td><td>${items[element]}</td><td>${statusAndRequestID[0]}</td><td>${statusAndRequestID[1]}</td></tr>`;

          break;
        }
      }
    }
    document.querySelector(
      "#table-result-detector-apis>tbody"
    ).innerHTML = `<tbody>${trContent}</tbody>`;

    // handle list button
    let listTR = document
      .querySelector("#table-result-detector-apis>tbody")
      .getElementsByTagName("tr");
    for (const trTag of listTR) {
      let buttonID = trTag
        .getElementsByTagName("td")[0]
        .getElementsByTagName("button")[0].id;

      document.getElementById(buttonID).addEventListener("click", function () {
        copyCurl(buttonID, items);
      });
    }
  });
});

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function copyText(id) {
  const copyText = document.getElementById(id);
  copyText.select();
  copyText.setSelectionRange(0, 99999);

  await navigator.clipboard.writeText(copyText.value).then(async (r) => {
    console.log(r);
    document.getElementById("alert-copy").style.display = "block";
    await delay(1000);
    document.getElementById("alert-copy").style.display = "none";
  });
}

function copyCurl(curlCommand, items) {
  for (let element of Object.keys(items)) {
    for (const element2 of Object.keys(items)) {
      if (items[element] === element2 && element2 + "-curl" === curlCommand) {
        navigator.clipboard.writeText(items[curlCommand]).then((r) => {
          console.log(r);
          alert("Copied !");
        });
      }
    }
  }
}

async function getCurrentTabUrl() {
  const tabs = await chrome.tabs.query({ active: true });
  return tabs[0].url;
}

async function getOrderCode(
  bookingCode,
  accessTokenObject,
  prefixURL,
  prefixAPI
) {
  // get transaction id
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("origin", prefixURL);
  myHeaders.append(
    "referer",
    prefixURL + "/bao-hiem-so/lich-su-giao-dich/" + bookingCode
  );
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", accessTokenObject.access_token);

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  let transactionID = "";
  await fetch(
    prefixAPI +
      "/ds-insurance/v2/policies/transaction/list?code=" +
      bookingCode,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      transactionID = result.data.list[0].history[0].transaction_id;
    })
    .catch((error) => {
      alert(error);
    });

  // get transaction detail
  const myHeadersTransactionDetail = new Headers();
  myHeadersTransactionDetail.append("authority", "api.tala.xyz");
  myHeadersTransactionDetail.append(
    "accept",
    "application/json, text/plain, */*"
  );
  myHeadersTransactionDetail.append(
    "accept-language",
    "en-US,en;q=0.9,vi;q=0.8,es;q=0.7"
  );
  myHeadersTransactionDetail.append("origin", prefixURL);
  myHeadersTransactionDetail.append(
    "referer",
    prefixURL +
      "/bao-hiem-so/thong-tin-giao-dich/" +
      transactionID +
      transactionID +
      "/transaction"
  );
  myHeadersTransactionDetail.append("sec-fetch-dest", "empty");
  myHeadersTransactionDetail.append("sec-fetch-mode", "cors");
  myHeadersTransactionDetail.append("sec-fetch-site", "same-site");
  myHeadersTransactionDetail.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeadersTransactionDetail.append(
    "x-access-token",
    accessTokenObject.access_token
  );

  const requestOptionsTransactionDetail = {
    method: "GET",
    headers: myHeadersTransactionDetail,
    redirect: "follow",
  };

  let orderCode = "";
  await fetch(
    prefixAPI +
      "/ds-insurance/v2/policies/transaction/detail?transaction_id=" +
      transactionID +
      "&type=transaction",
    requestOptionsTransactionDetail
  )
    .then((response) => response.json())
    .then((result) => {
      for (const element of result.data.details) {
        if (element.name === "Mã đơn hàng Tiki") {
          orderCode = element.value;
        }
      }
    })
    .catch((error) => {
      alert(error);
    });

  // debugger
  return orderCode;
}

async function getProductInfo(prefixAPIProductInfo, id, spID) {
  const myHeaders = new Headers();
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("Accept", "application/json, text/plain, */*");
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("Sec-Fetch-Site", "same-origin");
  myHeaders.append("Sec-Fetch-Mode", "cors");
  myHeaders.append("Sec-Fetch-Dest", "empty");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  let productInfo = {
    product_sku: "",
    product_id: "",
    product_name: "",
    add_on_id: "",
    add_on_name: "",
  };
  await fetch(
    prefixAPIProductInfo + "/v2/products/" + id + "?platform=web&spid=" + spID,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      productInfo.product_id = !!result.current_seller
        ? result.current_seller.product_id
        : NOT_FOUND_MSG;
      productInfo.product_sku = !!result.current_seller
        ? result.current_seller.sku
        : NOT_FOUND_MSG;
      productInfo.product_name = !!result ? result.name : NOT_FOUND_MSG;
      productInfo.add_on_id = !!result.add_on
        ? result.add_on[0].id
        : NOT_FOUND_MSG;
      productInfo.add_on_name = !!result.add_on
        ? result.add_on[0].name
        : NOT_FOUND_MSG;
    })
    .catch((error) => console.log("error", error));

  return productInfo;
}
