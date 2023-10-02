function checkUndefined(item) {
  return typeof item === "undefined";
}

function randomLicensePlate() {
  return (
    ARRAY_ID_BIKE_CAR[Math.floor(Math.random() * ARRAY_ID_BIKE_CAR.length)] +
    ARRAY_ID_CHARACTER_BIKE_CAR[
      Math.floor(Math.random() * ARRAY_ID_CHARACTER_BIKE_CAR.length)
    ] +
    "-" +
    (Math.floor(Math.random() * 90000) + 10000)
  );
}

function randomName() {
  return (
    ARRAY_FIST_NAME[Math.floor(Math.random() * ARRAY_FIST_NAME.length)] +
    " " +
    ARRAY_LAST_NAME[Math.floor(Math.random() * ARRAY_LAST_NAME.length)]
  );
}

function randomPhoneNumber() {
  const prefixes = ["03", "05", "07", "08", "09"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(7, "0");
  return `${prefix}${suffix}`;
}

function getStartDateAndEndDate() {
  let res = {
    start_date: "",
    end_date: "",
  };
  const now = new Date();
  const day = (now.getDate() + 1).toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const year = now.getFullYear().toString();
  const nextYear = (now.getFullYear() + 1).toString();

  res.start_date = `${day}/${month}/${year}`;
  res.end_date = `${day}/${month}/${nextYear}`;

  return res;
}

function getDate(addYears, addMoths, addDays) {
  const now = new Date();
  const day = (now.getDate() + addDays).toString().padStart(2, "0");
  const month = (now.getMonth() + addMoths + 1).toString().padStart(2, "0");
  const year = (now.getFullYear() + addYears).toString();

  return `${day}/${month}/${year}`;
}

function randomIdentification() {
  return Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(9, "0");
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
