let source = "ds-insurance-area";

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
addCopyEventListener("button-customer-email", "input-customer-email");
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
addCopyEventListener(
  "button-copy-order-code-auto-buy-bike",
  "input-order-code-auto-buy-bike"
);
addCopyEventListener(
  "button-copy-order-code-auto-buy-car",
  "input-order-code-auto-buy-bike"
);
addCopyEventListener(
  "button-copy-order-code-auto-buy-travel",
  "input-order-code-auto-buy-bike"
);

document
  .getElementById("button-auto-buy-embedded")
  .addEventListener("click", async function () {
    if (!(await checkSupportDev())) {
      return;
    }
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";
    document.getElementById("store-front-area").style.display = "none";
    document.getElementById("button-auto-buy-embedded").style.display = "none";
    document.getElementById("button-auto-buy-bike").style.display = "none";
    document.getElementById("button-auto-buy-car").style.display = "none";
    document.getElementById("button-auto-buy-travel").style.display = "none";
    document.getElementById("button-process-auto-buy-bike").style.display =
      "none";
    document.getElementById("button-process-auto-buy-car").style.display =
      "none";
    document.getElementById("button-process-auto-buy-travel").style.display =
      "none";
    document.getElementById("button-binding-add-on").style.display = "none";
    document.getElementById("auto-buy-bike-area").style.display = "none";
    document.getElementById("auto-buy-car-area").style.display = "none";
    document.getElementById("spin-process-auto-buy-embedded").style.display =
      "none";

    document.getElementById("auto-buy-embedded").style.display = "block";
    document.getElementById("button-process-auto-buy-embedded").style.display =
      "block";
    document.getElementById("button-process-back").style.display = "block";

    let userToken = document.getElementById("input-token").value;
    if (!userToken) {
      await displayAlert("alert-danger", "user is not sign-in", 2000);
      return;
    }

    document.getElementById("shipping-info").innerHTML = "";

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
  .getElementById("button-auto-buy-bike")
  .addEventListener("click", async function () {
    if (!(await checkSupportDev())) {
      return;
    }
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";
    document.getElementById("store-front-area").style.display = "none";
    document.getElementById("button-auto-buy-embedded").style.display = "none";
    document.getElementById("button-auto-buy-bike").style.display = "none";
    document.getElementById("button-auto-buy-car").style.display = "none";
    document.getElementById("button-auto-buy-travel").style.display = "none";
    document.getElementById("auto-buy-embedded").style.display = "none";
    document.getElementById("button-process-auto-buy-embedded").style.display =
      "none";
    document.getElementById("button-process-auto-buy-car").style.display =
      "none";
    document.getElementById("button-process-auto-buy-travel").style.display =
      "none";
    document.getElementById("button-binding-add-on").style.display = "none";
    document.getElementById("auto-buy-car-area").style.display = "none";
    document.getElementById("spin-process-auto-buy-bike").style.display =
      "none";

    document.getElementById("button-process-auto-buy-bike").style.display =
      "block";
    document.getElementById("auto-buy-bike-area").style.display = "block";
    document.getElementById("button-process-back").style.display = "block";

    let userToken = document.getElementById("input-token").value;
    if (!userToken) {
      await displayAlert("alert-danger", "user is not sign-in", 2000);
    }
  });

document
  .getElementById("button-auto-buy-car")
  .addEventListener("click", async function () {
    if (!(await checkSupportDev())) {
      return;
    }
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";
    document.getElementById("store-front-area").style.display = "none";
    document.getElementById("button-auto-buy-embedded").style.display = "none";
    document.getElementById("button-auto-buy-bike").style.display = "none";
    document.getElementById("button-auto-buy-car").style.display = "none";
    document.getElementById("button-auto-buy-travel").style.display = "none";
    document.getElementById("auto-buy-embedded").style.display = "none";
    document.getElementById("auto-buy-bike-area").style.display = "none";
    document.getElementById("button-process-auto-buy-embedded").style.display =
      "none";
    document.getElementById("button-process-auto-buy-bike").style.display =
      "none";
    document.getElementById("button-process-auto-buy-travel").style.display =
      "none";
    document.getElementById("button-binding-add-on").style.display = "none";
    document.getElementById("spin-process-auto-buy-car").style.display = "none";

    document.getElementById("button-process-auto-buy-car").style.display =
      "block";
    document.getElementById("auto-buy-car-area").style.display = "block";
    document.getElementById("button-process-back").style.display = "block";

    let userToken = document.getElementById("input-token").value;
    if (!userToken) {
      await displayAlert("alert-danger", "user is not sign-in", 2000);
    }
  });

document
  .getElementById("button-auto-buy-travel")
  .addEventListener("click", async function () {
    if (!(await checkSupportDev())) {
      return;
    }
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";
    document.getElementById("store-front-area").style.display = "none";
    document.getElementById("button-auto-buy-embedded").style.display = "none";
    document.getElementById("button-auto-buy-bike").style.display = "none";
    document.getElementById("button-auto-buy-car").style.display = "none";
    document.getElementById("button-auto-buy-travel").style.display = "none";
    document.getElementById("auto-buy-embedded").style.display = "none";
    document.getElementById("auto-buy-bike-area").style.display = "none";
    document.getElementById("button-process-auto-buy-embedded").style.display =
      "none";
    document.getElementById("button-process-auto-buy-bike").style.display =
      "none";
    document.getElementById("button-process-auto-buy-travel").style.display =
      "none";
    document.getElementById("button-binding-add-on").style.display = "none";
    document.getElementById("spin-process-auto-buy-travel").style.display =
      "none";

    document.getElementById("button-process-auto-buy-travel").style.display =
      "block";
    document.getElementById("auto-buy-travel-area").style.display = "block";
    document.getElementById("button-process-back").style.display = "block";

    let userToken = document.getElementById("input-token").value;
    if (!userToken) {
      await displayAlert("alert-danger", "user is not sign-in", 2000);
    }
  });

document
  .getElementById("button-binding-add-on")
  .addEventListener("click", async function () {
    if (!(await checkSupportDev())) {
      return;
    }
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";
    document.getElementById("store-front-area").style.display = "none";
    document.getElementById("button-auto-buy-embedded").style.display = "none";
    document.getElementById("button-auto-buy-bike").style.display = "none";
    document.getElementById("button-auto-buy-car").style.display = "none";
    document.getElementById("button-auto-buy-travel").style.display = "none";
    document.getElementById("button-process-auto-buy-embedded").style.display =
      "none";
    document.getElementById("button-process-auto-buy-bike").style.display =
      "none";
    document.getElementById("button-process-auto-buy-car").style.display =
      "none";
    document.getElementById("button-process-auto-buy-travel").style.display =
      "none";
    document.getElementById("button-binding-add-on").style.display = "none";
    document.getElementById("auto-buy-bike-area").style.display = "none";
    document.getElementById("auto-buy-car-area").style.display = "none";
    document.getElementById("spin-process-binding-add-on").style.display =
      "none";

    document.getElementById("binding-add-on-area").style.display = "block";
    document.getElementById("button-process-binding-add-on").style.display =
      "block";
    document.getElementById("button-process-back").style.display = "block";

    document.getElementById("list-add-on").innerHTML = "";

    let listAddOn = JSON.parse(await getListAddOn()).data;
    for (const element of listAddOn) {
      let selectAddOn = document.getElementById("list-add-on");
      let optionAddOn = document.createElement("option");
      optionAddOn.text = element.name;
      optionAddOn.value = element.mid;

      selectAddOn.add(optionAddOn);
    }
  });

document
  .getElementById("button-process-auto-buy-embedded")
  .addEventListener("click", async function () {
    document.getElementById("spin-process-auto-buy-embedded").style.display =
      "inline-grid";
    document.getElementById("button-process-auto-buy-embedded").disabled = true;

    let linkProduct = document.getElementById("input-auto-buy-embedded").value;

    if (linkProduct === "" || !linkProduct.includes(PREFIX_URL_DEV)) {
      await displayAlert("alert-danger", "product's link is invalid", 2000);
      return;
    }

    let numberOfInsurances = document.getElementById(
      "input-number-of-insurances"
    ).value;

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

    let isAddToCart = await addToCart(
      linkProduct,
      productInfo,
      userToken,
      numberOfInsurances
    );
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
    if (orderCode !== "0" && typeof orderCode !== "undefined") {
      document.getElementById("alert-success").innerHTML =
        "auto-buying is successfully";
    } else {
      await displayAlert(
        "alert-danger",
        "auto-buying is is failed, because check-out is failed",
        2000
      );
      return;
    }

    document
      .getElementById("input-order-code-auto-buy-embedded")
      .setAttribute("value", orderCode);

    await delay(1000);
    document.getElementById("alert-success").style.display = "none";
    document.getElementById("spin-process-auto-buy-embedded").style.display =
      "none";
    document.getElementById(
      "button-process-auto-buy-embedded"
    ).disabled = false;
  });

document
  .getElementById("button-process-auto-buy-bike")
  .addEventListener("click", async function () {
    document.getElementById("spin-process-auto-buy-bike").style.display =
      "inline-grid";
    document.getElementById("button-process-auto-buy-bike").disabled = true;

    let orderCode = await autoBuyBikeCar();

    document
      .getElementById("input-order-code-auto-buy-bike")
      .setAttribute("value", orderCode);

    await delay(1000);
    document.getElementById("alert-success").style.display = "none";
    document.getElementById("spin-process-auto-buy-bike").style.display =
      "none";
    document.getElementById("button-process-auto-buy-bike").disabled = false;
  });

document
  .getElementById("button-process-auto-buy-car")
  .addEventListener("click", async function () {
    document.getElementById("spin-process-auto-buy-car").style.display =
      "inline-grid";
    document.getElementById("button-process-auto-buy-car").disabled = true;
    let orderCode = await autoBuyBikeCar();

    document
      .getElementById("input-order-code-auto-buy-car")
      .setAttribute("value", orderCode);

    await delay(1000);
    document.getElementById("alert-success").style.display = "none";
    document.getElementById("spin-process-auto-buy-car").style.display = "none";
    document.getElementById("button-process-auto-buy-car").disabled = false;
  });

document
  .getElementById("button-process-auto-buy-travel")
  .addEventListener("click", async function () {
    document.getElementById("spin-process-auto-buy-travel").style.display =
      "inline-grid";
    document.getElementById("button-process-auto-buy-travel").disabled = true;

    let orderCode = "0";
    let userMail = document.getElementById("input-customer-email").value;
    let userToken = document.getElementById("input-token").value;
    if (!userToken || !userMail) {
      await displayAlert("alert-danger", "user is not sign-in", 2000);
      return;
    }

    let travelFormInfo = await saveFormTravel(userToken, userMail);
    document.getElementById("alert-success").style.display = "block";
    if (travelFormInfo.is_success) {
      document.getElementById("alert-success").innerHTML =
        "saving travel form is successfully";
    } else {
      await displayAlert("alert-danger", "saving travel form is failed", 2000);
      return;
    }

    document.getElementById("alert-success").innerHTML =
      "underwriting the travel policy is pretty slowly, please wait! hi hi";
    let isSuccessUnderwriting = false;
    for (let i = 0; i < 5; i++) {
      let isSuccess = await underwriting(
        travelFormInfo.booking_code,
        userToken
      );
      if (isSuccess) {
        isSuccessUnderwriting = isSuccess;
        break;
      } else {
        document.getElementById("alert-success").innerHTML =
          "We are retrying to underwriting the travel policy, please wait! hi hi";
      }
    }
    if (isSuccessUnderwriting) {
      document.getElementById("alert-success").innerHTML =
        "underwriting the travel policy is successfully";
    } else {
      await displayAlert(
        "alert-danger",
        "underwriting the travel policy is failed",
        2000
      );
      return;
    }

    let isRequestPayment = await requestQuickPayment(
      travelFormInfo.booking_code,
      userToken
    );
    if (isRequestPayment) {
      document.getElementById("alert-success").innerHTML =
        "calling quick-payment is successfully";
    } else {
      await displayAlert(
        "alert-danger",
        "calling quick-payment is failed",
        2000
      );
      return;
    }

    let isSelectTikiXuPayment = await selectTikiXuPayment(userToken);
    if (isSelectTikiXuPayment) {
      document.getElementById("alert-success").innerHTML =
        "selecting tiki-xu payment is successfully";
    } else {
      await displayAlert(
        "alert-danger",
        "selecting tiki-xu payment is failed",
        2000
      );
      return;
    }

    orderCode = await checkoutInsurance(userToken);
    if (orderCode !== "0" && typeof orderCode !== "undefined") {
      document.getElementById("alert-success").innerHTML =
        "auto-buying is successfully";
    } else {
      await displayAlert("alert-danger", "auto-buying is is failed", 2000);
    }

    document
      .getElementById("input-order-code-auto-buy-travel")
      .setAttribute("value", orderCode);

    await delay(1000);
    document.getElementById("alert-success").style.display = "none";
    document.getElementById("spin-process-auto-buy-travel").style.display =
      "none";
    document.getElementById("button-process-auto-buy-travel").disabled = false;
  });

document
  .getElementById("button-process-binding-add-on")
  .addEventListener("click", async function () {
    document.getElementById("spin-process-binding-add-on").style.display =
      "inline-grid";
    document.getElementById("button-process-binding-add-on").disabled = true;

    let productID = localStorage.getItem("product_id");
    let userEmail = document.getElementById("input-customer-email").value;
    if (
      productID === null ||
      userEmail === null ||
      typeof productID === "undefined" ||
      typeof userEmail === "undefined"
    ) {
      await displayAlert(
        "alert-danger",
        "missing product id or user email",
        2000
      );
      return;
    }

    let addOnId = document.getElementById("list-add-on").value;

    let isSuccessBinding = await bindingAddOn(userEmail, productID, addOnId);
    if (isSuccessBinding) {
      await displayAlert(
        "alert-success",
        "binding add-on is successfully",
        2000
      );
      await chrome.tabs.query(
        { active: true, currentWindow: true },
        function (tabs) {
          chrome.tabs.reload(tabs[0].id);
        }
      );
    } else {
      await displayAlert("alert-danger", "binding add-on is failed", 2000);
      return;
    }

    document.getElementById("alert-success").style.display = "none";
    document.getElementById("spin-process-binding-add-on").style.display =
      "none";
    document.getElementById("button-process-binding-add-on").disabled = false;
  });

window.addEventListener("load", async (event) => {
  console.log(event);
  await loadExtension();
});

document
  .getElementById("button-process-back")
  .addEventListener("click", async function () {
    location.reload();
  });

async function loadExtension() {
  document.getElementById("auto-buy-embedded").style.display = "none";
  document.getElementById("button-process-auto-buy-embedded").style.display =
    "none";
  document.getElementById("button-process-auto-buy-bike").style.display =
    "none";
  document.getElementById("button-process-auto-buy-car").style.display = "none";
  document.getElementById("button-process-auto-buy-travel").style.display =
    "none";
  document.getElementById("button-process-binding-add-on").style.display =
    "none";
  document.getElementById("button-process-back").style.display = "none";

  document.getElementById("auto-buy-bike-area").style.display = "none";
  document.getElementById("auto-buy-car-area").style.display = "none";
  document.getElementById("auto-buy-travel-area").style.display = "none";
  document.getElementById("binding-add-on-area").style.display = "none";

  document.getElementById("button-auto-buy-embedded").style.display = "block";
  document.getElementById("button-auto-buy-bike").style.display = "block";
  document.getElementById("button-auto-buy-car").style.display = "block";
  document.getElementById("button-auto-buy-travel").style.display = "block";

  if (source === "ds-insurance-area") {
    document.getElementById("table-curl-area").style.display = "block";
    document.getElementById("ds-insurance-area").style.display = "block";
  } else if (source === "store-front-area") {
    document.getElementById("store-front-area").style.display = "block";
  }

  // check URL
  const currentURL = await getCurrentTabUrl();
  if (
    !(
      currentURL.includes(PREFIX_URL_DEV) ||
      currentURL.includes(PREFIX_URL_PROD)
    )
  ) {
    alert(INVALID_WEBSITE_MSG);
    chrome.tabs.update({ url: "https://beta.tala.xyz" });
    window.close();
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
    source = "store-front-area";
    document.getElementById("ds-insurance-area").style.display = "none";
    document.getElementById("table-curl-area").style.display = "none";

    const productInfo = await getProductInfo(prefixAPIProductInfo, id, spID);
    localStorage.setItem("product_id", productInfo.product_id);
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

    document.getElementById("button-binding-add-on").style.display = "block";
  } else {
    document.getElementById("store-front-area").style.display = "none";
    source = "ds-insurance-area";
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

            let userInfo = await getUserInfo(
              response.access_token,
              prefixURL,
              prefixAPI
            );
            document
              .getElementById("input-customer-email")
              .setAttribute("value", userInfo.email);

            document.getElementById(
              "button-auto-buy-embedded"
            ).disabled = false;
            document.getElementById("button-auto-buy-bike").disabled = false;
            document.getElementById("button-auto-buy-car").disabled = false;
            document.getElementById("button-auto-buy-travel").disabled = false;
            document.getElementById("button-binding-add-on").disabled = false;

            document.getElementById("spin-auto-buy-embedded").style.display =
              "none";
            document.getElementById("spin-auto-buy-bike").style.display =
              "none";
            document.getElementById("spin-auto-buy-car").style.display = "none";
            document.getElementById("spin-auto-buy-travel").style.display =
              "none";
            document.getElementById("spin-binding-add-on").style.display =
              "none";

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
}

async function displayAlert(typeAlert, msg, delayTime) {
  document.getElementById(typeAlert).style.display = "block";
  document.getElementById(typeAlert).innerHTML = msg;
  await delay(delayTime);
  document.getElementById(typeAlert).style.display = "none";
  if (typeAlert === "alert-danger") {
    document.getElementById("alert-success").style.display = "none";

    document.getElementById("spin-process-auto-buy-embedded").style.display =
      "none";
    document.getElementById("spin-process-auto-buy-bike").style.display =
      "none";
    document.getElementById("spin-process-auto-buy-car").style.display = "none";
    document.getElementById("spin-process-auto-buy-travel").style.display =
      "none";

    document.getElementById(
      "button-process-auto-buy-embedded"
    ).disabled = false;
    document.getElementById("button-process-auto-buy-bike").disabled = false;
    document.getElementById("button-process-auto-buy-car").disabled = false;
    document.getElementById("button-process-auto-buy-travel").disabled = false;
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

async function autoBuyBikeCar() {
  let orderCode = "0";
  let userMail = document.getElementById("input-customer-email").value;
  let userToken = document.getElementById("input-token").value;
  if (!userToken || !userMail) {
    await displayAlert("alert-danger", "user is not sign-in", 2000);
    return;
  }

  let suffixApi = "";
  const checkedRadio = document.querySelector('input[type="radio"]:checked');
  if (checkedRadio) {
    suffixApi = checkedRadio.value;
  }
  if (suffixApi === "") {
    await displayAlert(
      "alert-danger",
      "choosing the bike partner, please!",
      2000
    );
    return;
  }

  const urlParams = new URLSearchParams(suffixApi);
  let productId = urlParams.get("product_id");
  let selectedProductId = urlParams.get("selected_product_id");

  let policyDraft = await createDraftPolicy(suffixApi, userToken);
  document.getElementById("alert-success").style.display = "block";
  if (policyDraft.is_success) {
    document.getElementById("alert-success").innerHTML =
      "creating draft policy is successfully";
  } else {
    await displayAlert("alert-danger", "creating draft policy is failed", 2000);
    return;
  }

  let policy = await saveAndFillPolicy(
    productId,
    selectedProductId,
    policyDraft.booking_code,
    userMail,
    userToken
  );
  if (policy.is_success) {
    document.getElementById("alert-success").innerHTML =
      "saving and filling policy is successfully";
  } else {
    await displayAlert(
      "alert-danger",
      "saving and filling policy is failed",
      2000
    );
    return;
  }

  let isRequestPayment = await requestQuickPayment(
    policy.booking_code,
    userToken
  );
  if (isRequestPayment) {
    document.getElementById("alert-success").innerHTML =
      "calling quick-payment is successfully";
  } else {
    await displayAlert("alert-danger", "calling quick-payment is failed", 2000);
    return;
  }

  let isSelectTikiXuPayment = await selectTikiXuPayment(userToken);
  if (isSelectTikiXuPayment) {
    document.getElementById("alert-success").innerHTML =
      "selecting tiki-xu payment is successfully";
  } else {
    await displayAlert(
      "alert-danger",
      "selecting tiki-xu payment is failed",
      2000
    );
    return;
  }

  orderCode = await checkoutInsurance(userToken);
  if (orderCode !== "0" && typeof orderCode !== "undefined") {
    document.getElementById("alert-success").innerHTML =
      "auto-buying is successfully";
  } else {
    await displayAlert(
      "alert-danger",
      "auto-buying is is failed, because check-out is failed",
      2000
    );
  }

  return orderCode;
}

async function getCurrentTabUrl() {
  const tabs = await chrome.tabs.query({ active: true });
  return tabs[0].url;
}

async function getUserInfo(userToken, prefixURL, prefixAPI) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("origin", prefixURL);
  myHeaders.append("referer", prefixURL);
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

  let userInfo = {
    email: "",
  };
  await fetch(prefixAPI + "/v2/me", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      userInfo.email = result.raw_email;
    })
    .catch((error) => console.log("error", error));

  return userInfo;
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
      debugger;
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

async function checkSupportDev() {
  let isSupport = true;
  const currentURL = await getCurrentTabUrl();
  if (!currentURL.includes(PREFIX_URL_DEV)) {
    await displayAlert("alert-danger", INVALID_SUPPORT_DEV_MSG, 3000);
    isSupport = false;
  }

  return isSupport;
}
