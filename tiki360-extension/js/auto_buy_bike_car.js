async function createDraftPolicy(suffixApi, userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("origin", "https://beta.tala.xyz");
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

  let policyDraft = {
    booking_code: "",
    is_success: false,
  };
  await fetch(
    "https://api.tala.xyz/ds-insurance/v2/forms?" + suffixApi,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      policyDraft.booking_code = result.data.extras.code;
      policyDraft.is_success = true;
    })
    .catch((error) => {
      console.log("error", error);
      policyDraft.is_success = false;
    });

  return policyDraft;
}

async function saveAndFillPolicy(
  productId,
  selectedProductId,
  bookingCode,
  userMail,
  userToken
) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-type", "application/json;charset=UTF-8");
  myHeaders.append("origin", "https://beta.tala.xyz");
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

  let startAndEndDate = getStartDateAndEndDate();
  const raw =
    `
  {
    "product_id": ` +
    productId +
    `,
    "selected_product_id": ` +
    selectedProductId +
    `,
    "code": "` +
    bookingCode +
    `",
    "data": {
        "items": [
            {
                "field": "owner_name",
                "value": "` +
    randomName() +
    `"
            },
            {
                "field": "license_number",
                "value": "` +
    randomLicensePlate() +
    `"
            },
            {
                "field": "effective_date",
                "value": "` +
    startAndEndDate.start_date +
    `"
            },
            {
                "field": "expired_date",
                "value": "` +
    startAndEndDate.end_date +
    `"
            },
            {
                "field": "email",
                "value": "` +
    userMail +
    `"
            },
            {
                "field": "phone_number",
                "value": "` +
    randomPhoneNumber() +
    `"
            },
            {
                "field": "machine_number",
                "value": ""
            },
            {
                "field": "chassis_number",
                "value": ""
            }
        ]
    }
}
  `;

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  let policy = {
    booking_code: "",
    is_success: false,
  };

  await fetch("https://api.tala.xyz/ds-insurance/v2/forms", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      policy.booking_code = result.data.code;
      policy.is_success = true;
    })
    .catch((error) => {
      console.log("error", error);
      policy.is_success = false;
    });

  return policy;
}

async function requestQuickPayment(bookingCode, userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-type", "application/json;charset=UTF-8");
  myHeaders.append("origin", "https://beta.tala.xyz");
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

  const raw =
    `
  {
    "booking_code": "` +
    bookingCode +
    `",
    "source": "desktop-web"
}
  `;

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  let isSuccess;
  await fetch(
    "https://api.tala.xyz/ds-insurance/v2/policies/checkout",
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

async function selectTikiXuPayment(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-length", "0");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append(
    "referer",
    "https://beta.tala.xyz/quick-payment?ref_id=insurance"
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
    "https://api.tala.xyz/v2/partner/payment/info/reward_point/status/1?ref_id=insurance",
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

async function checkoutInsurance(userToken) {
  const myHeaders = new Headers();
  myHeaders.append("authority", "api.tala.xyz");
  myHeaders.append("accept", "application/json, text/plain, */*");
  myHeaders.append("accept-language", "en-US,en;q=0.9,vi;q=0.8,es;q=0.7");
  myHeaders.append("content-type", "application/json;charset=UTF-8");
  myHeaders.append("origin", "https://beta.tala.xyz");
  myHeaders.append(
    "referer",
    "https://beta.tala.xyz/quick-payment?ref_id=insurance"
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

  const raw =
    '{\n    "ref_id": "insurance",\n    "payment": {\n        "method": "cod"\n    },\n    "tax_info": null\n}';

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  let orderCode;
  await fetch(
    "https://api.tala.xyz/v2/partner/payment/checkout",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      orderCode = result.redirect_data.order_code;
    })
    .catch((error) => {
      console.log("error", error);
      orderCode = "0";
    });

  return orderCode;
}
