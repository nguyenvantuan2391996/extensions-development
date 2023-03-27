async function saveFormTravel(userToken, userMail) {
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

  let name = randomName();
  let identification = randomIdentification();
  const raw = JSON.stringify({
    product_id: 164,
    selected_product_id: 164,
    data: {
      price: 105000,
      items: [
        {
          field: "policy_language",
          value: "vn",
        },
        {
          field: "fullname",
          value: name,
        },
        {
          field: "certi_number",
          value: identification,
        },
        {
          field: "nationality",
          value: "V00001",
        },
        {
          field: "city",
          value: "004",
        },
        {
          field: "district",
          value: "00404",
        },
        {
          field: "address",
          value: "174 Thái Hà",
        },
        {
          field: "phone_number",
          value: randomPhoneNumber(),
        },
        {
          field: "email",
          value: userMail,
        },
        {
          field: "insured_people_1_fullname",
          value: name,
        },
        {
          field: "insured_people_1_certi_number",
          value: identification,
        },
        {
          field: "insured_people_1_nationality",
          value: "V00001",
        },
        {
          field: "insured_people_1_birthday",
          value: "01/01/2004",
        },
        {
          field: "insured_people_1_gender",
          value: "1",
        },
        {
          field: "insured_people_1_is_adult",
          value: true,
        },
        {
          value: "classic",
          field: "package_type",
        },
        {
          value: "asean",
          field: "trip_to",
        },
        {
          value: getDate(0, 0, 0),
          field: "date_start",
        },
        {
          value: getDate(0, 0, 1),
          field: "date_end",
        },
        {
          value: 2,
          field: "count_days",
        },
        {
          value: 1,
          field: "adults",
        },
        {
          value: 0,
          field: "childs",
        },
        {
          value: "individual",
          field: "policy_type",
        },
      ],
    },
  });

  let travelFormInfo = {
    booking_code: "",
    is_success: "",
  };
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch("https://api.tala.xyz/ds-insurance/v2/forms", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      travelFormInfo.booking_code = result.data.code;
      travelFormInfo.is_success = true;
    })
    .catch((error) => {
      console.log("error", error);
      travelFormInfo.is_success = false;
    });

  return travelFormInfo;
}

async function underwriting(bookingCode, userToken) {
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

  const raw = JSON.stringify({
    code: bookingCode,
  });

  let isSuccess;
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch(
    "https://api.tala.xyz/ds-insurance/v2/policies/underwriting",
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
