async function getGifImageByKey(keySearch) {
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };

  let listGifImages = [];
  await fetch(
    "https://api.giphy.com/v1/gifs/search?api_key=" +
      API_KEY_GIF +
      "&q=" +
      keySearch +
      "&limit=25&offset=0&rating=g&lang=en",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      for (const element of result.data) {
        listGifImages.push(element.images.original.url);
      }
    })
    .catch((error) => {
      console.log("error", error);
    });

  return listGifImages[Math.floor(Math.random() * listGifImages.length)];
}

async function getGifImageByRandom() {
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };

  let giftImage = "";
  await fetch(
    "https://api.giphy.com/v1/gifs/random?api_key=" +
      API_KEY_GIF +
      "&tag=&rating=g",
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      giftImage = result.data.images.original.url;
    })
    .catch((error) => {
      console.log("error", error);
    });

  return giftImage;
}
