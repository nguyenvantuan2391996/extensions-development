async function getCachedGifUrl(cacheKey) {
  const result = await chrome.storage.local.get([STORAGE_KEY_GIF_CACHE]);
  const cache = result[STORAGE_KEY_GIF_CACHE] || {};
  const entry = cache[cacheKey];
  if (entry && Date.now() - entry.ts < GIF_CACHE_TTL_MS) {
    return entry.url;
  }
  return null;
}

async function setCachedGifUrl(cacheKey, url) {
  const result = await chrome.storage.local.get([STORAGE_KEY_GIF_CACHE]);
  const cache = result[STORAGE_KEY_GIF_CACHE] || {};
  cache[cacheKey] = { url, ts: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY_GIF_CACHE]: cache });
}

async function getGifImageByKey(keySearch) {
  const cacheKey = "search:" + keySearch;
  const cached = await getCachedGifUrl(cacheKey);
  if (cached) {
    return cached;
  }

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

  const gifImageUrl =
    listGifImages[Math.floor(Math.random() * listGifImages.length)];

  if (gifImageUrl) {
    await setCachedGifUrl(cacheKey, gifImageUrl);
  }

  return gifImageUrl;
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
