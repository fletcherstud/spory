import nlp from "compromise";
import plg from "compromise-dates";
import wiki from "compromise-wikipedia";

nlp.plugin(plg);
nlp.plugin(wiki);

const commonCities = {
  "New York": "New_York_City",
  "New York City": "New_York_City",
  NYC: "New_York_City",
  LA: "Los_Angeles",
  "Los Angeles": "Los_Angeles",
  "San Francisco": "San_Francisco",
  SF: "San_Francisco",
  DC: "Washington,_D.C.",
  "Washington DC": "Washington,_D.C.",
  "Washington D.C.": "Washington,_D.C.",
};

const cleanKeyword = (keyword) => {
  // Remove trailing punctuation and clean up spaces
  return keyword.replace(/[.,;:!?]+$/, "").trim();
};

const isPartialMatch = (keyword1, keyword2) => {
  const clean1 = cleanKeyword(keyword1).toLowerCase();
  const clean2 = cleanKeyword(keyword2).toLowerCase();
  return clean1.includes(clean2) || clean2.includes(clean1);
};

const preprocessKeyword = (keyword) => {
  const cleanedKeyword = cleanKeyword(keyword);

  if (commonCities[cleanedKeyword]) {
    return commonCities[cleanedKeyword];
  }

  const cityStateMatch = cleanedKeyword.match(
    /^(.*?),?\s*([A-Z]{2}|[A-Za-z]+)$/
  );
  if (cityStateMatch) {
    const [_, city, state] = cityStateMatch;
    return `${city},_${state}`;
  }

  return cleanedKeyword.replace(/\s+/g, "_");
};

const searchWikipedia = async (keyword) => {
  try {
    // First search for the most relevant article
    const searchResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        keyword
      )}&format=json&origin=*&srlimit=1`
    );
    const searchData = await searchResponse.json();
    if (searchData.query?.search?.length > 0) {
      const topResult = searchData.query.search[0];
      return topResult.title;
    }
    return null;
  } catch (error) {
    console.error("Error searching Wikipedia:", error);
    return null;
  }
};

const checkWikipediaAvailability = async (keyword) => {
  try {
    // First search for the most relevant article title
    const articleTitle = await searchWikipedia(keyword);
    if (!articleTitle) {
      return {
        found: false,
        keyword: cleanKeyword(keyword),
        thumbnail: null,
        title: cleanKeyword(keyword),
        extract: "",
        url: null,
      };
    }

    // Then get the article summary using the correct title
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        articleTitle
      )}`
    );
    const data = await response.json();

    if (
      data.type !== "https://mediawiki.org/wiki/HyperSwitch/errors/not_found"
    ) {
      return {
        found: true,
        keyword: cleanKeyword(keyword),
        thumbnail: data.thumbnail?.source || null,
        title: data.title || cleanKeyword(keyword),
        extract: data.extract || "",
        url: data.content_urls?.desktop?.page || null,
        originalKeyword: keyword, // Keep track of the original keyword for reference
      };
    }

    return {
      found: false,
      keyword: cleanKeyword(keyword),
      thumbnail: null,
      title: cleanKeyword(keyword),
      extract: "",
      url: null,
    };
  } catch (error) {
    console.error("Error checking Wikipedia availability:", error);
    return {
      found: false,
      keyword: cleanKeyword(keyword),
      thumbnail: null,
      title: cleanKeyword(keyword),
      extract: "",
      url: null,
    };
  }
};

export const extractKeywords = async (text) => {
  let doc = nlp(text);

  // Use compromise-wikipedia to find entities with Wikipedia articles
  let wikiEntities = doc.wikipedia().json();
  console.log("Wikipedia Entities:", wikiEntities);

  const validKeywordsData = [];
  const seenTitles = new Set();

  for (const keyword of wikiEntities) {
    // console.log("Processing keyword:", keyword.text);
    const wikiData = await checkWikipediaAvailability(keyword.text);
    // console.log("Wikipedia data for", keyword.text, ":", wikiData);
    if (wikiData.found && !seenTitles.has(wikiData.title)) {
      seenTitles.add(wikiData.title);
      validKeywordsData.push(wikiData);
    }
  }

  return validKeywordsData;
};
