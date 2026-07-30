import { FONTS } from '@/lib/theme';
import {
  Text as RNText, TextInput as RNTextInput, TextInputProps, TextProps,
} from 'react-native';

// RN 0.81 turned Text/TextInput into function components, so the old
// `Text.defaultProps.style = ...` trick silently no-ops. These wrappers are
// the actual fix — use them instead of importing Text/TextInput from
// 'react-native' directly.

export function Text({ style, ...rest }: TextProps) {
  return <RNText style={[{ fontFamily: FONTS.sans }, style]} {...rest} />;
}

export function SerifText({ style, ...rest }: TextProps) {
  return <RNText style={[{ fontFamily: FONTS.serif }, style]} {...rest} />;
}

export function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput style={[{ fontFamily: FONTS.sans }, style]} {...rest} />;
}
