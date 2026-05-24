import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ActivityIndicator, useTheme } from 'react-native-paper';

/**
 * SubmitButton component.
 * Custom button that handles form validation lists, checks loading status,
 * displays spinner animations, and sets button opacities dynamically.
 * 
 * @param {Object} props - Component properties.
 * @param {Function} props.onPress - Press handler.
 * @param {string} props.label - Button text display.
 * @param {boolean} [props.isLoading] - Loading spinner state.
 * @param {boolean} [props.isDisabled] - Force disable button.
 * @param {Array<any>} [props.requiredFields] - List of field values that must be non-empty.
 * @param {Object} [props.style] - Custom container style.
 * @param {string} [props.mode] - Button display mode ("contained" | "outlined").
 * @returns {React.JSX.Element} The SubmitButton component.
 */
export default function SubmitButton({
  onPress,
  label,
  isLoading = false,
  isDisabled = false,
  requiredFields = [],
  style,
  mode = 'contained',
  ...rest
}) {
  const theme = useTheme();

  // Validate that all required fields are present and not empty
  const hasEmptyRequiredFields = requiredFields.some((field) => {
    if (field === null || field === undefined) return true;
    if (typeof field === 'string') return field.trim() === '';
    if (Array.isArray(field)) return field.length === 0;
    return false;
  });

  const isButtonDisabled = isDisabled || isLoading || hasEmptyRequiredFields;

  return (
    <Button
      mode={mode}
      onPress={onPress}
      disabled={isButtonDisabled}
      style={[
        styles.button,
        style,
        {
          opacity: isButtonDisabled ? 0.55 : 1,
          backgroundColor: mode === 'contained' 
            ? (isButtonDisabled ? theme.colors.surfaceVariant : theme.colors.primary)
            : 'transparent',
          borderColor: mode === 'outlined' 
            ? (isButtonDisabled ? theme.colors.outline : theme.colors.primary)
            : 'transparent',
        }
      ]}
      contentStyle={styles.content}
      textColor={mode === 'contained' 
        ? (isButtonDisabled ? theme.colors.placeholder : theme.colors.onPrimary)
        : (isButtonDisabled ? theme.colors.placeholder : theme.colors.primary)
      }
      accessibilityLabel={label}
      accessibilityState={{ disabled: isButtonDisabled, busy: isLoading }}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator 
          animating={true} 
          color={mode === 'contained' ? theme.colors.onPrimary : theme.colors.primary} 
          size="small" 
          style={styles.spinner}
        />
      ) : (
        label
      )}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    marginVertical: 10,
    justifyContent: 'center',
    height: 48,
    elevation: 2,
  },
  content: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    alignSelf: 'center',
  },
});
