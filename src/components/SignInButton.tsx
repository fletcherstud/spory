import React from "react";
import { Text, TouchableOpacity, Image, View } from "react-native";
import LoadingSpinner from "./LoadingSpinner";

interface SignInButtonProps {
  signInWithApple: () => Promise<void>;
  isSigningIn: boolean;
}

const SignInButton: React.FC<SignInButtonProps> = ({
  signInWithApple,
  isSigningIn,
}) => {
  return (
    <TouchableOpacity
      onPress={signInWithApple} // Call the sign-in function
      className="bg-black rounded-full px-4 py-2"
      disabled={isSigningIn} // Disable if signing in
    >
      <View className="flex-row items-center">
        {isSigningIn ? ( // Show loading spinner if signing in
          <LoadingSpinner size={20} color="white" />
        ) : (
          <>
            <Image
              source={require("../../assets/apple-logo.png")}
              className="w-4 h-4 mr-2"
            />
            <Text className="text-white text-sm font-semibold">Sign In</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default SignInButton;
