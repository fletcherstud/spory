import nlp from "compromise";
import wikipedia from "compromise-wikipedia";

nlp.plugin(wikipedia); // Register the Wikipedia plugin

const fetchWikipediaPreview = async (keyword) => {
  let doc = nlp(keyword);
  let article = await doc.wikipedia(); // Fetches article summary from Wikipedia
  console.log("Article ", article);
  if (article) {
    return article.text || "No summary available.";
  } else {
    return "Error fetching article.";
  }
};

export default fetchWikipediaPreview;
