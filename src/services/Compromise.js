import nlp from "compromise";
import plg from "compromise-dates";
import wiki from "compromise-wikipedia";
import { getWikiData } from './WikiService';

nlp.plugin(plg);
nlp.plugin(wiki);

const isCapitalized = (word) => {
  return word.charAt(0) === word.toUpperCase().charAt(0);
};

const isNumber = (word) => {
  return /^\d+$/.test(word.replace(/,/g, ''));
};

const isMeasurement = (word) => {
  return /^\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:feet|ft|meters|m|km|miles|lbs|kg)\.?)$/i.test(word);
};

const findMultiWordKeywords = (text) => {
  const doc = nlp(text);
  let keywords = [];

  // Get single word proper nouns, excluding numbers and measurements
  doc.match('#ProperNoun')
    .not('#Value')  // Exclude numbers
    .not('#Unit')   // Exclude units of measurement
    .forEach(match => {
      const word = match.text();
      if (!isNumber(word) && !isMeasurement(word)) {
        keywords.push(word);
      }
    });

  // Find sequences of capitalized words
  const words = text.split(/\s+/);
  let currentPhrase = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,!?]$/, ''); // Remove punctuation
    
    if (isCapitalized(word) && !isNumber(word) && !isMeasurement(word)) {
      currentPhrase.push(word);
    } else {
      if (currentPhrase.length > 1) {
        keywords.push(currentPhrase.join(' '));
      }
      currentPhrase = [];
    }
  }
  if (currentPhrase.length > 1) {
    keywords.push(currentPhrase.join(' '));
  }

  // Remove duplicates and single words that are part of multi-word phrases
  keywords = [...new Set(keywords)];
  keywords = keywords.filter((keyword, index) => {
    const isPartOfLongerPhrase = keywords.some((k, i) => 
      i !== index && k.includes(keyword) && k.split(' ').length > keyword.split(' ').length
    );
    return !isPartOfLongerPhrase;
  });

  return keywords;
};

export const extractKeywords = async (text) => {
  const keywords = findMultiWordKeywords(text);
  console.log('Extracted keywords:', keywords);

  // Create a map of keyword positions
  const keywordPositions = new Map();
  keywords.forEach((keyword, index) => {
    // Find the first occurrence of the keyword in the text
    const position = text.toLowerCase().indexOf(keyword.toLowerCase());
    keywordPositions.set(keyword, position >= 0 ? position : index * 1000);
  });

  const keywordData = await Promise.all(
    keywords.map(async (keyword) => {
      try {
        const wikiData = await getWikiData(keyword);
        return {
          keyword,
          ...wikiData,
          position: keywordPositions.get(keyword), // Add position
          found: true
        };
      } catch (error) {
        console.log(`No Wikipedia data found for ${keyword}`);
        return {
          keyword,
          thumbnail: null,
          title: '',
          extract: '',
          url: null,
          position: keywordPositions.get(keyword), // Add position
          found: false
        };
      }
    })
  );

  return keywordData.filter(data => data.found);
};
