async function getListAddOn() {
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };

  let extras = EXTRAS_ADD_ON;
  await fetch(
    "https://63fe1d50571200b7b7c57218.mockapi.io/api/v1/add_ons/1",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      extras = result.extras;
    })
    .catch((error) => {
      console.log("error", error);
    });

  return extras;
}

async function bindingAddOn(userEmail, productID, addOnID) {
  const myHeaders = new Headers();
  myHeaders.append("X-User-Email", userEmail);
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    products: [
      {
        id: Number(productID),
        attributes: {
          add_on_ids: addOnID,
          add_on_available: 1,
        },
      },
    ],
  });

  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  let isSuccess;
  await fetch(
    "http://cronus.dev.tiki.services/v1/product/attributes",
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
