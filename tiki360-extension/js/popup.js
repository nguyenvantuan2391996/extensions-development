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

addCopyEventListener(
  "button-copy-order-code-auto-buy-embedded",
  "input-order-code-auto-buy-embedded"
);

document
  .getElementById("button-auto-buy-embedded")
  .addEventListener("click", async function () {
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";
    document.getElementById("store-front-area").style.display = "none";
    document.getElementById("button-auto-buy-embedded").style.display = "none";
    document.getElementById("button-auto-buy-bike").style.display = "none";
    document.getElementById("button-auto-buy-car").style.display = "none";
    document.getElementById("auto-buy-embedded").style.display = "block";
    document.getElementById("button-process-auto-buy").style.display = "block";

    let userToken = document.getElementById("input-token").value;
    if (!userToken) {
      await displayAlert("alert-danger", "user is not sign-in", 2000);
      return;
    }

    let listShipping = await getInfoShipping(userToken);
    for (const element of listShipping) {
      let selectShippingInfo = document.getElementById("shipping-info");
      let optionShippingInfo = document.createElement("option");
      optionShippingInfo.text = element.telephone;
      optionShippingInfo.value = element.id;

      selectShippingInfo.add(optionShippingInfo);
    }
  });

document
  .getElementById("button-process-auto-buy")
  .addEventListener("click", async function () {
    let linkProduct = document.getElementById("input-auto-buy-embedded").value;

    if (linkProduct === "" || !linkProduct.includes(PREFIX_URL_DEV)) {
      await displayAlert("alert-danger", "product's link is invalid", 2000);
      return;
    }

    let userToken = document.getElementById("input-token").value;
    if (!userToken) {
      await displayAlert("alert-danger", "user is not sign-in", 2000);
      return;
    }

    const urlParams = new URLSearchParams(linkProduct.split("?")[1]);
    let spID = urlParams.get("spid");
    let slugTileProduct = linkProduct
      .split("/")[3]
      .split(".html")[0]
      .split("-");
    let id = slugTileProduct[slugTileProduct.length - 1].split("p")[1];

    const prefixAPIProductInfo = linkProduct.includes(PREFIX_URL_DEV)
      ? PREFIX_API_DEV
      : PREFIX_API_PROD_STORE_FRONT;

    const productInfo = await getProductInfo(prefixAPIProductInfo, id, spID);
    if (productInfo.add_on_id === NOT_FOUND_MSG) {
      await displayAlert(
        "alert-danger",
        "the product is not embed add-on",
        2000
      );
      return;
    }
    document.getElementById("add-on-auto").innerHTML =
      productInfo.add_on_name +
      " with price: " +
      productInfo.add_on_price +
      "VND";
    document.getElementById("alert-success").style.display = "block";
    document.getElementById("alert-success").innerHTML =
      "getting product's information is successfully";

    await deleteCart(userToken);

    let isAddToCart = await addToCart(linkProduct, productInfo, userToken);
    if (isAddToCart) {
      document.getElementById("alert-success").innerHTML =
        "adding to cart is successfully";
    } else {
      await displayAlert("alert-danger", "adding to cart is failed", 2000);
      return;
    }

    let isSelectedItems = await selectedItems(userToken);
    if (isSelectedItems) {
      document.getElementById("alert-success").innerHTML =
        "selecting items is successfully";
    } else {
      await displayAlert("alert-danger", "selecting items is failed", 2000);
      return;
    }

    let isAbleCheckout = await checkAbleToCheckout(userToken);
    if (!isAbleCheckout) {
      await displayAlert(
        "alert-danger",
        "Không thể giao đến địa chỉ đang chọn",
        2000
      );
      return;
    }

    let idShipping = document.getElementById("shipping-info").value;
    let isAddShipping = await addShipping(userToken, idShipping);
    if (isAddShipping) {
      document.getElementById("alert-success").innerHTML =
        "adding shipping is successfully";
    } else {
      await displayAlert("alert-danger", "adding shipping is failed", 2000);
      return;
    }

    let isSelectPaymentCod = await selectPaymentCod(userToken);
    if (isSelectPaymentCod) {
      document.getElementById("alert-success").innerHTML =
        "selecting payment code is successfully";
    } else {
      await displayAlert(
        "alert-danger",
        "selecting payment code is failed",
        2000
      );
      return;
    }

    let orderCode = await checkoutProduct(userToken);
    if (orderCode !== "0") {
      document.getElementById("alert-success").innerHTML =
        "auto-buying is successfully";
    } else {
      await displayAlert("alert-danger", "auto-buying is is failed", 2000);
      return;
    }

    document
      .getElementById("input-order-code-auto-buy-embedded")
      .setAttribute("value", orderCode);

    await delay(1000);
    document.getElementById("alert-success").style.display = "none";
  });

