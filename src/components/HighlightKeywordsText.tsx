import { View, Text, findNodeHandle } from "react-native";
import React, { useState, useRef } from "react";
import WikiTooltip from "./WikiTooltip";

interface HighlightKeywordsTextProps {
  text: string;
  keywords: string[];
}

const HighlightKeywordsText: React.FC<HighlightKeywordsTextProps> = ({
  text,
  keywords,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const textRefs = useRef<{ [key: string]: Text | null }>({});

  const measureKeyword = (keyword: string) => {
    const textRef = textRefs.current[keyword];
    if (!textRef) return;

    const node = findNodeHandle(textRef);
    if (!node) return;

    textRef.measure((x, y, width, height, pageX, pageY) => {
      setTooltipPosition({
        x: pageX,
        y: pageY,
        width,
        height,
      });
      setActiveTooltip(keyword);
    });
  };

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
        });
        currentPos += 1;
      }
    }
    return result;
  };

  const textParts = findKeywordMatches();

  return (
    <View className="relative">
      <Text className="text-lg">
        {textParts.map((part, index) =>
          part.isKeyword ? (
            <Text
              key={index}
              ref={(ref) => (textRefs.current[part.text] = ref)}
              onPress={() => measureKeyword(part.text)}
              className={`font-semibold ${
                activeTooltip === part.text ? "underline" : ""
              }`}
              style={{ color: "#2563eb" }}
            >
              {part.text}
            </Text>
          ) : (
            <Text key={index}>{part.text}</Text>
          )
        )}
      </Text>
      {activeTooltip && tooltipPosition && (
        <WikiTooltip
          keyword={activeTooltip}
          isVisible={true}
          onClose={() => {
            setActiveTooltip(null);
            setTooltipPosition(null);
          }}
          position={tooltipPosition}
        />
      )}
    </View>
  );
};

export default HighlightKeywordsText;
