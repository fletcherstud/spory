import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

const LoadingSpinner = ({
  size = 40,
  color = "black",
}: LoadingSpinnerProps) => {
  const spinValue = useSharedValue(0);

  useEffect(() => {
    spinValue.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${spinValue.value * 360}deg`,
      },
    ],
  }));

  const borderWidth = Math.max(4, Math.floor(size * 0.1));

  return (
    <View className="items-center justify-center">
      <Animated.View
        style={animatedStyle}
        className="items-center justify-center"
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: borderWidth,
            borderColor: color,
            borderTopColor: "transparent",
          }}
        />
      </Animated.View>
    </View>
  );
};

export default LoadingSpinner;
