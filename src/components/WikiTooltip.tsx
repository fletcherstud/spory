import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Linking, Dimensions } from "react-native";

interface WikiTooltipProps {
  keyword: string;
  isVisible: boolean;
  onClose: () => void;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const WikiTooltip: React.FC<WikiTooltipProps> = ({
  keyword,
  isVisible,
  onClose,
  position,
}) => {
  const [summary, setSummary] = useState<string>("Loading...");
  const [wikiUrl, setWikiUrl] = useState<string>("");
  const [tooltipLayout, setTooltipLayout] = useState<{
    position: "top" | "bottom" | "left" | "right";
    style: any;
  }>({ position: "top", style: {} });

  const TOOLTIP_WIDTH = 300;
  const TOOLTIP_HEIGHT = 150;
  const ARROW_SIZE = 10;
  const SCREEN_PADDING = 20;

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      fetchWikiSummary();
    }
  }, [isVisible, position]);

  const calculatePosition = () => {
    const screen = Dimensions.get("window");
    const { x, y } = position;

    let tooltipStyle: any = {
      position: "absolute",
      width: TOOLTIP_WIDTH,
    };

    // Try to position above the word first
    if (y - TOOLTIP_HEIGHT - ARROW_SIZE > SCREEN_PADDING) {
      tooltipStyle = {
        ...tooltipStyle,
        position: "absolute",
        top: y - TOOLTIP_HEIGHT - ARROW_SIZE,
        left: Math.max(
          SCREEN_PADDING,
          Math.min(
            x - TOOLTIP_WIDTH / 2,
            screen.width - TOOLTIP_WIDTH - SCREEN_PADDING
          )
        ),
      };
      setTooltipLayout({ position: "top", style: tooltipStyle });
      return;
    }

    // If not enough space above, try below
    if (y + ARROW_SIZE + TOOLTIP_HEIGHT < screen.height - SCREEN_PADDING) {
      tooltipStyle = {
        ...tooltipStyle,
        position: "absolute",
        top: y + ARROW_SIZE,
        left: Math.max(
          SCREEN_PADDING,
          Math.min(
            x - TOOLTIP_WIDTH / 2,
            screen.width - TOOLTIP_WIDTH - SCREEN_PADDING
          )
        ),
      };
      setTooltipLayout({ position: "bottom", style: tooltipStyle });
      return;
    }

    // If neither above nor below works, position to the right
    tooltipStyle = {
      ...tooltipStyle,
      position: "absolute",
      top: y - TOOLTIP_HEIGHT / 2,
      left: x + ARROW_SIZE,
    };
    setTooltipLayout({ position: "right", style: tooltipStyle });
  };

  const fetchWikiSummary = async () => {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          keyword
        )}`
      );
      const data = await response.json();
      setSummary(
        data.extract?.substring(0, 150) + "..." || "No summary available"
      );
      setWikiUrl(data.content_urls?.desktop?.page || "");
    } catch (error) {
      setSummary("Failed to load summary");
    }
  };

  if (!isVisible) return null;

  const getArrowStyle = () => {
    const baseStyle = {
      position: "absolute",
      width: 0,
      height: 0,
      borderStyle: "solid",
      borderWidth: ARROW_SIZE,
      borderColor: "transparent",
    };

    switch (tooltipLayout.position) {
      case "top":
        return {
          ...baseStyle,
          bottom: -ARROW_SIZE * 2,
          left: "50%",
          marginLeft: -ARROW_SIZE,
          borderTopColor: "white",
          borderBottomWidth: 0,
        };
      case "bottom":
        return {
          ...baseStyle,
          top: -ARROW_SIZE * 2,
          left: "50%",
          marginLeft: -ARROW_SIZE,
          borderBottomColor: "white",
          borderTopWidth: 0,
        };
      case "right":
        return {
          ...baseStyle,
          left: -ARROW_SIZE * 2,
          top: "50%",
          marginTop: -ARROW_SIZE,
          borderRightColor: "white",
          borderLeftWidth: 0,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <View style={tooltipLayout.style} className="absolute z-50">
      <View className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <View style={getArrowStyle()} />
        <Text className="text-sm">{summary}</Text>
        <Pressable
          onPress={() => Linking.openURL(wikiUrl)}
          className="mt-2 bg-blue-500 p-2 rounded"
        >
          <Text className="text-white text-center">Get More Info</Text>
        </Pressable>
        <Pressable onPress={onClose} className="absolute top-1 right-1 p-1">
          <Text className="text-gray-500">✕</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default WikiTooltip;
