import { View, Text, Pressable } from "react-native";
import React from "react";

interface HighlightKeywordsTextProps {
  text: string;
  keywords: string[];
  centeredKeyword: string | null;
  onKeywordPress?: (keyword: string) => void;
}

const HighlightKeywordsText: React.FC<HighlightKeywordsTextProps> = ({
  text,
  keywords,
  centeredKeyword,
  onKeywordPress,
}) => {
  const findKeywordMatches = () => {
    let result = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      let matchFound = false;
      // Check for keyword matches at current position
      for (const keyword of keywords) {
        if (
          text.slice(currentPos).toLowerCase().startsWith(keyword.toLowerCase())
        ) {
          result.push({
            text: text.slice(currentPos, currentPos + keyword.length),
            isKeyword: true,
            keyword: keyword,
          });
          currentPos += keyword.length;
          matchFound = true;
          break;
        }
      }

      // If no keyword matches, add one character as non-keyword
      if (!matchFound) {
        result.push({
          text: text[currentPos],
          isKeyword: false,
          keyword: null,
        });
        currentPos += 1;
      }
    }
    return result;
  };

  const textParts = findKeywordMatches();

  return (
    <Text className="text-lg">
      {textParts.map((part, index) =>
        part.isKeyword ? (
          <Text
            key={index}
            onPress={() => part.keyword && onKeywordPress?.(part.keyword)}
            className="font-semibold"
            style={{
              color: "black",
              textDecorationLine:
                part.keyword === centeredKeyword ? "underline" : "none",
            }}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        )
      )}
    </Text>
  );
};

export default HighlightKeywordsText;