window.addEventListener("load", async (event) => {
  console.log(event);
  document.getElementById("auto-buy-embedded").style.display = "none";
  document.getElementById("button-process-auto-buy").style.display = "none";

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
  let slugTileProduct = currentURL.split("/")[3].split(".html")[0].split("-");
  let id = slugTileProduct[slugTileProduct.length - 1].split("p")[1];

  if (!!spID || !!id) {
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";

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
            document.getElementById(
              "button-auto-buy-embedded"
            ).disabled = false;

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

async function displayAlert(typeAlert, msg, delayTime) {
  document.getElementById(typeAlert).style.display = "block";
  document.getElementById(typeAlert).innerHTML = msg;
  await delay(delayTime);
  document.getElementById(typeAlert).style.display = "none";
  if (typeAlert === "alert-danger") {
    document.getElementById("alert-success").style.display = "none";
  }
}

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
        navigator.clipboard.writeText(items[curlCommand]).then(async (r) => {
          console.log(r);
          document.getElementById("alert-copy").style.display = "block";
          await delay(1000);
          document.getElementById("alert-copy").style.display = "none";
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
    add_on_price: "",
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
      productInfo.add_on_price = !!result.add_on
        ? result.add_on[0].price
        : NOT_FOUND_MSG;
    })
    .catch((error) => console.log("error", error));

  return productInfo;
}

async function deleteCart(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append(
    "referer",
    "https://beta.tala.xyz/checkout/cart?src=header_cart"
  );
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);

  const requestOptions = {
    method: "DELETE",
    headers: myHeaders,
    redirect: "follow",
  };

  await fetch(
    "https://api.tala.xyz/v2/intended_cart/selected_items",
    requestOptions
  )
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.log("error", error));
}

async function addToCart(linkProduct, productInfo, userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-type", "application/json;charset=UTF-8");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append("referer", linkProduct);
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);

  const raw =
    `{"products":[{"product_id":"` +
    productInfo.product_id +
    `","qty":1,"add_on_products":[{"product_id":"` +
    productInfo.add_on_id +
    `","quantity":1}]}]}`;
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  let isSuccess;
  await fetch("https://api.tala.xyz/v2/carts/mine/items", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      console.log(result);
      isSuccess = true;
    })
    .catch((error) => {
      console.log(error);
      isSuccess = false;
    });

  return isSuccess;
}

async function selectedItems(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-type", "application/json;charset=UTF-8");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append(
    "referer",
    "https://beta.tala.xyz/checkout/cart?src=header_cart"
  );
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);

  const raw = '{\n    "selected": true\n}';

  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  let isSuccess;
  await fetch("https://api.tala.xyz/v2/intended_cart/items", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      console.log(result);
      isSuccess = true;
    })
    .catch((error) => {
      console.log("error", error);
      isSuccess = false;
    });

  return isSuccess;
}

