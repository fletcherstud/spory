import { getWikiData } from './WikiService';

const extractPremarkedKeywords = (text) => {
  const keywords = [];
  const cleanText = text.replace(/\*\*(.*?)\*\*/g, (match, keyword) => {
    keywords.push(keyword);
    return keyword; // Replace **keyword** with just keyword
  });
  
  return {
    keywords,
    cleanText
  };
};

export const extractKeywords = async (text) => {
  // Extract pre-marked keywords and clean text
  const { keywords, cleanText } = extractPremarkedKeywords(text);

  // Create a map of keyword positions using the clean text
  const keywordPositions = new Map();
  keywords.forEach((keyword) => {
    const position = cleanText.indexOf(keyword);
    keywordPositions.set(keyword, position >= 0 ? position : 1000);
  });

  const keywordData = await Promise.all(
    keywords.map(async (keyword) => {
      try {
        const wikiData = await getWikiData(keyword);
        return {
          keyword,
          ...wikiData,
          position: keywordPositions.get(keyword),
          found: true
        };
      } catch (error) {
        return {
          keyword,
          thumbnail: null,
          title: '',
          extract: '',
          url: null,
          position: keywordPositions.get(keyword),
          found: false
        };
      }
    })
  );

  return keywordData.filter(data => data.found);
};
