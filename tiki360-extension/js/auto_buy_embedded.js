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
    .then((response) => response.json())
    .then((result) => console.log(result))
    .catch((error) => console.log("error", error));
}

async function addToCart(
  linkProduct,
  productInfo,
  userToken,
  numberOfInsurances
) {
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

  const raw = JSON.stringify({
    products: [
      {
        product_id: productInfo.product_id,
        qty: Number(numberOfInsurances),
        add_on_products: [
          {
            product_id: productInfo.add_on_id,
            quantity: Number(numberOfInsurances),
          },
        ],
      },
    ],
  });
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

  const raw = JSON.stringify({
    selected: true,
  });

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

async function getIdsGiftItem(userToken) {
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
    '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"'
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

  let ids = [];
  await fetch(
    "https://api.tala.xyz/v2/carts/mine/gifts?include=items",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(result);
      for (const element of result.data) {
        ids.push(element.id);
      }
    })
    .catch((error) => console.log("error", error));

  return ids;
}

async function deleteGiftItem(userToken, id) {
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
    '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"'
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

  let isSuccess;
  await fetch("https://api.tala.xyz/v2/carts/mine/items/" + id, requestOptions)
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

async function confirmPrice(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append("referer", "https://beta.tala.xyz/checkout/payment");
  myHeaders.append(
    "sec-ch-ua",
    '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"'
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

  let isSuccess;
  await fetch(
    "https://api.tala.xyz/v2/carts/mine?include=items,shipping_address,messages,price_summary,last_payment_method,shipping_methods,customer_tikixu_reward,customer_asa_reward&step=4&step_name=checkout%2Forder_view",
    requestOptions
  )
    .then((response) => response.text())
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

  const raw = JSON.stringify({
    payment: { method: "cod", original_method: "cod", sub_selection_id: null },
    tax_info: null,
    customer_note: "",
    delivery_option: null,
    order_notes: "",
  });

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