async function checkAbleToCheckout(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append(
    "cookie",
    "rl_page_init_referrer=StackityEncrypt%3AU2FsdGVkX1%2BPSLt1xU%2BuPug8Qt7bFOiUoR5aiu%2Bki5lI7myF6A3lY4MZXk8aPu%2FUPhHeabowUdK70xcIq3Dk3A%3D%3D; rl_page_init_referring_domain=StackityEncrypt%3AU2FsdGVkX1%2FJoD4NnmMc%2FMdJaJr3eaRXxBca45%2BZV%2FhIYthFfAPXpI9aqoEIDfDe; _fbp=fb.1.1668063695357.1841846515; _hjSessionUser_522327=eyJpZCI6Ijc2ZDc5NzJjLWVjMmYtNTdhZi1hYzhjLTVhZGI3NTI0ODBmOCIsImNyZWF0ZWQiOjE2NjgwNjcxMTkyOTMsImV4aXN0aW5nIjp0cnVlfQ==; _gcl_au=1.1.706985578.1675844574; oauth2_authentication_csrf_insecure=MTY3ODM1ODExN3xEdi1CQkFFQ180SUFBUkFCRUFBQVB2LUNBQUVHYzNSeWFXNW5EQVlBQkdOemNtWUdjM1J5YVc1bkRDSUFJRFF4Tnpnek9EYzVOV0kwTnpRNE5UbGlZV0l3TVRWaE5qVmhaVGRoTnpSaHxPIhcyhKKM-dOp0WFFLWyvFwTWN_c7vozN8cD8XKsrCw==; oauth2_consent_csrf_insecure=MTY3ODM1ODEyMnxEdi1CQkFFQ180SUFBUkFCRUFBQVB2LUNBQUVHYzNSeWFXNW5EQVlBQkdOemNtWUdjM1J5YVc1bkRDSUFJREEyT1dSbFpEWmpOalU1T0RRMk1UZzVZVEV6WlRJM016TmtNakZsWmpCbXxz3eR6pkthhtfYHoubD6Ul5Zsn6NQoc1agURYlEgAP_Q==; delivery_zone=Vk4wMzQwMjQwMTM=; tiki_client_id=636774826.1668063908; _gid=GA1.2.1599508727.1679299074; _ga_5Z6DPS5DXV=GS1.1.1679627257.563.1.1679627430.0.0.0; _hjIncludedInSessionSample_522327=0; _ga=GA1.2.636774826.1668063908; _hjSession_522327=eyJpZCI6IjhhNWQ4YjI4LTJjZWItNGFlYy05OTUxLTExNDA1NjBiNjFmMiIsImNyZWF0ZWQiOjE2Nzk2MzEwODA0MzQsImluU2FtcGxlIjpmYWxzZX0=; _hjAbsoluteSessionInProgress=0; TIKI_ACCESS_TOKEN=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDAxMTQ2MzUiLCJpYXQiOjE2Nzk2MzMxOTYsImV4cCI6MTY3OTYzNjc5NiwiaXNzIjoiaHR0cHM6Ly90aWtpLnZuIiwiY3VzdG9tZXJfaWQiOiIxMDAxMTQ2MzUiLCJlbWFpbCI6InR1YW4ubmd1eWVuMjVAdGlraS52biIsImNsaWVudF9pZCI6InRpa2ktc3NvIiwibmFtZSI6IjEwMDExNDYzNSIsInNjb3BlIjoic3NvIn0.cl4aD7VJaUtRDsYG-Q6gsFt2bvWZ8YPss5dPtw7XHhTvimFzRtsKsj0YZOYMt5CkmcrCLEg9s2uSFe13C8-eKBGXhbUSWTJELFwYY-zN06n3iEeytGsEbixTheI04UrdMifgNrq09Pzou5ya9vqX_dz7loz9WoTY9DmgS4VTU_AzDRSVgLVcihk9L6J6olz05rKY4yyEGBSAAn5Uw7IzQDsEGgeoTg6h9P_1z4P3zCZRoCKJvzB3u4DSA-twJnviBeAAAGKm0AIlZMLZW3nQjKsK-XkNANh6fsTMyiKTjCb9h40o4uBEHvQdzQyv2bSLmwqyT3fsaRQJIHuONF4sPAbHTLfOtB803LL3YFh_uOBWlCeSf6jrs-rxxAoE7rLqKoXk0KaZvwhLP9IlZV-O0tJ8Ty0-cVHs9Cjb_GtvBunDyP7N7FXNdNV4BFl7Y8tLePQP057eNJZSE7rHU2VSnwUPgUr_Lfueyk7vgslPbmUlRXnpHGiyKMrp9a__87NNNjmZVhxB-1C5_KEaQulZB0uqn60rsHgyILC9AkrUlJkBLkLX1xowcYZS-swLUSK5JpVGz_CMmxweHNWkroaVmtl7_ds3wOaR8UbOAm9z8TtUO9iS9JnhJcrXAaaDFTjjd-UetCc7fkm3cjajGjiEsU7PnVPncrA6KlcLIoS2QA4; TIKI_USER=AaQDDmnyq4UWGs2tmyA4Eu2jEZamWPqsbZKXWgDcHwoYY0Sj5t9j%2BqZcKE5or6CT4OVWy%2By3qt7NFw%3D%3D; bnpl_whitelist_info={%22content%22:%22Mua%20tr%C6%B0%E1%BB%9Bc%20tr%E1%BA%A3%20sau%22%2C%22is_enabled%22:true%2C%22icon%22:%22https://salt.tikicdn.com/ts/tmp/95/15/2d/4b3d64b220f55f42885c86ac439d6d62.png%22%2C%22deep_link%22:%22https://beta.tala.xyz/mua-truoc-tra-sau/dang-ky?src=account_page%22}; rl_group_id=StackityEncrypt%3AU2FsdGVkX1%2FJYAdruM3M0ZkdkLKDyxBhDsoxOA2%2FqiM%3D; rl_group_trait=StackityEncrypt%3AU2FsdGVkX1%2BftGKsVewiyqxEWobYXyUjhWAT7yB%2Fx%2FA%3D; rl_anonymous_id=StackityEncrypt%3AU2FsdGVkX19dYlIESAt38bC7TRLj1%2FMmUqOdeA8LVO%2BBcv%2FbkRKLpWl5NIpqpNQK7jVmspJd2bqSO3tlK08AzQ%3D%3D; TIKI_ACCESS_TOKEN=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDAxMTQ2MzUiLCJpYXQiOjE2Nzk2MzUxODIsImV4cCI6MTY3OTYzODc4MiwiaXNzIjoiaHR0cHM6Ly90aWtpLnZuIiwiY3VzdG9tZXJfaWQiOiIxMDAxMTQ2MzUiLCJlbWFpbCI6InR1YW4ubmd1eWVuMjVAdGlraS52biIsImNsaWVudF9pZCI6InRpa2ktc3NvIiwibmFtZSI6IjEwMDExNDYzNSIsInNjb3BlIjoic3NvIn0.W34nxbmfQi2qbZMLvRUyONKvHDz1S13HQyDvG45DhWCobRgq40_k3lMM2hUTK-lRbcsJ-pDF4uk2Xlz3T9l23lqVcsBF0mEy3tTY7gWjJWH15a24vHzwBivUofGWsy87Mtr3zUHpOhtZvYAVYEE7bM-0EmBlj0ZxxhU7XfUYPBegHbmpYha3KIIg4Admd3tXhhaYP_Qlnx2o6ZtaLpHhZFtS6-gwPQYMVgFyhBV9ECUOF6eaOrlWwLfR1u76_ckbz6LTeL1ziJUHgZU_qVlBW5cthoMBo_sRMCCCjTMdktn-rXBwWCPC2k9NJBSSwoMfL4JERLHJM7Z-826xwkBGV4bJwLajcl6-FhwYwDzznul2iwnlfdCrtaXPQVoUnCW5yFX7-qvdT4C5CmoRY5_-9PVz1svAp7m4GiqQJhkRrtfaxhbN3-C_qr5I2G8780c1HdqDyBYaCSRxQdq7dAeaztnPWAj1Zbcsb1TFKz6PlfWJ4G5wEsWv2bagUnQaYsYBh_WgYEPEkrkX2G4d9HLoda_Dn5vbbRzEB5VNHl0hCkWIcnw68WqdQ3n_8AiQ_AeqO925bT60qpD8UGSiVoUbe635cAJ4QllCw8huNzOjuLtZkcYQbROJyOR7SVfa0cxRFKhqv7axRPvUhnOxeuS5gt1-c1K5Gfs1gK7XHlVKLYo; rl_user_id=StackityEncrypt%3AU2FsdGVkX19g6LCVsAg%2FAFN0lEiANhr67vIg5%2FkXzJQ%3D; rl_trait=StackityEncrypt%3AU2FsdGVkX180gmeOzHNciXLV%2FOi5qX4%2FgSiN5fAP3StEX6hBbtbA%2Fe41Beo8galYX2HAfRU8%2FeaUersDND1mtQ%3D%3D; cto_bundle=2Mdvy19kQ1FTS1RMeTNydlprblNxd1B6bXBBM1VzNnNVT2NwTVdjbGoxeFdaU0FvZHNtY0wlMkZuSktJNXpoV0c1SmJOJTJCOGFUTTFYOFlBUXNtcURkQnBZNXViclRWWVhVMm9Ha3NUanVmOE1BUCUyRjA1eVNCR095SHdTbmlFMk5NOUVvUGplJTJCZFFCOGlWJTJCNWhWWHU1b3p5RzRyY3QlMkJhSlZQT1VPQ1RoMXZGSjdFTzdqbFRqdnpGVHcxTnI2JTJCSFZ3eVY1WW5INg; _gat=1; TOKENS={%22customer_id%22:100114635%2C%22access_token%22:%22eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDAxMTQ2MzUiLCJpYXQiOjE2Nzk2MzY3OTcsImV4cCI6MTY3OTY0MDM5NywiaXNzIjoiaHR0cHM6Ly90aWtpLnZuIiwiY3VzdG9tZXJfaWQiOiIxMDAxMTQ2MzUiLCJlbWFpbCI6InR1YW4ubmd1eWVuMjVAdGlraS52biIsImNsaWVudF9pZCI6InRpa2ktc3NvIiwibmFtZSI6IjEwMDExNDYzNSIsInNjb3BlIjoic3NvIn0.etaNQ-8vPBzbgvv73PO1T4itzv_n2ocktxarHQ8em_UlzWLu0XKLI0H61tQiQwPf2bvDCbjE572j3a6EYW-uF003QD46FP2OXv6aH9uHiLB5Fnj-ix4OiI0AR0puO-FHwGilw1itRlWX9ibbuCF7fu0koW5wjjrhwbW1ly1RDlZm0ehAd89i-5XgiufdumbesyFQxF2Tsxd1agMOA1Ie5xnQ-bxL-IdkQBhNXGfct9qazCRe7jY1F5Ch9eAo4WhjbcqWNHQqYrViIDbBo5KWgyDavDPTCVJdfgnwBqdTi527U0IH5rv2R9Jo2TPCm1CB9URj2ZA_ttuEsUA7rS9_EOwLzdY_CfB_u0fwpJ3cVFyk9a8rEmSvtUfQ5Kah-gfdrLrknvq3uZrKKaMiW-pRv8X2m9L53uWpe-aR1Eb2y_gCEtmcCmwLIsl4YPwS49_9AjX5oA0BZc98xEj2Z1q1BkcprHK8MuTGNQru9tsTXWS3damnz_hC5pk5e_ek6vkqUZtXEVP4Bso-ypTM5oATVTVzVOLKqGz_esSIJkkBKfUVQaLCRYjthuUiKQRD_lyrr3ndDfcFBsHOQ46Zz-WQY8pH8wanpFTwEKY6rtsg_AJtaWgOH0iziww-pMdX-jYcVdweXzsKws6PGgPrGZ5QqGxM9e51992WVAWkKpsQDxs%22%2C%22token_type%22:%22bearer%22%2C%22refresh_token%22:%22TKIAcdG8a1tYXnKrixVFhElJg8YIwOMjOQGVWEeNKNHm1A4kSez1Yw_neXehtEUYxJfZQhH1tqUARg6yteKu%22%2C%22expires_in%22:3600%2C%22expires_at%22:1679640397410}; amp_b81b93=8qSB2IhM3sSMmowB-Hu3tA.MTAwMTE0NjM1..1gs8t0jc1.1gs92fd8e.17ap.1eli.2m0b"
  );
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append("referer", "https://beta.tala.xyz/checkout/cart");
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  let isAble;
  await fetch(
    "https://api.tala.xyz/v2/intended_cart/checkout?reset=false",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      isAble = result.able_to_checkout;
    })
    .catch((error) => {
      console.log("error", error);
      isAble = false;
    });

  return isAble;
}

