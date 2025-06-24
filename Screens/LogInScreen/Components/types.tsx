//types

// Define el tipo de los parámetros de navegación para todo tu stack
export type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: undefined;
  ForgotPasswordScreen: undefined;
  SignUpScreen: undefined;
  CheckEmailScreen: undefined; // Add this if you want a screen for email verification
  EmpresaOnboardingScreen: { userId: string };// New screen that takes a user ID
  ResetPasswordConfirmScreen: { accessToken: string }; // New screen that takes an access token
};