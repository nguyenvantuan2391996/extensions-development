function checkUndefined(item) {
  return typeof item === "undefined";
}

function generateUniqueKey(prefix) {
  const randomString = Math.random().toString(36).substring(2, 12);
  return `${prefix}_${randomString}`;
}