async function addShipping(userToken, idShipping) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-length", "0");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append(
    "referer",
    "https://beta.tala.xyz/checkout/cart?src=header_cart"
  );
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);

  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    redirect: "follow",
  };

  let isSuccess;
  await fetch(
    "https://api.tala.xyz/v2/carts/mine/shippings_addresses/" + idShipping,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(result);
      isSuccess = true;
    })
    .catch((error) => {
      console.log("error", error);
      isSuccess = false;
    });

  return isSuccess;
}

async function selectPaymentCod(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-length", "0");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append("referer", "https://beta.tala.xyz/checkout/payment");
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);

  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    redirect: "follow",
  };

  let isSuccess;
  await fetch(
    "https://api.tala.xyz/v2/carts/mine/reward_point/status/1?source=onepage",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(result);
      isSuccess = true;
    })
    .catch((error) => {
      console.log("error", error);
      isSuccess = false;
    });

  return isSuccess;
}

async function checkoutProduct(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-type", "application/json;charset=UTF-8");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append("referer", "https://beta.tala.xyz/checkout/payment");
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);
  myHeaders.append("x-platform", "frontend-desktop");

  const raw =
    '{\n    "payment": {\n        "method": "cod",\n        "original_method": "cod",\n        "sub_selection_id": null\n    },\n    "tax_info": null,\n    "customer_note": "",\n    "delivery_option": null,\n    "order_notes": ""\n}';

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  let orderCode;
  await fetch(
    "https://api.tala.xyz/v2/carts/mine/checkout?version=2.0",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      orderCode = result.order_code;
    })
    .catch((error) => {
      console.log("error", error);
      orderCode = "0";
    });

  return orderCode;
}

async function getInfoShipping(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append("referer", "https://beta.tala.xyz/customer/address");
  myHeaders.append(
    "sec-ch-ua",
    '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    ARRAY_USER_AGENT[Math.floor(Math.random() * ARRAY_USER_AGENT.length)]
  );
  myHeaders.append("x-access-token", userToken);
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  let shippingInfo = [];
  await fetch(
    "https://api.tala.xyz/v2/me/addresses?page=1&limit=50",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      for (const element of result.data) {
        shippingInfo.push({
          id: element.id,
          telephone: element.telephone,
        });
      }
    })
    .catch((error) => console.log("error", error));

  return shippingInfo;
}
