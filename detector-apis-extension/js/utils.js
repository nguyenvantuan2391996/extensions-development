function checkUndefined(item) {
  return typeof item === "undefined";
}

function generateUniqueKey(prefix) {
  const randomString = Math.random().toString(36).substring(2, 12);
  return `${prefix}_${randomString}`;
}

function isExistedInArray(arr, value) {
  for (const element of arr) {
    if (value === element) {
      return true;
    }
  }

  return false;
}
