import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { TextInput, Text, useTheme } from 'react-native-paper';

/**
 * ValidatedInput component wrapping the Paper TextInput with inline validation alerts.
 * Displays asterisk characters, checks validator functions, animates validation banners,
 * and sets icons dynamically on validation statuses.
 * 
 * @param {Object} props - Component parameters.
 * @param {string} props.label - TextInput label text.
 * @param {string} props.value - TextInput text value.
 * @param {Function} props.onChangeText - Change callback.
 * @param {boolean} [props.error] - External error indicator.
 * @param {string} [props.errorMessage] - Validation instruction text.
 * @param {boolean} [props.required] - Label suffix indicator.
 * @param {Function} [props.validator] - Validation evaluator function (called onBlur).
 * @param {number} [props.maxLength] - Maximum character length.
 * @param {Function} [props.onBlur] - Blur callback.
 * @returns {React.JSX.Element} The ValidatedInput component.
 */
export default function ValidatedInput({
  label,
  value,
  onChangeText,
  error: externalError,
  errorMessage,
  required = false,
  validator,
  maxLength,
  onBlur,
  ...rest
}) {
  const theme = useTheme();
  const [internalError, setInternalError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasError = externalError || internalError;
  const displayErrorMsg = hasError && errorMessage;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: displayErrorMsg ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [displayErrorMsg]);

  // Handle validator on blur events
  const handleBlur = (e) => {
    if (validator) {
      const isValid = validator(value);
      setInternalError(!isValid);
    }
    if (onBlur) {
      onBlur(e);
    }
  };

  const formattedLabel = required ? `${label} *` : label;

  // Render appropriate icons based on states
  let rightIcon = null;
  if (hasError) {
    rightIcon = <TextInput.Icon icon="close-circle" color={theme.colors.error} />;
  } else if (value && value.trim().length > 0) {
    rightIcon = <TextInput.Icon icon="check-circle" color={theme.colors.success || '#16A34A'} />;
  }

  return (
    <View style={styles.container}>
      <TextInput
        label={formattedLabel}
        value={value}
        onChangeText={(text) => {
          // Clear error while typing if validator resolves
          if (validator && internalError) {
            if (validator(text)) {
              setInternalError(false);
            }
          }
          onChangeText(text);
        }}
        error={hasError}
        onBlur={handleBlur}
        right={rightIcon}
        maxLength={maxLength}
        style={[styles.input, { backgroundColor: theme.colors.inputBg || '#F1F5F9' }]}
        theme={{
          colors: {
            outline: hasError ? theme.colors.error : theme.colors.outline,
          }
        }}
        mode="outlined"
        {...rest}
      />
      
      {maxLength && (
        <Text variant="bodySmall" style={[styles.counter, { color: theme.colors.placeholder }]}>
          {value ? value.length : 0}/{maxLength}
        </Text>
      )}

      {displayErrorMsg && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
            {errorMessage}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  input: {
    fontSize: 14,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
  },
  counter: {
    textAlign: 'right',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
