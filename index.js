import express from 'express';
import axios from 'axios';
import { load } from 'cheerio';

const app = express();
const base = "https://hdrezka.me/";

// Utility function to decode the response
const getData = (x) => {
  const v = {
    file3_separator: "//_//",
    bk0: "$$#!!@#!@##",
    bk1: "^^^!@##!!##",
    bk2: "####^!!##!@@",
    bk3: "@@@@@!##!^^^",
    bk4: "$$!!@$$@^!@#$$@",
  };
  let a = x.substr(2);
  for (let i = 4; i >= 0; i--) {
    if (v["bk" + i]) {
      a = a.replace(
        v.file3_separator +
          btoa(
            encodeURIComponent(v["bk" + i]).replace(
              /%([0-9A-F]{2})/g,
              (_, p1) => String.fromCharCode("0x" + p1)
            )
          ),
        ""
      );
    }
  }
  try {
    a = decodeURIComponent(
      atob(a)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    a = "";
  }
  return a.split(",").reduce((m, ele) => {
    const [key, value] = ele.split("]");
    m[key.replace("[", "")] = value;
    return m;
  }, {});
};

// Function to get movie or TV show stream
const main = async (id, type = "movie", season, episode) => {
  const params = type !== "movie"
    ? { id, translator_id: 238, season, episode, action: "get_stream" }
    : { id, translator_id: 238, action: "get_movie" };

  const resp = await axios.post(
    "https://hdrezka.me/ajax/get_cdn_series/?t=" + new Date().getTime(),
    new URLSearchParams(params).toString()
  );

  return {
    src: getData(resp.data.url),
    subtitle: resp.data.subtitle,
  };
};

// Function to search for a movie or TV show ID
const getId = async (q, year, type) => {
  const resp = await axios.get(`${base}search/?do=search&subaction=search&q=${q}`);
  const $ = load(resp.data);

  const id = $(".b-content__inline_item")
    .map((_, e) =>
      $(e)
        .find(".b-content__inline_item-link > div")
        .text()
        .split(",")
        .shift()
        .includes(year) && $(e).find(".entity").text() === type
        ? $(e).attr("data-id")
        : undefined
    )
    .get();

  return id;
};



// Define routes

// GET /id/:query/:year/:type
// app.get('/id/:query/:year/:type', async (req, res) => {
//   const { query, year, type } = req.params;
//   try {
//     const id = await getId(query, year, type);
//     res.json({ id });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

app.get('/id/:query/:year/:type', async (req, res) => {
  const query = decodeURIComponent(req.params.query);
  const year = req.params.year;
  const type = decodeURIComponent(req.params.type);

  try {
    const id = await getId(query, year, type);
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET /stream/:id/:type/:season?/:episode?
app.get('/stream/:id/:type/:season?/:episode?', async (req, res) => {
  const { id, type, season, episode } = req.params;
  try {
    const data = await main(id, type, season, episode);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export the app for Vercel
export default app;
