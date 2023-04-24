const axios = require("axios");
const csv = require("csv-parse/sync");
const parseCurrency = require("parsecurrency");
const convert = require("xml-js");
const fs = require("fs");

const run = async () => {
  const content = await await fs.promises.readFile("hhsale.csv");

  const records = csv.parse(content, {
    columns: true,
  });

  const sortedRecords = [];
  records.map((r) => {
    if (!sortedRecords[r.who]) {
      sortedRecords[r.who] = [];
    }
    sortedRecords[r.who].push(r.game);
  });

  const response = await axios.get(
    "https://boardgamegeek.com/xmlapi/geeklist/314602?comments=1"
  );

  const geeklistJson = convert.xml2json(response.data, {
    compact: true,
    spaces: 4,
  });

  let outputArr = [];
  let noBids = [];

  for (const item of JSON.parse(geeklistJson).geeklist.item) {
    const thisGame = {
      game: item._attributes.objectname,
    };

    let foundIt = false;
    for (const name of Object.keys(sortedRecords)) {
      foundIt = false;
      if (sortedRecords[name].includes(item._attributes.objectname)) {
        thisGame.owner = name;
        foundIt = true;
        break;
      }
    }

    const gameComments = [];
    if (item.comment && !Array.isArray(item.comment)) {
      const text = item.comment._text.replace(/\n/g, " ");
      if (parseCurrency(text) === null) {
        gameComments.push(
          text + " (" + item.comment._attributes.username + ")"
        );
      } else {
        gameComments.push(
          parseCurrency(text).raw +
            " (" +
            item.comment._attributes.username +
            ")"
        );
      }
    }

    // console.log(item.comment);

    if (item.comment && Array.isArray(item.comment)) {
      for (const comment of item.comment) {
        const text = comment._text.replace(/\n/g, " ");
        if (parseCurrency(text) === null) {
          gameComments.push(text + " (" + comment._attributes.username + ")");
        } else {
          gameComments.push(
            parseCurrency(text).raw + " (" + comment._attributes.username + ")"
          );
        }
      }
    }

    thisGame.bids = gameComments;

    if (thisGame.bids && thisGame.bids.length > 0) {
      outputArr.push(thisGame);
    } else {
      noBids.push(thisGame);
    }
  }

  const owner = {};
  outputArr.map((o) => {
    if (!owner[o.owner]) {
      owner[o.owner] = [];
    }
    owner[o.owner].push(o.game + " bids: " + o.bids.toString());
  });
  console.log(owner);

  const noBidsStr = noBids.map((o) => {
    return o.owner + ": " + o.game;
  });

  console.log("No bids yet:");
  console.log(noBidsStr.sort());
};

run();
