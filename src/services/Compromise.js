import nlp from "compromise";
import plg from "compromise-dates";
nlp.plugin(plg);

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

const checkWikipediaAvailability = async (keyword) => {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        keyword
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
  let people = doc.people().out("array");
  let places = doc.places().out("array");

  console.log("Compromise Keyword", people, places);

  // Clean and deduplicate keywords, including partial matches
  let potentialKeywords = [
    ...new Set([...people, ...places].map(cleanKeyword)),
  ].filter(Boolean);

  console.log("Potential Keywords", potentialKeywords);
  // Remove partial matches
  potentialKeywords = potentialKeywords.filter((keyword1, index) => {
    return !potentialKeywords.some((keyword2, index2) => {
      return (
        index !== index2 &&
        keyword2.length > keyword1.length &&
        isPartialMatch(keyword2, keyword1)
      );
    });
  });

  const validKeywordsData = [];
  const seenTitles = new Set();

  for (const keyword of potentialKeywords) {
    const wikiData = await checkWikipediaAvailability(keyword);
    if (wikiData.found && !seenTitles.has(wikiData.title)) {
      seenTitles.add(wikiData.title);
      validKeywordsData.push(wikiData);
    }
  }

  return validKeywordsData;
};
